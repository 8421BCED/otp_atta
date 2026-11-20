// Accounts listed here are never bound or blocked by the device lock.
const DEVICE_LOCK_EXEMPT_EMAILS = [
    'daniela.ug.24.it@francisxavier.ac.in'
];

const isDeviceLockExempt = (email) =>
    !!email && DEVICE_LOCK_EXEMPT_EMAILS.includes(String(email).trim().toLowerCase());

module.exports = { isDeviceLockExempt };
