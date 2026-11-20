// PM2 process file. Runs one Node worker per CPU core (cluster mode); PM2 shares the
// port between them and restarts any worker that crashes.
//
//   cd backend && npm install --omit=dev
//   pm2 start ../deploy/ecosystem.config.js
//   pm2 save && pm2 startup
//   pm2 reload otp-attendance        <- zero downtime deploys (one worker at a time)

module.exports = {
    apps: [
        {
            name: 'otp-attendance',
            cwd: __dirname + '/../backend',
            script: 'index.js',
            exec_mode: 'cluster',
            // 'max' = every core. Each worker holds DB_CONNECTION_LIMIT MySQL connections,
            // so keep (workers x DB_CONNECTION_LIMIT) below MySQL max_connections.
            instances: process.env.WEB_CONCURRENCY || 'max',
            wait_ready: true,           // worker sends process.send('ready') once it is listening
            listen_timeout: 15000,
            kill_timeout: 16000,        // matches the 15s drain in index.js
            max_memory_restart: '600M',
            env: { NODE_ENV: 'production' },
            time: true
        }
    ]
};
