# FXEC AttendOTP - Production Anti-Proxy Attendance System
**Francis Xavier Engineering College (Autonomous)**

AttendOTP is a high-security, real-time OTP attendance management system engineered with hardware device binding, time-locked cutoffs (Morning 9:05 AM and Post-Lunch 1:35 PM), 10-second rolling classroom OTPs, AI YOLO classroom headcount verification, and multi-tier role-based workflows for Students, Faculty Mentors, Heads of Department (HOD), Principal, and Physical Education (PT) Directors.

---

## Production Folder Architecture

```text
otp_att/
├── backend/                       # Express API Server & Database Layer
│   ├── index.js                   # Production Express entry point (Port 5000)
│   ├── db.js                      # MySQL connection pool & auto-reconnect
│   ├── routes/                    # API Route Handlers
│   │   ├── attendance.js          # 10s OTP verification & period recording
│   │   ├── auth.js                # JWT Auth & hardware device-lock binding
│   │   ├── feedback.js            # User issue reporting pipeline
│   │   ├── headcount.js           # AI YOLO face detection audit
│   │   ├── hod.js                 # HOD department metrics & lockout release
│   │   ├── holidays.js            # Institutional & timed event exemptions
│   │   ├── itOps.js               # IT StrangeOps diagnostics
│   │   ├── leave.js               # Multi-level Leave & On-Duty (OD) approval
│   │   ├── location.js            # Campus hierarchy (Campus -> Building -> Floor -> Room)
│   │   ├── notifications.js       # Firebase Cloud Messaging (FCM) doorbell alerts
│   │   ├── principal.js           # College-wide analytics & live monitoring
│   │   └── sports.js              # Physical Education (PT) OD passes
│   ├── middleware/                # JWT Auth & RBAC access guards
│   ├── models/                    # AI ONNX weights (YOLO face detection)
│   ├── scripts/                   # Migration, DB indexing & seed utilities
│   ├── schema.sql                 # Production MySQL database schema
│   └── package.json               # Backend dependencies & scripts
│
├── frontend/                      # Progressive Web App (PWA) & UI Layer
│   ├── src/                       # React 19 source code
│   │   ├── App.jsx                # Core router & role-based dashboard switcher
│   │   ├── main.jsx               # React DOM entry point
│   │   ├── index.css              # Canary & Aero design system
│   │   ├── firebase.js            # FCM Web Push client setup
│   │   └── components/            # Production UI Components & Modals
│   │       ├── AttendanceCalendarModal.jsx # History & attendance calendar
│   │       ├── ClassroomHeadcountModal.jsx # AI YOLO live audit viewer
│   │       ├── ClassroomSelectionPage.jsx  # Interactive classroom picker
│   │       ├── FeedbackModal.jsx           # Issue report popup
│   │       ├── FeedbackPage.jsx            # Standalone feedback view
│   │       ├── Header.jsx                  # Precision clock, branding & profile
│   │       ├── HODDashboard.jsx            # HOD analytics, sanctioning & OTP
│   │       ├── LeaveReviewModal.jsx        # Mentor & HOD sanction modal
│   │       ├── LoginModal.jsx              # Quick switch modal
│   │       ├── LoginPage.jsx               # Production landing & login screen
│   │       ├── MobileBottomNav.jsx         # Mobile native tabbar & action sheet
│   │       ├── PeriodCountdownWheel.jsx    # Circular countdown clock
│   │       ├── PrincipalDashboard.jsx      # Executive master dashboard
│   │       ├── PTSportsDashboard.jsx       # Physical education sports passes
│   │       ├── RoomSelectionModal.jsx      # Room picker popup
│   │       ├── RoomStudentsModal.jsx       # Live room seated student roster
│   │       ├── StaffDashboard.jsx          # Faculty classroom lecture broadcaster
│   │       ├── StaffMovementModal.jsx      # Faculty movement trail
│   │       ├── StudentDashboard.jsx        # Student countdown & OTP verification
│   │       ├── StudentDetailsModal.jsx     # Student timeline & hardware status
│   │       └── StudentLeavePortal.jsx      # Student Leave & OD application portal
│   ├── public/                    # PWA Web Manifest, service workers & icons
│   │   ├── manifest.json          # Web App Manifest
│   │   ├── sw.js                  # PWA offline & caching service worker
│   │   ├── firebase-messaging-sw.js # Background push notification worker
│   │   └── icon-*.png             # Maskable & high-resolution icons
│   ├── vite.config.js             # Vite configuration with basicSsl
│   └── package.json               # Frontend dependencies & scripts
│
├── plans/                         # Project specifications & documentation
├── refrence/                      # Reference assets
├── start_all.bat                  # One-click launcher (MySQL + Backend + Frontend)
├── start_backend.ps1              # Dedicated backend service launcher
├── start_frontend.ps1             # Dedicated frontend client launcher
├── start_mysql.bat                # MySQL daemon launcher
├── stop_mysql.bat                 # Graceful MySQL shutdown script
├── push_to_github.bat             # Git push helper
└── package.json                   # Root monorepo workspace scripts
```

---

## Quick Start (Production & Local Development)

### 1. One-Click Launch
Double-click `start_all.bat` from File Explorer or run in terminal:
```cmd
start_all.bat
```
This automatically verifies MySQL, starts the Express Backend on port 5000, and launches the Vite Frontend on port 5173.

### 2. NPM Scripts
From the repository root:
```bash
# Start backend server
npm run backend

# Start frontend dev server
npm run frontend

# Build frontend for production deployment
npm run build
```

---

## Production Security & Architecture Highlights
- **Hardware Device Lock**: Student accounts automatically bind to their device fingerprint on first login. Proxy logins from other phones are prevented.
- **Time-Enforced Cutoffs**: Period 1 cutoff closes at 9:05 AM and Period 5 (post-lunch) cutoff closes at 1:35 PM. Late students require HOD authorization to enter rooms.
- **10-Second Rolling OTP**: Broadcasters rotate 6-digit codes every 10 seconds to prevent OTP forwarding.
- **AI YOLO Headcount**: Dual-validation comparing physical seated headcount from camera capture against verified OTP count.
- **Automatic OD Sanctions**: Approving mentor-endorsed OD applications automatically grants 100% attendance credit across target periods and unlocks period locks.
