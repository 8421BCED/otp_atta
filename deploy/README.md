# Deploying AttendOTP

## One server

```bash
# 1. Database
mysql -u root -p -e "CREATE DATABASE otp_attendance CHARACTER SET utf8mb4"
mysql -u root -p otp_attendance < backend/schema.sql

# 2. Build the app (on any machine) and copy it into the backend
npm --prefix frontend ci && npm run build        # writes backend/dist

# 3. Configure
cd backend && cp .env.example .env               # fill in every value (see below)
npm ci --omit=dev
npx web-push generate-vapid-keys                 # paste both keys into .env (doorbell alerts)

# 4. Run one worker per CPU core
pm2 start ../deploy/ecosystem.config.js
pm2 save && pm2 startup

# 5. TLS + load balancer
sudo cp ../deploy/nginx.conf /etc/nginx/sites-available/otpattendance
sudo ln -s /etc/nginx/sites-available/otpattendance /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Deploy updates with `pm2 reload otp-attendance`. Workers restart one at a time, so nobody is signed out.

## Signing in

People sign in with their **college Google account**. There are no passwords to leak or reset, and
`PASSWORD_LOGIN` stays `false`. In the Google Cloud console, add your site (for example
`https://otpattendance.fxcams.in`) under *Authorized JavaScript origins* for the OAuth client.

The first accounts: insert one `principal` row (use `GOOGLE_SSO` as `password_hash`) or run
`backend/scripts/seed_staff_from_csv.js`. Create everyone else in the IT Operations console at
`/strange` (passphrase = `ITOPS_PASSPHRASE`). An account only works if its email already exists.

## The rules the server enforces

| Rule | Behaviour |
| --- | --- |
| Morning | Miss the period 1 code by 9:05: absent for periods 1 to 4. The lock lifts when period 4 ends. |
| Afternoon | Codes open again when period 5 starts (1:30). Miss it by 1:35: absent for the rest of the day. |
| Weekly off | `WEEKLY_OFF_DAYS` (default Sunday). No codes, no locks. |
| Holidays | Declared by a HOD (their department) or the Principal (college). No codes, no locks. |
| HOD unlock | Covers the session it is granted in (morning or afternoon). |
| Shared HODs | `DEPARTMENT_GROUPS` (default `AI-DS\|AI-ML`): one HOD looks after both. |

## Load balancing and rate limits

- PM2 cluster mode spreads requests across every CPU core. For several servers, add a `server` line per
  machine to the `upstream` block in `nginx.conf` (same app, same MySQL).
- A whole campus shares one public address, so limits are **per signed-in user** (300 requests a minute),
  in the app and in nginx. Only the sign-in page falls back to the address. A student's app makes about
  6 requests a minute.
- The app keeps no sessions in memory. Rate-limit counters are per worker, so the effective limit is a
  little higher than stated, which is fine.
- Health checks: `GET /api/health` (process is up) and `GET /api/ready` (database reachable).
- Workers x `DB_CONNECTION_LIMIT` must stay below MySQL `max_connections`.

## Capacity (measured)

Load test with 2,500 synthetic students against 4 workers on one ordinary laptop that was also running
MySQL and the load generator (so this is a floor, not a ceiling):

| Scenario | Result |
| --- | --- |
| A normal day: 2,500 phones polling (264 requests/s) | every request answered, median 3 ms, slowest 1% under 8 ms |
| All 2,500 refreshing within 3.4 s at a period change (735 requests/s) | 100% ok, slowest 1% under 30 ms |
| All 2,500 opening the app at 8:55 within a minute (15,000 requests) | 100% ok, one IP address, no throttling |
| The attendance rush: all 2,500 enter the code within a minute | 2,500 of 2,500 marked, slowest 1% under 30 ms |
| Stress ramp | clean up to 3,500 requests/s (13x the real load); only at 19x does it start answering "busy, retry" |

The app keeps this cheap on purpose: the clock and the current period are worked out on the phone,
the server is asked for the rules every 15 seconds (once a minute for the timetable), phones refresh at period
boundaries with a random 0 to 3 second delay so they never arrive together, and the holiday list and campus
structure are cached for 30 and 60 seconds. When the database is saturated the server answers
`503` with `Retry-After`, and every phone pauses its polling for that long.

MySQL at the peak used 65 of 151 connections with 4 workers. Keep workers x `DB_CONNECTION_LIMIT` under
`max_connections`. Not covered by the test: the Google sign-in call itself (it needs real Google tokens).

## Doorbell alerts and offline

Browser push, no Firebase needed. Students tap **Turn on** once. They then get a notification when a
teacher opens attendance, and reminders at 9:00:30, 9:03:30, 1:30:30 and 1:33:30 if they have not marked.
It works with the app closed (Chrome, Edge, Firefox, Android). On an iPhone it works once the app is added
to the home screen. Reminders run in every worker, and a database row makes sure each one is sent only once.

The service worker (`/sw.js`) also keeps the app shell, so the app opens without signal and says so.
Attendance itself always needs the server.

## Settings that matter

| Variable | Why |
| --- | --- |
| `JWT_SECRET`, `ITOPS_PASSPHRASE` | Required, 32+ and 12+ characters. The app refuses to start without them. |
| `GOOGLE_CLIENT_ID` | The OAuth client for Google sign-in. |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Doorbell alerts. Generate once and keep them. Changing them drops every subscription. |
| `TRUST_PROXY_HOPS` | `1` behind nginx, `2` behind Cloudflare and nginx. |
| `DB_CONNECTION_LIMIT` | Per worker. |
| `ALLOW_TIME_SIMULATION` | Must be `false` in production. |
| `HEADCOUNT_ENABLED` | `false` skips loading the two ~100 MB AI models. Copy the `.onnx` files into `backend/models/` (they are not in git). |

## Safety around your campus data

- `backend/scripts/seed_college_rooms.js` only **adds** what is missing. It never deletes or overwrites.
- Rooms and students that have attendance history cannot be deleted: the API refuses and the database
  itself refuses (`backend/scripts/migrate_protect_history.js`). Deactivate people instead of deleting them.

Rotate the Google OAuth client secret and the old `serviceAccountKey.json` (no longer used) if they were
ever shared.
