require('dotenv').config({ quiet: true });

const need = (name, minLen = 1) => {
    const v = process.env[name];
    if (!v || v.length < minLen) {
        console.error(`FATAL: environment variable ${name} is missing or too short (min ${minLen} chars).`);
        process.exit(1);
    }
    return v;
};

// "AI-DS|AI-ML;CSE|CSBS" means AI-DS and AI-ML share one HOD, and CSE and CSBS share one.
const parseGroups = (raw) => (raw || '')
    .split(';')
    .map((g) => g.split('|').map((d) => d.trim()).filter(Boolean))
    .filter((g) => g.length > 1);

module.exports = {
    isProd: process.env.NODE_ENV === 'production',
    port: parseInt(process.env.PORT || '5000', 10),
    jwtSecret: need('JWT_SECRET', 32),
    itOpsPassphrase: need('ITOPS_PASSPHRASE', 12),
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    collegeDomain: (process.env.COLLEGE_DOMAIN || '@francisxavier.ac.in').toLowerCase(),
    allowTimeSimulation: process.env.ALLOW_TIME_SIMULATION === 'true',
    trustProxyHops: parseInt(process.env.TRUST_PROXY_HOPS || '1', 10),
    corsOrigins: (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean),
    headcountEnabled: process.env.HEADCOUNT_ENABLED !== 'false',

    // Google is the real sign-in. Passwords stay off unless this is explicitly turned on.
    passwordLogin: process.env.PASSWORD_LOGIN === 'true',

    // Days with no classes every week. 0 = Sunday ... 6 = Saturday.
    weeklyOff: (process.env.WEEKLY_OFF_DAYS || '0').split(',').map((d) => parseInt(d, 10)).filter((d) => d >= 0 && d <= 6),

    // Departments that share a HOD (see parseGroups).
    departmentGroups: parseGroups(process.env.DEPARTMENT_GROUPS || 'AI-DS|AI-ML'),

    // Browser push (the "doorbell"). Generate keys with: npx web-push generate-vapid-keys
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
    vapidSubject: process.env.VAPID_SUBJECT || 'https://otpattendance.fxcams.in'
};
