const jwt = require('jsonwebtoken');
const pool = require('../db');
const { jwtSecret } = require('../config');

// A token is only as good as the account behind it. Each request confirms the account is still
// active and its role has not changed. Results are cached per worker for a few seconds, so a
// deactivated account stops working within CACHE_TTL_MS everywhere, without a query per request.
const CACHE_TTL_MS = 15000;
const CACHE_MAX = 20000;
const accountCache = new Map();

const loadAccount = async (id) => {
    const hit = accountCache.get(id);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.account;

    const [rows] = await pool.query('SELECT is_active, role, department FROM users WHERE id = ?', [id]);
    const account = rows[0] || null;
    if (accountCache.size >= CACHE_MAX) accountCache.clear();
    accountCache.set(id, { account, at: Date.now() });
    return account;
};

// Call after changing or deleting an account so this worker notices immediately.
const invalidateAccount = (id) => accountCache.delete(Number(id));

const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    let decoded;
    try {
        decoded = jwt.verify(authHeader.slice(7), jwtSecret, { algorithms: ['HS256'] });
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
    if (decoded.scope === 'itops' || !decoded.id) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token type' });
    }

    try {
        const account = await loadAccount(decoded.id);
        if (!account || !account.is_active) {
            return res.status(401).json({ error: 'This account is no longer active', code: 'ACCOUNT_DISABLED' });
        }
        if (account.role !== decoded.role) {
            return res.status(401).json({ error: 'Your role changed. Please sign in again.', code: 'ROLE_CHANGED' });
        }
        // The department comes from the database, so a transfer applies at once.
        req.user = { ...decoded, department: account.department };
        return next();
    } catch (err) {
        return next(err);
    }
};

const authorizeRoles = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ error: `Access denied. Requires one of roles: [${roles.join(', ')}]` });
    }
    return next();
};

// device = { fingerprint, deviceId } for students, null for everyone else.
const signUserToken = (user, device) =>
    jwt.sign(
        {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
            roll_number: user.roll_number,
            deviceFp: (device && device.fingerprint) || null,
            deviceId: (device && device.deviceId) || null
        },
        jwtSecret,
        { expiresIn: '24h', algorithm: 'HS256' }
    );

// Used by the rate limiter: the user id from a valid token, without touching the database.
const userIdFromRequest = (req) => {
    const h = req.headers.authorization;
    if (!h || !h.startsWith('Bearer ')) return null;
    try {
        const d = jwt.verify(h.slice(7), jwtSecret, { algorithms: ['HS256'] });
        return d && d.id && d.scope !== 'itops' ? d.id : null;
    } catch (e) {
        return null;
    }
};

module.exports = { authenticate, authorizeRoles, signUserToken, invalidateAccount, userIdFromRequest };
