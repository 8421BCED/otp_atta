const express = require('express');
const pool = require('../db');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { verifyItOps } = require('../middleware/itops');
const { groupOf } = require('../utils/departments');
const push = require('../utils/push');

const router = express.Router();

// The key the browser needs to subscribe. Public by design.
router.get('/public-key', (req, res) => {
    res.json({ enabled: push.configured, publicKey: push.configured ? push.publicKey : null });
});

// Does this user have at least one subscribed device?
router.get('/status', authenticate, async (req, res) => {
    try {
        const [[row]] = await pool.query('SELECT COUNT(*) AS n FROM push_subscriptions WHERE user_id = ?', [req.user.id]);
        res.json({ enabled: push.configured, devices: row.n });
    } catch (err) {
        res.status(500).json({ error: 'Could not read notification status' });
    }
});

// Turn the doorbell on for this device. Must follow a tap, because the browser asks for permission.
router.post('/subscribe', authenticate, async (req, res) => {
    try {
        if (!push.configured) return res.status(503).json({ error: 'Notifications are not set up on this server' });
        await push.saveSubscription(req.user.id, req.body && req.body.subscription, req.headers['user-agent']);
        res.json({ success: true });
    } catch (err) {
        if (err.status === 400) return res.status(400).json({ error: err.message });
        console.error('Subscribe error:', err);
        res.status(500).json({ error: 'Could not save the subscription' });
    }
});

// Called by the service worker itself when the browser rotates this device's subscription.
router.post('/resubscribe', async (req, res) => {
    try {
        if (!push.configured) return res.status(503).json({ error: 'Notifications are not set up on this server' });
        const { oldEndpoint, subscription } = req.body || {};
        await push.replaceSubscription(oldEndpoint, subscription, req.headers['user-agent']);
        res.json({ success: true });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ error: err.message });
        console.error('Resubscribe error:', err);
        res.status(500).json({ error: 'Could not update the subscription' });
    }
});

// The service worker reports "I showed this message" (no sign-in: the worker has none). The endpoint is a
// secret URL only that browser knows, and it must match a message we really sent to it.
router.post('/ack', async (req, res) => {
    try {
        const { id, endpoint } = req.body || {};
        const ok = await push.recordReceipt(id, endpoint);
        res.json({ success: ok });
    } catch (err) {
        res.status(500).json({ error: 'Could not record the receipt' });
    }
});

router.post('/unsubscribe', authenticate, async (req, res) => {
    try {
        const endpoint = req.body && req.body.endpoint;
        if (endpoint) await push.removeSubscription(req.user.id, endpoint);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Could not remove the subscription' });
    }
});

// "Send me a test": proves the doorbell works on the signed-in user's own devices.
router.post('/test', authenticate, async (req, res) => {
    try {
        const out = await push.sendToUsers([req.user.id], {
            title: 'Doorbell test',
            body: 'If you can read this, attendance alerts will reach you even when the app is closed.',
            url: '/',
            tag: 'doorbell-test'
        });
        let message = 'Test sent. It should appear in a few seconds.';
        if (out.sent === 0) message = out.failed > 0 ? 'Your device could not be reached. Turn alerts off and on again.' : 'No device is subscribed yet.';
        res.json({ success: out.sent > 0, ...out, message });
    } catch (err) {
        res.status(500).json({ error: 'Could not send the test' });
    }
});

// HODs notify their department's students, the Principal can notify a department or everyone.
router.post('/dispatch', authenticate, authorizeRoles('hod', 'principal'), async (req, res) => {
    try {
        const { title, body, url } = req.body || {};
        if (!title || !body) return res.status(400).json({ error: 'Title and body are required' });

        let departments = null;
        if (req.user.role === 'hod') departments = groupOf(req.user.department);
        else if (req.body.department && req.body.department !== 'all') departments = groupOf(req.body.department);

        const [rows] = await pool.query(
            `SELECT id FROM users WHERE role = 'student' AND is_active = 1 ${departments ? 'AND department IN (?)' : ''}`,
            departments ? [departments] : []
        );
        const out = await push.sendToUsers(rows.map((r) => r.id), {
            title: String(title).slice(0, 80),
            body: String(body).slice(0, 240),
            url: typeof url === 'string' && url.startsWith('/') ? url : '/',
            tag: 'announcement'
        });
        res.json({ success: true, ...out });
    } catch (err) {
        console.error('Dispatch error:', err);
        res.status(500).json({ error: 'Could not send the notification' });
    }
});

// IT Operations: how many devices are subscribed
router.get('/devices', verifyItOps, async (req, res) => {
    try {
        const [[row]] = await pool.query('SELECT COUNT(*) AS devices, COUNT(DISTINCT user_id) AS users FROM push_subscriptions');
        res.json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = { router };
