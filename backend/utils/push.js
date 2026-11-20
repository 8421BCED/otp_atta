// The doorbell: browser push notifications that reach a student even when the app is closed.
// Uses the standard Web Push protocol with VAPID keys (works in Chrome, Edge, Firefox and Android,
// and in iPhones when the app is added to the home screen).
const crypto = require('crypto');
const https = require('https');
const webpush = require('web-push');
const pool = require('../db');
const { vapidPublicKey, vapidPrivateKey, vapidSubject } = require('../config');
const { groupOf } = require('./departments');
const { istNow, addMinutes } = require('./time');
const { getOffDay, getSchedule } = require('./rules');

const configured = !!(vapidPublicKey && vapidPrivateKey);
if (configured) {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
} else {
    console.warn('Push notifications are off: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not set.');
}

const hash = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

const ensureTables = async () => {
    await pool.query(`CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        endpoint TEXT NOT NULL,
        endpoint_hash CHAR(64) NOT NULL,
        p256dh VARCHAR(255) NOT NULL,
        auth VARCHAR(255) NOT NULL,
        user_agent VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_ok_at TIMESTAMP NULL,
        UNIQUE KEY uq_endpoint (endpoint_hash),
        KEY idx_user (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
    // One row per message per device. The service worker reports "shown" (a receipt); a message that
    // the push service accepted but the phone never showed is sent once more (see retryUnconfirmed).
    await pool.query(`CREATE TABLE IF NOT EXISTS push_deliveries (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        msg_id CHAR(32) NOT NULL,
        endpoint_hash CHAR(64) NOT NULL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        shown_at TIMESTAMP NULL,
        retried TINYINT NOT NULL DEFAULT 0,
        payload TEXT NOT NULL,
        UNIQUE KEY uq_msg_endpoint (msg_id, endpoint_hash),
        KEY idx_pending (shown_at, retried, sent_at),
        KEY idx_endpoint (endpoint_hash)
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS notification_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        kind VARCHAR(120) NOT NULL,
        ref_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_kind_date (kind, ref_date)
    )`);
};

const saveSubscription = async (userId, subscription, userAgent) => {
    const { endpoint, keys } = subscription || {};
    if (!endpoint || !keys || !keys.p256dh || !keys.auth || !/^https:\/\//.test(endpoint)) {
        const err = new Error('Invalid subscription');
        err.status = 400;
        throw err;
    }
    await pool.query(
        `INSERT INTO push_subscriptions (user_id, endpoint, endpoint_hash, p256dh, auth, user_agent)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), p256dh = VALUES(p256dh), auth = VALUES(auth), user_agent = VALUES(user_agent)`,
        [userId, endpoint, hash(endpoint), keys.p256dh, keys.auth, String(userAgent || '').slice(0, 250)]
    );
};

// A browser can rotate a device's subscription while the app is closed. The service worker then
// calls this with the OLD endpoint (a secret URL only that browser knows) and the new subscription.
// That is proof enough to move the device over without a sign-in.
const replaceSubscription = async (oldEndpoint, subscription, userAgent) => {
    if (typeof oldEndpoint !== 'string' || !oldEndpoint) {
        const err = new Error('Old endpoint required');
        err.status = 400;
        throw err;
    }
    const [rows] = await pool.query('SELECT user_id FROM push_subscriptions WHERE endpoint_hash = ?', [hash(oldEndpoint)]);
    if (rows.length === 0) {
        const err = new Error('Unknown subscription');
        err.status = 404;
        throw err;
    }
    await saveSubscription(rows[0].user_id, subscription, userAgent);
    if (hash(oldEndpoint) !== hash(subscription.endpoint)) {
        await pool.query('DELETE FROM push_subscriptions WHERE endpoint_hash = ?', [hash(oldEndpoint)]);
    }
};

const removeSubscription = (userId, endpoint) =>
    pool.query('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint_hash = ?', [userId, hash(endpoint)]);

// Send one payload to every device of the given users. Dead subscriptions are cleaned up.
// One pool of kept-open connections to Google / Mozilla / Microsoft / Apple. Without it every message
// opens its own TLS connection and a class-wide alert spends most of its time on handshakes.
const agent = new https.Agent({ keepAlive: true, keepAliveMsecs: 30000, maxSockets: 80, maxFreeSockets: 20 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// One send with the retries push services ask for: 429 and 5xx or a dropped connection are tried again
// (twice, honouring Retry-After up to 5 s). 400/404/410/413 are final and the caller decides.
const pushOnce = async (sub, body, options) => {
    for (let attempt = 0; ; attempt++) {
        try {
            return await webpush.sendNotification(sub, body, { ...options, timeout: 10000, agent });
        } catch (e) {
            const code = e && e.statusCode;
            const temporary = !code || code === 429 || (code >= 500 && code <= 504);
            if (!temporary || attempt >= 2) throw e;
            const ra = Number(e.headers && e.headers['retry-after']);
            await wait(Math.min(5000, Number.isFinite(ra) && ra > 0 ? ra * 1000 : 400 * 2 ** attempt));
        }
    }
};

const sendToUsers = async (userIds, payload) => {
    const result = { sent: 0, failed: 0, removed: 0 };
    if (!configured || !userIds || userIds.length === 0) return result;

    const ids = [...new Set(userIds)];
    // The message id lets the phone's service worker confirm it showed this exact message.
    const msgId = crypto.randomBytes(16).toString('hex');
    const full = { ...payload, id: msgId };
    const body = JSON.stringify(full);
    // urgency "high" is what lets Google wake a sleeping Android phone straight away. TTL is how long Google
    // keeps the message if the phone is off or asleep, so a doorbell is not lost during a nap.
    // topic: a newer message with the same tag replaces one still waiting, so a phone coming back online
    // is not hit with a pile of old doorbells.
    const options = {
        TTL: payload.ttl || 600,
        urgency: 'high',
        topic: crypto.createHash('sha1').update(String(payload.tag || 'attendotp')).digest('base64url').slice(0, 32)
    };

    // Process in slices so a whole college does not open thousands of connections at once.
    for (let i = 0; i < ids.length; i += 500) {
        const [subs] = await pool.query(
            'SELECT id, endpoint, endpoint_hash, p256dh, auth FROM push_subscriptions WHERE user_id IN (?)', [ids.slice(i, i + 500)]
        );
        const dead = [];
        const delivered = [];
        for (let j = 0; j < subs.length; j += 40) {
            await Promise.all(subs.slice(j, j + 40).map(async (s) => {
                try {
                    await pushOnce({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, options);
                    result.sent++;
                    delivered.push([msgId, s.endpoint_hash, body]);
                } catch (e) {
                    result.failed++;
                    if (e.statusCode === 404 || e.statusCode === 410) dead.push(s.id);
                }
            }));
        }
        if (delivered.length) {
            await pool.query('INSERT IGNORE INTO push_deliveries (msg_id, endpoint_hash, payload) VALUES ?', [delivered]).catch(() => {});
        }
        if (dead.length) {
            await pool.query('DELETE FROM push_subscriptions WHERE id IN (?)', [dead]);
            result.removed += dead.length;
        }
    }
    return result;
};

// The service worker says "I showed message X on this device".
const recordReceipt = async (msgId, endpoint) => {
    if (typeof msgId !== 'string' || typeof endpoint !== 'string') return false;
    const [r] = await pool.query(
        'UPDATE push_deliveries SET shown_at = COALESCE(shown_at, NOW()) WHERE msg_id = ? AND endpoint_hash = ?',
        [msgId.slice(0, 32), hash(endpoint)]
    );
    return r.affectedRows > 0;
};

// Accepted by the push service but never shown after 90 seconds: send once more, only to devices that
// have shown a message before (so an old service worker without receipts is never sent doubles).
const retryUnconfirmed = async () => {
    if (!configured) return;
    const [rows] = await pool.query(
        `SELECT d.id, d.payload, ps.endpoint, ps.p256dh, ps.auth
         FROM push_deliveries d
         JOIN push_subscriptions ps ON ps.endpoint_hash = d.endpoint_hash
         WHERE d.shown_at IS NULL AND d.retried = 0
           AND d.sent_at < NOW() - INTERVAL 90 SECOND AND d.sent_at > NOW() - INTERVAL 15 MINUTE
           AND EXISTS (SELECT 1 FROM push_deliveries r WHERE r.endpoint_hash = d.endpoint_hash AND r.shown_at IS NOT NULL)
         LIMIT 500`
    );
    for (const row of rows) {
        const [claimed] = await pool.query('UPDATE push_deliveries SET retried = 1 WHERE id = ? AND retried = 0', [row.id]);
        if (claimed.affectedRows !== 1) continue; // another worker took it
        let data = {};
        try { data = JSON.parse(row.payload); } catch (e) { /* send as is */ }
        await pushOnce({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
            JSON.stringify({ ...data, retry: true }), { TTL: 600, urgency: 'high' }).catch(() => {});
    }
};

// Receipts are only useful for a day; keep the table small.
const pruneDeliveries = () => pool.query('DELETE FROM push_deliveries WHERE sent_at < NOW() - INTERVAL 2 DAY').catch(() => {});

// Several workers run at once. Whoever inserts the log row first sends; the others skip.
const claim = async (kind, date) => {
    const [r] = await pool.query('INSERT IGNORE INTO notification_log (kind, ref_date) VALUES (?, ?)', [kind.slice(0, 120), date]);
    return r.affectedRows === 1;
};

// Students (with a subscribed device) in these departments who have not yet marked a period today.
const unmarkedSubscribedStudents = async (departments, periodId, date) => {
    const [rows] = await pool.query(
        `SELECT DISTINCT u.id, u.department
         FROM users u
         JOIN push_subscriptions ps ON ps.user_id = u.id
         WHERE u.role = 'student' AND u.is_active = 1 ${departments ? 'AND u.department IN (?)' : ''}
           AND NOT EXISTS (
               SELECT 1 FROM attendance_records ar
               WHERE ar.student_id = u.id AND ar.date = ? AND ar.period_id = ? AND ar.status IN ('present', 'od'))`,
        departments ? [departments, date, periodId] : [date, periodId]
    );
    return rows;
};

// Faculty opened a session: ring the doorbell for the department's students who have not marked yet.
const notifyAttendanceOpened = async ({ department, periodId, periodName, roomNumber, date }) => {
    if (!configured) return;
    if (!(await claim(`opened:${department}:${periodId}`, date))) return;
    const rows = await unmarkedSubscribedStudents(groupOf(department), periodId, date);
    await sendToUsers(rows.map((r) => r.id), {
        title: 'Attendance is open',
        body: `${periodName} is taking attendance in room ${roomNumber}. Enter the code now.`,
        url: '/students',
        tag: 'attendance-open'
    });
};

// Reminders before the two cutoffs: 09:05 for the morning and 13:35 after lunch.
const REMINDERS = [
    { key: 'morning-start', at: '09:00:30', period: 'morning', title: 'Good morning', body: 'Attendance is open. Enter the code within five minutes.' },
    { key: 'morning-last', at: '09:03:30', period: 'morning', title: 'Last minute for attendance', body: 'The morning window closes at 9:05. Enter the code now.' },
    { key: 'afternoon-start', at: '13:30:30', period: 'afternoon', title: 'Back from lunch', body: 'Attendance is open again. Enter the code within five minutes.' },
    { key: 'afternoon-last', at: '13:33:30', period: 'afternoon', title: 'Last minute for attendance', body: 'The afternoon window closes at 1:35. Enter the code now.' }
];

const runReminders = async () => {
    const { date, time } = istNow();
    const schedule = await getSchedule();
    for (const r of REMINDERS) {
        if (time < r.at || time > addMinutes(r.at, 2)) continue;
        if (!(await claim(`remind:${r.key}`, date))) continue;

        const periodId = r.period === 'morning' ? schedule.morningId : schedule.afternoonId;
        const rows = await unmarkedSubscribedStudents(null, periodId, date);

        // Skip departments that have no classes today (holiday or weekly off).
        const offByDept = new Map();
        const targets = [];
        for (const row of rows) {
            if (!offByDept.has(row.department)) offByDept.set(row.department, (await getOffDay(row.department, date, time)).off);
            if (!offByDept.get(row.department)) targets.push(row.id);
        }
        const out = await sendToUsers(targets, { title: r.title, body: r.body, url: '/students', tag: 'attendance-reminder' });
        console.log(`Doorbell reminder "${r.key}": ${out.sent} sent, ${out.failed} failed, ${out.removed} removed`);
    }
};

let schedulerStarted = false;
const startScheduler = () => {
    if (schedulerStarted || !configured) return;
    schedulerStarted = true;
    setInterval(() => runReminders().catch((e) => console.error('Reminder tick failed:', e.message)), 30000).unref();
    setInterval(() => retryUnconfirmed().catch((e) => console.error('Retry tick failed:', e.message)), 30000).unref();
    setInterval(pruneDeliveries, 6 * 3600 * 1000).unref();
};

module.exports = {
    configured, publicKey: vapidPublicKey, ensureTables, saveSubscription, replaceSubscription, removeSubscription,
    sendToUsers, notifyAttendanceOpened, runReminders, startScheduler, recordReceipt, retryUnconfirmed
};
