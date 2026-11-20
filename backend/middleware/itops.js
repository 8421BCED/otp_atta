const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { jwtSecret, itOpsPassphrase } = require('../config');

const safeEqual = (a, b) => {
    const ha = crypto.createHash('sha256').update(String(a)).digest();
    const hb = crypto.createHash('sha256').update(String(b)).digest();
    return crypto.timingSafeEqual(ha, hb);
};

const checkPassphrase = (candidate) => typeof candidate === 'string' && safeEqual(candidate, itOpsPassphrase);

const signItOpsToken = () => jwt.sign({ scope: 'itops' }, jwtSecret, { expiresIn: '4h', algorithm: 'HS256' });

// Accepts only a token issued by POST /api/it-ops/verify.
const verifyItOps = (req, res, next) => {
    const token = req.headers['x-it-ops-token'];
    if (!token) return res.status(401).json({ error: 'IT Operations sign-in required' });
    try {
        const decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
        if (decoded.scope !== 'itops') throw new Error('wrong scope');
        return next();
    } catch (e) {
        return res.status(401).json({ error: 'IT Operations session expired. Sign in again.' });
    }
};

module.exports = { verifyItOps, checkPassphrase, signItOpsToken };
