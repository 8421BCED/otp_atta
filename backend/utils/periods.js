const pool = require('../db');

let cache = { at: 0, ids: null };

// Day cutoffs apply to period 1 (morning) and period 5 (after lunch). Resolve their ids
// from period_number so the rules do not depend on how the periods table was seeded.
const getCutoffPeriodIds = async () => {
    if (cache.ids && Date.now() - cache.at < 60000) return cache.ids;
    const [rows] = await pool.query('SELECT id, period_number FROM periods WHERE is_break = 0 AND period_number IN (1, 5)');
    const ids = { morning: 1, afternoon: 7 };
    for (const r of rows) {
        if (r.period_number === 1) ids.morning = r.id;
        if (r.period_number === 5) ids.afternoon = r.id;
    }
    cache = { at: Date.now(), ids };
    return ids;
};

module.exports = { getCutoffPeriodIds };
