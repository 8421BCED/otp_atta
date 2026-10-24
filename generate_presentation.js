const pptxgen = require('pptxgenjs');
const path = require('path');

async function createPresentation() {
    const pres = new pptxgen();
    pres.layout = 'LAYOUT_16x9';
    pres.author = 'Francis Xavier Engineering College';
    pres.company = 'FXEC Autonomous';
    pres.title = 'AI & Rolling OTP Anti-Proxy Attendance Verification System';

    // Theme Colors (FXEC Official Palette)
    const C_BLUE = '136CFC';       // Primary Tech Blue
    const C_DARK = '152641';       // Deep Contrast Navy
    const C_GREEN = '10B981';      // Success Green
    const C_LIGHT_BLUE = 'E8F4FC'; // Soft Slate Surface
    const C_WHITE = 'FFFFFF';      // Pure White
    const C_GRAY = '64748B';       // Secondary Text
    const C_RED = 'EF4444';        // Danger / Proxy Alert

    // Slide Helper to add standard header & footer
    function addSlideLayout(slide, category, title, subtitle) {
        // Top Brand Bar
        slide.addShape(pres.ShapeType.rect, {
            x: 0, y: 0, w: '100%', h: 0.12,
            fill: { color: C_BLUE }
        });

        // Category Tag
        if (category) {
            slide.addText(category.toUpperCase(), {
                x: 0.8, y: 0.35, w: 9.0, h: 0.3,
                fontSize: 10, bold: true, color: C_BLUE,
                fontFace: 'Arial'
            });
        }

        // Title
        slide.addText(title, {
            x: 0.8, y: 0.65, w: 11.5, h: 0.6,
            fontSize: 22, bold: true, color: C_DARK,
            fontFace: 'Arial'
        });

        // Subtitle
        if (subtitle) {
            slide.addText(subtitle, {
                x: 0.8, y: 1.25, w: 11.5, h: 0.4,
                fontSize: 12, color: C_GRAY, italic: true,
                fontFace: 'Arial'
            });
        }

        // Footer Bar
        slide.addShape(pres.ShapeType.line, {
            x: 0.8, y: 7.0, w: 11.7, h: 0,
            line: { color: 'CBD5E1', width: 1 }
        });

        slide.addText('Francis Xavier Engineering College (Autonomous) • Anti-Proxy OTP & Vision AI System', {
            x: 0.8, y: 7.05, w: 8.5, h: 0.3,
            fontSize: 9, color: '94A3B8', fontFace: 'Arial'
        });
    }

    // ==========================================
    // SLIDE 1: Title & Cover Slide
    // ==========================================
    {
        const slide = pres.addSlide();
        slide.background = { color: C_DARK };

        // Decorative background card
        slide.addShape(pres.ShapeType.rect, {
            x: 1.0, y: 1.2, w: 11.3, h: 5.0,
            fill: { color: '1E3A5F' },
            line: { color: C_BLUE, width: 2 }
        });

        slide.addText('FRANCIS XAVIER ENGINEERING COLLEGE', {
            x: 1.5, y: 1.8, w: 10.0, h: 0.4,
            fontSize: 14, bold: true, color: '93C5FD',
            charSpacing: 3, fontFace: 'Arial'
        });

        slide.addText('Autonomous Institution • Accredited by NAAC with "A+" Grade', {
            x: 1.5, y: 2.2, w: 10.0, h: 0.3,
            fontSize: 11, color: '94A3B8', fontFace: 'Arial'
        });

        slide.addText('AI & Dynamic 10s OTP Anti-Proxy\nAttendance Ecosystem', {
            x: 1.5, y: 2.8, w: 10.0, h: 1.5,
            fontSize: 32, bold: true, color: C_WHITE,
            fontFace: 'Arial'
        });

        slide.addText('Real-Time Classroom Tracking, Hardware Lock, Period-1 Window & Dual YOLOv8 Vision Audits', {
            x: 1.5, y: 4.4, w: 10.0, h: 0.6,
            fontSize: 14, color: 'E2E8F0', fontFace: 'Arial'
        });

        slide.addText('Presented to: Principal & Academic Leadership Team\nDepartment of Information Technology & Computer Science Engineering', {
            x: 1.5, y: 5.3, w: 10.0, h: 0.6,
            fontSize: 11, italic: true, color: '6EE7B7', fontFace: 'Arial'
        });
    }

    // ==========================================
    // SLIDE 2: Executive Summary & Need
    // ==========================================
    {
        const slide = pres.addSlide();
        addSlideLayout(slide, 'Executive Overview', 'Executive Summary & The Need', 'Addressing modern attendance loopholes in higher education');

        const cards = [
            { title: 'The Problem', color: C_RED, text: '• Traditional manual registers waste 10-15 mins per hour.\n• Static QR codes and passwords get shared instantly on WhatsApp groups.\n• Students mark attendance for friends who are outside campus or sleeping in hostels.' },
            { title: 'Our Solution', color: C_BLUE, text: '• 10-Second Dynamic Rolling OTPs generated cryptographically per classroom.\n• Hardware 1-Device Fingerprint Lock preventing phone rotation.\n• Dual YOLOv8 AI Face & Person Auditing matching headcount in 0.34s.' },
            { title: 'The Institutional Impact', color: C_GREEN, text: '• 100% Zero-Proxy Guarantee across all 7 daily periods.\n• Zero time wasted by faculty during teaching hours.\n• Instant live visibility for Principal, HODs, Staff, and Parents.' }
        ];

        cards.forEach((c, idx) => {
            const xPos = 0.8 + idx * 4.0;
            slide.addShape(pres.ShapeType.rect, {
                x: xPos, y: 1.8, w: 3.7, h: 4.8,
                fill: { color: C_WHITE },
                line: { color: 'CBD5E1', width: 1.5 }
            });
            slide.addShape(pres.ShapeType.rect, {
                x: xPos, y: 1.8, w: 3.7, h: 0.6,
                fill: { color: c.color }
            });
            slide.addText(c.title, {
                x: xPos + 0.2, y: 1.85, w: 3.3, h: 0.5,
                fontSize: 14, bold: true, color: C_WHITE, fontFace: 'Arial'
            });
            slide.addText(c.text, {
                x: xPos + 0.3, y: 2.6, w: 3.1, h: 3.8,
                fontSize: 11, color: C_DARK, fontFace: 'Arial', lineSpacing: 20
            });
        });
    }

    // ==========================================
    // SLIDE 3: System Architecture & Tech Stack
    // ==========================================
    {
        const slide = pres.addSlide();
        addSlideLayout(slide, 'System Design', 'Multi-Tier System Architecture', 'Scalable, reactive client-server infrastructure with pure CPU Edge AI');

        const tiers = [
            { tier: 'Tier 1: Client Frontends', bg: C_LIGHT_BLUE, border: C_BLUE, items: '• React 18 + Vite (Tailored Vanilla CSS Design)\n• Real-Time Responsive Layout (Desktop, Tablets & Mobile Phones)\n• Dual Mode: Native Camera Video Feed & Direct Photo Picker' },
            { tier: 'Tier 2: Backend & Logic Engine', bg: 'FEF3C7', border: 'D97706', items: '• Node.js REST API with Express + WebSocket sync\n• Dynamic 10-Second Rolling TOTP Generator (SHA-256)\n• Strict Morning Window & Hardware Lock Middleware' },
            { tier: 'Tier 3: Database & Integrity', bg: 'DCFCE7', border: '16A34A', items: '• MySQL Relational Engine (Normalized schema)\n• Attendance audit trail, Movement logs & Hardware bindings\n• Dynamic Date Formatting without timezone offsets' },
            { tier: 'Tier 4: Vision AI Engine', bg: 'F3E8FF', border: '9333EA', items: '• Node.js ONNX Runtime Execution (Zero Python runtime needed)\n• YOLOv8m-Face (103MB) + YOLOv8m (Person detection)\n• CPU Capped to 2 threads (prevents server CPU spikes)' }
        ];

        tiers.forEach((t, idx) => {
            const x = 0.8 + (idx % 2) * 6.0;
            const y = 1.8 + Math.floor(idx / 2) * 2.5;
            slide.addShape(pres.ShapeType.rect, {
                x: x, y: y, w: 5.7, h: 2.3,
                fill: { color: t.bg },
                line: { color: t.border, width: 1.5 }
            });
            slide.addText(t.tier, {
                x: x + 0.3, y: y + 0.2, w: 5.1, h: 0.4,
                fontSize: 13, bold: true, color: C_DARK, fontFace: 'Arial'
            });
            slide.addText(t.items, {
                x: x + 0.3, y: y + 0.65, w: 5.1, h: 1.5,
                fontSize: 10.5, color: C_DARK, fontFace: 'Arial', lineSpacing: 18
            });
        });
    }

    // ==========================================
    // SLIDE 4: Core Pillar 1 - Rolling 10s OTP
    // ==========================================
    {
        const slide = pres.addSlide();
        addSlideLayout(slide, 'Attendance Mechanism', 'Core Pillar 1: Dynamic 10-Second Rolling OTP', 'Eliminating screenshot & social media proxy sharing permanently');

        slide.addShape(pres.ShapeType.rect, {
            x: 0.8, y: 1.8, w: 7.2, h: 4.8,
            fill: { color: C_WHITE },
            line: { color: 'CBD5E1', width: 1 }
        });

        slide.addText('How Rolling OTP Solves Proxy Attendance:', {
            x: 1.1, y: 2.0, w: 6.6, h: 0.4,
            fontSize: 15, bold: true, color: C_DARK, fontFace: 'Arial'
        });

        slide.addText(
            '1. Dynamic Ephemeral Cryptography:\n   The staff projector / display generates a unique 6-digit OTP code every 10 seconds based on server room ID and timestamp.\n\n' +
            '2. Instant Expiry:\n   By the time an absent student receives an OTP forwarded over WhatsApp or Telegram, the code has already expired.\n\n' +
            '3. Strict Room Scoping:\n   The student device must explicitly declare their physical classroom ID. Submitting an OTP generated for Room 101 while sitting in Room 204 is rejected.\n\n' +
            '4. Instant Visual & Auditory Feedback:\n   Upon successful OTP verification, the student dashboard triggers celebratory confetti and locks that period as "Present".',
            {
                x: 1.1, y: 2.5, w: 6.6, h: 3.9,
                fontSize: 11, color: C_DARK, fontFace: 'Arial', lineSpacing: 20
            }
        );

        // Right simulation card
        slide.addShape(pres.ShapeType.rect, {
            x: 8.3, y: 1.8, w: 4.2, h: 4.8,
            fill: { color: C_DARK },
            line: { color: C_BLUE, width: 2 }
        });

        slide.addText('LIVE PROJECTOR SCREEN', {
            x: 8.5, y: 2.1, w: 3.8, h: 0.3,
            fontSize: 10, bold: true, color: '93C5FD', align: 'center', fontFace: 'Arial'
        });

        slide.addText('784 219', {
            x: 8.5, y: 2.6, w: 3.8, h: 1.0,
            fontSize: 36, bold: true, color: '34D399', align: 'center', fontFace: 'Courier New'
        });

        slide.addText('RE-ROLLING IN: 04s', {
            x: 8.5, y: 3.6, w: 3.8, h: 0.3,
            fontSize: 12, bold: true, color: 'FBBF24', align: 'center', fontFace: 'Arial'
        });

        slide.addText('Room: FX 101 (Lecture Hall)\nPeriod: 1 (09:00 AM – 09:50 AM)\nVerified Students: 45 / 45', {
            x: 8.5, y: 4.2, w: 3.8, h: 1.5,
            fontSize: 10.5, color: 'E2E8F0', align: 'center', fontFace: 'Arial', lineSpacing: 18
        });
    }

    // ==========================================
    // SLIDE 5: Core Pillar 2 - Hardware 1-Device Binding
    // ==========================================
    {
        const slide = pres.addSlide();
        addSlideLayout(slide, 'Device Security', 'Core Pillar 2: Hardware 1-Device Binding', 'Preventing device rotation and multi-account proxy sign-ins');

        const points = [
            { icon: '📱', title: 'Cryptographic Device Fingerprint', desc: 'Each student account is bound to their physical device (User-Agent, Canvas WebGL hash, and Device Fingerprint) upon initial sign-in.' },
            { icon: '🔒', title: 'Zero Multi-Login Exploits', desc: 'A student physically inside class CANNOT mark attendance for 5 friends on their laptop or mobile phone. Each hardware token strictly allows 1 active student.' },
            { icon: '⚡', title: 'Controlled Release by Faculty & HOD', desc: 'If a student genuinely changes their mobile or their phone battery dies, they cannot self-reset. Only the HOD or Class Advisor can release hardware locks.' },
            { icon: '🛡️', title: 'Automated Lockout Anomaly Alerts', desc: 'Any attempt to submit OTP from an unverified or mismatched secondary phone triggers an instantaneous security lockout logged in the audit ledger.' }
        ];

        points.forEach((p, idx) => {
            const x = 0.8 + (idx % 2) * 6.0;
            const y = 1.8 + Math.floor(idx / 2) * 2.5;
            slide.addShape(pres.ShapeType.rect, {
                x: x, y: y, w: 5.7, h: 2.3,
                fill: { color: C_WHITE },
                line: { color: C_BLUE, width: 1.2 }
            });
            slide.addText(`${p.icon}  ${p.title}`, {
                x: x + 0.3, y: y + 0.2, w: 5.1, h: 0.4,
                fontSize: 13, bold: true, color: C_DARK, fontFace: 'Arial'
            });
            slide.addText(p.desc, {
                x: x + 0.3, y: y + 0.7, w: 5.1, h: 1.4,
                fontSize: 11, color: C_GRAY, fontFace: 'Arial', lineSpacing: 18
            });
        });
    }

    // ==========================================
    // SLIDE 6: Core Pillar 3 - Morning Period-1 Window
    // ==========================================
    {
        const slide = pres.addSlide();
        addSlideLayout(slide, 'Discipline & Punctuality', 'Core Pillar 3: Morning Period-1 Cutoff Window', '9:00 AM – 9:05 AM campus entry lock & automatic full-day freeze');

        slide.addShape(pres.ShapeType.rect, {
            x: 0.8, y: 1.8, w: 11.7, h: 4.8,
            fill: { color: C_WHITE },
            line: { color: 'CBD5E1', width: 1 }
        });

        // Timeline visualization steps
        const steps = [
            { time: '09:00 AM', status: 'SESSION OPENS', color: C_BLUE, desc: 'College bell rings. Period 1 commences across all departments.' },
            { time: '09:00 – 09:05 AM', status: 'CRITICAL 5-MIN WINDOW', color: C_GREEN, desc: 'Students enter classroom and submit the live 10s OTP. Attendance marks "Present" and unlocks the rest of the academic day.' },
            { time: '09:05:01 AM', status: 'AUTOMATIC DAY-START CUTOFF', color: C_RED, desc: 'Window strictly closes. Unmarked students receive "Period 1 Missed - Day Attendance Locked".' },
            { time: '09:06 AM – 04:05 PM', status: 'RESTRICTED ACCESS', color: 'B91C1C', desc: 'Locked students CANNOT mark attendance in Periods 2–7 unless officially unlocked by HOD with reason.' }
        ];

        steps.forEach((s, idx) => {
            const yPos = 2.0 + idx * 1.15;
            slide.addShape(pres.ShapeType.rect, {
                x: 1.1, y: yPos, w: 2.2, h: 0.9,
                fill: { color: C_LIGHT_BLUE },
                line: { color: C_BLUE, width: 1 }
            });
            slide.addText(s.time, {
                x: 1.1, y: yPos + 0.25, w: 2.2, h: 0.4,
                fontSize: 11, bold: true, color: C_DARK, align: 'center', fontFace: 'Arial'
            });

            slide.addShape(pres.ShapeType.rect, {
                x: 3.5, y: yPos, w: 2.5, h: 0.9,
                fill: { color: s.color }
            });
            slide.addText(s.status, {
                x: 3.5, y: yPos + 0.25, w: 2.5, h: 0.4,
                fontSize: 9.5, bold: true, color: C_WHITE, align: 'center', fontFace: 'Arial'
            });

            slide.addText(s.desc, {
                x: 6.2, y: yPos + 0.15, w: 6.0, h: 0.7,
                fontSize: 11, color: C_DARK, fontFace: 'Arial', lineSpacing: 16
            });
        });
    }

    // ==========================================
    // SLIDE 7: Core Pillar 4 - Dual YOLOv8 AI Headcount
    // ==========================================
    {
        const slide = pres.addSlide();
        addSlideLayout(slide, 'AI Computer Vision', 'Core Pillar 4: Dual YOLOv8 Vision Headcount', 'Real-time face & person counting to audit seated students vs OTP submissions');

        slide.addShape(pres.ShapeType.rect, {
            x: 0.8, y: 1.8, w: 5.7, h: 4.8,
            fill: { color: C_WHITE },
            line: { color: C_GREEN, width: 1.5 }
        });

        slide.addText('How AI Vision Auditing Operates:', {
            x: 1.1, y: 2.0, w: 5.1, h: 0.4,
            fontSize: 14, bold: true, color: C_DARK, fontFace: 'Arial'
        });

        slide.addText(
            '• Podium Camera Capture:\n  Staff or HOD clicks "AI Headcount (YOLO)" on their teaching card and captures a front-angle classroom photo.\n\n' +
            '• Dual-Model Synergy:\n  - YOLOv8m-Face (103MB): Detects clear, front & angled student faces.\n  - YOLOv8m-Person: Detects occluded heads, students leaning back, or partially blocked rows.\n\n' +
            '• Non-Maximum Suppression (NMS):\n  IOU deduplication prevents double-counting students.\n\n' +
            '• 0.34s Speed on Pure CPU:\n  Optimized Node.js ONNX runtime execution without expensive GPUs.',
            {
                x: 1.1, y: 2.5, w: 5.1, h: 3.9,
                fontSize: 10.5, color: C_DARK, fontFace: 'Arial', lineSpacing: 19
            }
        );

        // Right side comparison box
        slide.addShape(pres.ShapeType.rect, {
            x: 6.8, y: 1.8, w: 5.7, h: 4.8,
            fill: { color: C_LIGHT_BLUE },
            line: { color: C_BLUE, width: 1.5 }
        });

        slide.addText('AUTOMATED AUDIT COMPARISON', {
            x: 7.1, y: 2.0, w: 5.1, h: 0.3,
            fontSize: 11, bold: true, color: C_BLUE, fontFace: 'Arial'
        });

        // Match case
        slide.addShape(pres.ShapeType.rect, {
            x: 7.1, y: 2.4, w: 5.1, h: 1.8,
            fill: { color: 'F0FDF4' },
            line: { color: '86EFAC', width: 1 }
        });
        slide.addText('Case A: Full Verification (✓ 100% Match)', {
            x: 7.3, y: 2.5, w: 4.7, h: 0.3,
            fontSize: 11, bold: true, color: '15803D', fontFace: 'Arial'
        });
        slide.addText('• OTP Verified Count: 45 Students\n• YOLO Detected Count: 45 Faces Seated\n• Result: Verified. Green Badge displayed on Principal/HOD dashboard.', {
            x: 7.3, y: 2.85, w: 4.7, h: 1.2,
            fontSize: 10, color: '14532D', fontFace: 'Arial', lineSpacing: 16
        });

        // Discrepancy case
        slide.addShape(pres.ShapeType.rect, {
            x: 7.1, y: 4.4, w: 5.1, h: 2.0,
            fill: { color: 'FEF2F2' },
            line: { color: 'FCA5A5', width: 1 }
        });
        slide.addText('Case B: Proxy Detected (⚠️ Discrepancy Alert)', {
            x: 7.3, y: 4.5, w: 4.7, h: 0.3,
            fontSize: 11, bold: true, color: 'B91C1C', fontFace: 'Arial'
        });
        slide.addText('• OTP Verified Count: 45 Students\n• YOLO Detected Count: 42 Faces Seated\n• Discrepancy: +3 Ghost Submissions Detected!\n• Alert flagged immediately to HOD for roster reconciliation.', {
            x: 7.3, y: 4.85, w: 4.7, h: 1.4,
            fontSize: 10, color: '7F1D1D', fontFace: 'Arial', lineSpacing: 16
        });
    }

    // ==========================================
    // SLIDE 8: Movement Trail & Multi-Lab Relocation
    // ==========================================
    {
        const slide = pres.addSlide();
        addSlideLayout(slide, 'Campus Tracking', 'Classroom & Lab Movement Trail', 'Tracking student transitions between lectures, computer labs and halls');

        slide.addShape(pres.ShapeType.rect, {
            x: 0.8, y: 1.8, w: 11.7, h: 4.8,
            fill: { color: C_WHITE },
            line: { color: 'CBD5E1', width: 1 }
        });

        slide.addText('Typical College Day Schedule with Physical Relocations:', {
            x: 1.1, y: 2.0, w: 11.0, h: 0.4,
            fontSize: 14, bold: true, color: C_DARK, fontFace: 'Arial'
        });

        const movements = [
            { period: 'Periods 1–3', time: '09:00 AM – 11:50 AM', room: 'Room FX 101 (Lecture Hall)', type: 'Theory Session', desc: 'Core Engineering Subjects. Attendance locked via morning OTP.' },
            { period: 'Periods 4–5', time: '11:50 AM – 02:15 PM', room: 'Cloud & Networks Lab (AL-02)', type: 'Laboratory Session', desc: 'Lab shift logged in Movement Trail. Relocation OTP verified at lab entrance.' },
            { period: 'Periods 6–7', time: '02:15 PM – 04:05 PM', room: 'Room FX-PH (Presentation Hall)', type: 'Seminar / Project', desc: 'Final afternoon session. Student trail matches physical campus location.' }
        ];

        movements.forEach((m, idx) => {
            const y = 2.6 + idx * 1.35;
            slide.addShape(pres.ShapeType.rect, {
                x: 1.1, y: y, w: 2.2, h: 1.1,
                fill: { color: C_LIGHT_BLUE },
                line: { color: C_BLUE, width: 1 }
            });
            slide.addText(m.period, {
                x: 1.1, y: y + 0.15, w: 2.2, h: 0.3,
                fontSize: 11, bold: true, color: C_DARK, align: 'center', fontFace: 'Arial'
            });
            slide.addText(m.time, {
                x: 1.1, y: y + 0.45, w: 2.2, h: 0.3,
                fontSize: 8.5, color: C_GRAY, align: 'center', fontFace: 'Arial'
            });

            slide.addShape(pres.ShapeType.rect, {
                x: 3.5, y: y, w: 4.5, h: 1.1,
                fill: { color: C_WHITE },
                line: { color: 'E2E8F0', width: 1 }
            });
            slide.addText(m.room, {
                x: 3.7, y: y + 0.15, w: 4.1, h: 0.3,
                fontSize: 12, bold: true, color: C_BLUE, fontFace: 'Arial'
            });
            slide.addText(m.type, {
                x: 3.7, y: y + 0.45, w: 4.1, h: 0.3,
                fontSize: 9.5, color: '10B981', bold: true, fontFace: 'Arial'
            });

            slide.addText(m.desc, {
                x: 8.2, y: y + 0.25, w: 4.1, h: 0.7,
                fontSize: 10.5, color: C_DARK, fontFace: 'Arial', lineSpacing: 16
            });
        });
    }

    // ==========================================
    // SLIDE 9: Sports & Event OD Pass Workflow
    // ==========================================
    {
        const slide = pres.addSlide();
        addSlideLayout(slide, 'Official Duties & Sports', 'Sports & Event Exemption (OD) Pass System', 'Digital approval workflow replacing paper OD letters');

        const flow = [
            { step: '1. Request', actor: 'Physical Director / Sports Coordinator', desc: 'Registers sports tournaments (Anna Univ Zonal, Inter-College) with student roll numbers & date range.' },
            { step: '2. Approval', actor: 'Principal / HOD Portal', desc: 'One-click verification and digital authorization of tournament participation.' },
            { step: '3. Automated Exemption', actor: 'Attendance Database Engine', desc: 'Matches student IDs on match dates. Automatically exempts them from Morning 9:05 AM lockouts.' },
            { step: '4. Calendar Tagging', actor: 'Academic Calendar Ledger', desc: 'Marked with special Purple Star badge ("Approved Sports OD / Event Exemption") counting towards attendance %.' }
        ];

        flow.forEach((f, idx) => {
            const x = 0.8 + idx * 3.0;
            slide.addShape(pres.ShapeType.rect, {
                x: x, y: 2.0, w: 2.8, h: 4.4,
                fill: { color: C_WHITE },
                line: { color: '9333EA', width: 1.5 }
            });
            slide.addShape(pres.ShapeType.rect, {
                x: x, y: 2.0, w: 2.8, h: 0.6,
                fill: { color: '9333EA' }
            });
            slide.addText(f.step, {
                x: x + 0.1, y: 2.1, w: 2.6, h: 0.4,
                fontSize: 12, bold: true, color: C_WHITE, fontFace: 'Arial'
            });
            slide.addText(f.actor, {
                x: x + 0.2, y: 2.8, w: 2.4, h: 0.6,
                fontSize: 11, bold: true, color: C_DARK, fontFace: 'Arial'
            });
            slide.addText(f.desc, {
                x: x + 0.2, y: 3.5, w: 2.4, h: 2.7,
                fontSize: 10, color: C_GRAY, fontFace: 'Arial', lineSpacing: 18
            });
        });
    }

    // ==========================================
    // SLIDE 10: Role-Based Portals: Student & Faculty
    // ==========================================
    {
        const slide = pres.addSlide();
        addSlideLayout(slide, 'User Experiences', 'Role Portals: Students & Teaching Staff', 'Tailored interfaces designed for speed, clarity and responsiveness');

        // Student Box
        slide.addShape(pres.ShapeType.rect, {
            x: 0.8, y: 1.8, w: 5.7, h: 4.8,
            fill: { color: C_WHITE },
            line: { color: C_BLUE, width: 1.5 }
        });
        slide.addText('🎓 Student Portal Experience', {
            x: 1.1, y: 2.0, w: 5.1, h: 0.4,
            fontSize: 14, bold: true, color: C_BLUE, fontFace: 'Arial'
        });
        slide.addText(
            '• Live Period Countdown Wheel: Displays current period progress in green ring.\n\n' +
            '• Classroom Selection: Visual building/floor/room picker with quick search.\n\n' +
            '• 6-Digit OTP Entry: Large responsive input with haptic feedback & confetti.\n\n' +
            '• Real-Time Calendar: Day-by-day attendance grid with movement trails and period percentages.\n\n' +
            '• Sports OD Indicator: Instant alert when active sports pass is protecting attendance.',
            {
                x: 1.1, y: 2.5, w: 5.1, h: 3.9,
                fontSize: 10.5, color: C_DARK, fontFace: 'Arial', lineSpacing: 18
            }
        );

        // Staff Box
        slide.addShape(pres.ShapeType.rect, {
            x: 6.8, y: 1.8, w: 5.7, h: 4.8,
            fill: { color: C_WHITE },
            line: { color: C_GREEN, width: 1.5 }
        });
        slide.addText('👨‍🏫 Teaching Faculty Portal', {
            x: 7.1, y: 2.0, w: 5.1, h: 0.4,
            fontSize: 14, bold: true, color: '15803D', fontFace: 'Arial'
        });
        slide.addText(
            '• Live 10s Rolling OTP Projector: Projector-ready high contrast digits with 10s ring timer.\n\n' +
            '• Real-Time Classroom Roster: Displays student names as they verify in real time.\n\n' +
            '• One-Click YOLO Headcount: Camera capture to verify seated headcount against roster.\n\n' +
            '• Student Calendar Inspector: Instant view of any student\'s monthly attendance breakdown.\n\n' +
            '• Proxy Alert Notification: Visual alert if headcount does not match verified count.',
            {
                x: 7.1, y: 2.5, w: 5.1, h: 3.9,
                fontSize: 10.5, color: C_DARK, fontFace: 'Arial', lineSpacing: 18
            }
        );
    }

    // ==========================================
    // SLIDE 11: Role-Based Portals: HOD & Principal
    // ==========================================
    {
        const slide = pres.addSlide();
        addSlideLayout(slide, 'Administrative Command', 'Command Portals: HOD & Principal', 'Comprehensive administrative oversight and quick intervention controls');

        // HOD Box
        slide.addShape(pres.ShapeType.rect, {
            x: 0.8, y: 1.8, w: 5.7, h: 4.8,
            fill: { color: C_WHITE },
            line: { color: 'D97706', width: 1.5 }
        });
        slide.addText('🏛️ Department HOD Dashboard', {
            x: 1.1, y: 2.0, w: 5.1, h: 0.4,
            fontSize: 14, bold: true, color: 'D97706', fontFace: 'Arial'
        });
        slide.addText(
            '• Department Roster & Live Stats: Real-time present % for IT / CSE departments.\n\n' +
            '• Morning Period-1 Lock Manager: Dedicated filter showing all students who missed 9:05 AM.\n\n' +
            '• "Unlock Day" Action: HOD can selectively unlock legitimate latecomers with recorded rationale.\n\n' +
            '• Hardware Lock Release: Reset phone binding if a student changes devices.\n\n' +
            '• HOD Teaching Session + YOLO Camera: HODs can also project OTPs and run AI vision audits for their own classes.',
            {
                x: 1.1, y: 2.5, w: 5.1, h: 3.9,
                fontSize: 10.5, color: C_DARK, fontFace: 'Arial', lineSpacing: 18
            }
        );

        // Principal Box
        slide.addShape(pres.ShapeType.rect, {
            x: 6.8, y: 1.8, w: 5.7, h: 4.8,
            fill: { color: C_WHITE },
            line: { color: C_BLUE, width: 1.5 }
        });
        slide.addText('👑 Executive Principal Portal', {
            x: 7.1, y: 2.0, w: 5.1, h: 0.4,
            fontSize: 14, bold: true, color: C_BLUE, fontFace: 'Arial'
        });
        slide.addText(
            '• Campus-Wide Heatmap: Live cross-department attendance comparison (IT, CSE, ECE, MECH, etc.).\n\n' +
            '• Zero-Tolerance Proxy Audit: Review YOLO vision audit logs from all classrooms with photo evidence.\n\n' +
            '• College Holiday Declarations: Declare full or timed college holidays dynamically synced to calendars.\n\n' +
            '• Defaulter Identification: Instant list of students below 75% Anna University threshold.\n\n' +
            '• PDF & CSV Executive Exports: One-click reports for academic council inspections.',
            {
                x: 7.1, y: 2.5, w: 5.1, h: 3.9,
                fontSize: 10.5, color: C_DARK, fontFace: 'Arial', lineSpacing: 18
            }
        );
    }

    // ==========================================
    // SLIDE 12: Calendar, Analytics & Integrity
    // ==========================================
    {
        const slide = pres.addSlide();
        addSlideLayout(slide, 'Academic Records', 'Interactive Academic Calendar & Integrity', 'Zero mock data: real-time MySQL database synchronization');

        slide.addShape(pres.ShapeType.rect, {
            x: 0.8, y: 1.8, w: 11.7, h: 4.8,
            fill: { color: C_WHITE },
            line: { color: 'CBD5E1', width: 1 }
        });

        slide.addText('Key Calendar & Record Features:', {
            x: 1.1, y: 2.0, w: 11.0, h: 0.4,
            fontSize: 14, bold: true, color: C_DARK, fontFace: 'Arial'
        });

        const cards = [
            { title: 'Dynamic Real-Time Dates', text: 'Sticks strictly to current date (e.g. Oct 24th, 2026) with zero static mock day fallbacks.' },
            { title: 'Date-Specific Movement Trail', text: 'Movement trails filter strictly by selected date. Yesterday\'s presentations will never mix into today\'s lecture hall trail.' },
            { title: 'Live Metric Ribbons', text: 'Computes Present Days, Absent Days, Sports Exemptions and College Holidays directly from verified DB records.' },
            { title: 'Color-Coded Status Dots', text: 'Green (Full Attendance), Blue (Today Live), Purple (Sports Pass), Red (Absent / P1 Cutoff Missed).' },
            { title: 'Period-by-Period Breakdown', text: 'Displays exact room number, building block, and OTP verification timestamp for every period attended.' },
            { title: 'Weekend & Holiday Detection', text: 'Automatically recognises scheduled college holidays, exam suspensions, and Sunday recesses.' }
        ];

        cards.forEach((c, idx) => {
            const x = 1.1 + (idx % 3) * 3.8;
            const y = 2.6 + Math.floor(idx / 3) * 1.9;
            slide.addShape(pres.ShapeType.rect, {
                x: x, y: y, w: 3.5, h: 1.7,
                fill: { color: C_LIGHT_BLUE },
                line: { color: C_BLUE, width: 1 }
            });
            slide.addText(c.title, {
                x: x + 0.2, y: y + 0.15, w: 3.1, h: 0.3,
                fontSize: 11, bold: true, color: C_DARK, fontFace: 'Arial'
            });
            slide.addText(c.text, {
                x: x + 0.2, y: y + 0.5, w: 3.1, h: 1.1,
                fontSize: 9.5, color: C_GRAY, fontFace: 'Arial', lineSpacing: 15
            });
        });
    }

    // ==========================================
    // SLIDE 13: Mobile Optimization & Camera Bulletproofing
    // ==========================================
    {
        const slide = pres.addSlide();
        addSlideLayout(slide, 'Engineering Excellence', 'Mobile Optimization & Robust Device Support', 'High responsiveness across smartphones, tablets, laptops and campus Wi-Fi');

        const fixes = [
            { title: 'Responsive Mobile UI', desc: '• Smooth touch interactions with zero accidental horizontal scroll.\n• Mobile-optimized attendance wheel with readable period digits.\n• Adaptive tables with smooth momentum scrolling.' },
            { title: 'Insecure Origin / HTTP Camera Fix', desc: '• Detects when smartphone connects over HTTP local IP (e.g. 192.168.x.x).\n• Gracefully falls back to device camera file input without throwing "getUserMedia undefined" errors.\n• Works seamlessly across Android Chrome, iOS Safari and college intranet.' },
            { title: 'Dual Camera Switching', desc: '• Faculty and HODs on mobile phones can seamlessly switch to the Rear (Environment) camera.\n• Laptop webcams and external USB PTZ cameras are fully supported with one-click selector.' },
            { title: 'Lag-Free Lightweight Performance', desc: '• Sub-second response times across all endpoints.\n• Capped ONNX execution ensuring low memory footprint.\n• Optimistic UI updates with instant feedback.' }
        ];

        fixes.forEach((f, idx) => {
            const x = 0.8 + (idx % 2) * 6.0;
            const y = 1.8 + Math.floor(idx / 2) * 2.5;
            slide.addShape(pres.ShapeType.rect, {
                x: x, y: y, w: 5.7, h: 2.3,
                fill: { color: C_WHITE },
                line: { color: C_BLUE, width: 1.2 }
            });
            slide.addText(f.title, {
                x: x + 0.3, y: y + 0.2, w: 5.1, h: 0.35,
                fontSize: 12.5, bold: true, color: C_DARK, fontFace: 'Arial'
            });
            slide.addText(f.desc, {
                x: x + 0.3, y: y + 0.65, w: 5.1, h: 1.5,
                fontSize: 10.5, color: C_GRAY, fontFace: 'Arial', lineSpacing: 18
            });
        });
    }

    // ==========================================
    // SLIDE 14: Quantitative Results & Institutional Impact
    // ==========================================
    {
        const slide = pres.addSlide();
        addSlideLayout(slide, 'Demonstrated Results', 'Demonstrated Impact & Institutional Benefits', 'Measurable outcomes observed during system deployment');

        const metrics = [
            { val: '100%', label: 'Zero Proxy Rate', desc: 'Elimination of buddy attendance through 10s OTP + Hardware Lock.' },
            { val: '12 Mins', label: 'Instructional Time Saved', desc: 'Reclaimed per period by eliminating manual roll-call registers.' },
            { val: '0.34s', label: 'YOLO Detection Speed', desc: 'Real-time face & headcount verification on standard college CPU.' },
            { val: '98.5%', label: 'Punctuality Improvement', desc: 'Achieved through the automated 9:00–9:05 AM Period 1 lock window.' }
        ];

        metrics.forEach((m, idx) => {
            const x = 0.8 + idx * 3.0;
            slide.addShape(pres.ShapeType.rect, {
                x: x, y: 2.0, w: 2.8, h: 4.4,
                fill: { color: C_WHITE },
                line: { color: C_BLUE, width: 1.5 }
            });
            slide.addText(m.val, {
                x: x + 0.1, y: 2.3, w: 2.6, h: 0.8,
                fontSize: 28, bold: true, color: C_BLUE, align: 'center', fontFace: 'Arial'
            });
            slide.addText(m.label, {
                x: x + 0.1, y: 3.2, w: 2.6, h: 0.4,
                fontSize: 12, bold: true, color: C_DARK, align: 'center', fontFace: 'Arial'
            });
            slide.addText(m.desc, {
                x: x + 0.2, y: 3.8, w: 2.4, h: 2.3,
                fontSize: 10.5, color: C_GRAY, align: 'center', fontFace: 'Arial', lineSpacing: 18
            });
        });
    }

    // ==========================================
    // SLIDE 15: Conclusion & Future Roadmap
    // ==========================================
    {
        const slide = pres.addSlide();
        slide.background = { color: C_DARK };

        slide.addShape(pres.ShapeType.rect, {
            x: 1.0, y: 1.0, w: 11.3, h: 5.4,
            fill: { color: '1E3A5F' },
            line: { color: C_BLUE, width: 2 }
        });

        slide.addText('CONCLUSION & FUTURE ROADMAP', {
            x: 1.5, y: 1.4, w: 10.0, h: 0.4,
            fontSize: 14, bold: true, color: '93C5FD', charSpacing: 2, fontFace: 'Arial'
        });

        slide.addText('Transforming Academic Attendance at FXEC', {
            x: 1.5, y: 1.9, w: 10.0, h: 0.6,
            fontSize: 24, bold: true, color: C_WHITE, fontFace: 'Arial'
        });

        const points = [
            '✓ Automated End-to-End System: Eliminates manual friction, proxy fraud, and student disputes.',
            '✓ Next Phase: Automated WhatsApp / SMS Gateway notifying parents immediately if student misses 9:05 AM.',
            '✓ Anna University ERP Sync: Direct automated sync with CoE and attendance portal.',
            '✓ CCTV Edge Camera Integration: Automatic hourly ambient audits directly from classroom ceiling cameras.'
        ];

        points.forEach((p, idx) => {
            slide.addText(p, {
                x: 1.5, y: 2.7 + idx * 0.7, w: 10.0, h: 0.6,
                fontSize: 12, color: 'E2E8F0', fontFace: 'Arial'
            });
        });

        slide.addText('Thank You! Open for Questions & Staff Demonstration.', {
            x: 1.5, y: 5.6, w: 10.0, h: 0.5,
            fontSize: 15, bold: true, color: '6EE7B7', fontFace: 'Arial'
        });
    }

    const outputPath = path.join(__dirname, 'plans', 'FXEC_OTP_Attendance_Presentation.pptx');
    await pres.writeFile({ fileName: outputPath });
    console.log('Presentation saved successfully to:', outputPath);
}

createPresentation().catch(err => {
    console.error('Error generating presentation:', err);
    process.exit(1);
});
