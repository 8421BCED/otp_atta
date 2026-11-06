import React, { useState, useEffect } from 'react';
import { Users, RotateCcw, Calendar, CheckCircle2, Search, Building2, Clock, Lock, Unlock, Eye, Sparkles, QrCode, RefreshCw, DoorOpen, Radio, AlertTriangle, ShieldCheck, Camera, Trophy, Plus, X, Trash2, ArrowRight } from 'lucide-react';
import { RoomStudentsModal } from './RoomStudentsModal';
import { AttendanceCalendarModal } from './AttendanceCalendarModal';
import { StudentDetailsModal } from './StudentDetailsModal';
import { RoomSelectionModal } from './RoomSelectionModal';
import { ClassroomHeadcountModal } from './ClassroomHeadcountModal';
import { StaffMovementModal } from './StaffMovementModal';
import { LeaveReviewModal } from './LeaveReviewModal';

export const HODDashboard = ({ currentUser, hierarchy }) => {
    const department = currentUser?.department || 'IT';

    // Primary Tab State for HOD Workspace
    const [mainTab, setMainTab] = useState('overview'); // 'overview' | 'leave_requests' | 'teaching' | 'lockouts'

    // Dedicated Leave & OD State
    const [hodLeaveRequests, setHodLeaveRequests] = useState([]);
    const [isHodLeaveLoading, setIsHodLeaveLoading] = useState(false);
    const [hodLeaveFilter, setHodLeaveFilter] = useState('pending'); // 'pending' | 'all'
    const [hodActionRemarks, setHodActionRemarks] = useState({});
    const [hodDecisionNotice, setHodDecisionNotice] = useState(null);
    const [isProcessingDecision, setIsProcessingDecision] = useState(false);

    const [overview, setOverview] = useState(null);
    const [students, setStudents] = useState([]);
    const [dayLockedStudents, setDayLockedStudents] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterTab, setFilterTab] = useState('all'); // 'all' | 'day_locked' | 'device_locked'
    const [resetNotice, setResetNotice] = useState(null);
    const [unlockNotice, setUnlockNotice] = useState(null);

    // Active room popup state
    const [selectedActiveRoom, setSelectedActiveRoom] = useState(null);

    // Student Calendar Modal state
    const [selectedStudentForCalendar, setSelectedStudentForCalendar] = useState(null);

    // Inspected student modal state
    const [inspectedStudentId, setInspectedStudentId] = useState(null);

    // HOD Self Teaching Calendar state
    const [isHodCalendarOpen, setIsHodCalendarOpen] = useState(false);
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

    // HOD Faculty Teaching Session & Live OTP State
    const [teachingRoomId, setTeachingRoomId] = useState(null);
    const [isTeachingRoomModalOpen, setIsTeachingRoomModalOpen] = useState(false);
    const [teachingOtp, setTeachingOtp] = useState('------');
    const [teachingSecondsLeft, setTeachingSecondsLeft] = useState(10);
    const [teachingAutoRegen, setTeachingAutoRegen] = useState(true);
    const [isGeneratingTeachingOtp, setIsGeneratingTeachingOtp] = useState(false);
    const [teachingRoomInfo, setTeachingRoomInfo] = useState(null);
    const [teachingPresentCount, setTeachingPresentCount] = useState(0);
    const [teachingRoomStudents, setTeachingRoomStudents] = useState([]);
    const [isHeadcountModalOpen, setIsHeadcountModalOpen] = useState(false);
    const [latestAudit, setLatestAudit] = useState(null);

    // HOD On-Duty (OD) Pass Management State (Department / Hackathon / Symposium / Project OD)
    const [hodOdPasses, setHodOdPasses] = useState([]);
    const [isOdModalOpen, setIsOdModalOpen] = useState(false);
    const [odEventName, setOdEventName] = useState('');
    const [odCategory, setOdCategory] = useState('Department Hackathon');
    const [odVenue, setOdVenue] = useState('FXEC Campus / External Venue');
    const [odFromDate, setOdFromDate] = useState(new Date().toISOString().slice(0, 10));
    const [odToDate, setOdToDate] = useState(new Date().toISOString().slice(0, 10));
    const [odIsAllDay, setOdIsAllDay] = useState(true);
    const [odFromPeriod, setOdFromPeriod] = useState(1);
    const [odToPeriod, setOdToPeriod] = useState(7);
    const [odReason, setOdReason] = useState('');
    const [odSearchStudent, setOdSearchStudent] = useState('');
    const [odSelectedStudents, setOdSelectedStudents] = useState([]);
    const [odIsSubmitting, setOdIsSubmitting] = useState(false);
    const [odNotice, setOdNotice] = useState(null);

    // Holiday & Timed Event Exemption declaration state
    const [holidayTitle, setHolidayTitle] = useState('');
    const [holidayDate, setHolidayDate] = useState('');
    const [holidayReason, setHolidayReason] = useState('Department Institutional Event');
    const [isTimed, setIsTimed] = useState(false);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('12:30');
    const [holidayNotice, setHolidayNotice] = useState(null);

    // Fetch Student Leave & OD Requisitions for HOD Department
    const loadHodLeaveRequests = async () => {
        setIsHodLeaveLoading(true);
        try {
            const token = localStorage.getItem('fxec_token');
            const res = await fetch(`/api/leave/hod-requests?department=${department}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.requests) {
                setHodLeaveRequests(data.requests);
            }
        } catch (e) {
            console.error('Failed to load HOD leave requests:', e);
        } finally {
            setIsHodLeaveLoading(false);
        }
    };

    useEffect(() => {
        loadHodLeaveRequests();
    }, [department]);

    // Handle HOD Final Sanction or Rejection
    const handleHodDecisionAction = async (applicationId, action) => {
        setIsProcessingDecision(true);
        setHodDecisionNotice(null);
        try {
            const token = localStorage.getItem('fxec_token');
            const customRemark = hodActionRemarks[applicationId] || '';
            const res = await fetch('/api/leave/hod-review', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    applicationId,
                    action,
                    remarks: customRemark.trim() || (action === 'approve' ? 'Sanctioned by HOD with 100% On-Duty Attendance Credit.' : 'Application rejected by HOD.')
                })
            });
            const data = await res.json();
            if (res.ok) {
                setHodDecisionNotice({ 
                    type: 'success', 
                    text: data.message || `Application ${action === 'approve' ? 'sanctioned with OD credit' : 'rejected'} successfully.` 
                });
                loadHodLeaveRequests();
                loadHODData();
                setTimeout(() => setHodDecisionNotice(null), 4500);
            } else {
                setHodDecisionNotice({ type: 'error', text: data.error || 'Failed to process application.' });
            }
        } catch (e) {
            setHodDecisionNotice({ type: 'error', text: 'Server connection error.' });
        } finally {
            setIsProcessingDecision(false);
        }
    };

    // Generate 10-Second OTP for HOD's Teaching Room
    const generateTeachingOtp = async () => {
        if (!teachingRoomId) return;
        setIsGeneratingTeachingOtp(true);
        try {
            const token = localStorage.getItem('fxec_token');
            const res = await fetch('/api/attendance/generate-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    roomId: teachingRoomId,
                    periodId: 1
                })
            });
            const data = await res.json();
            if (data.otpCode) {
                setTeachingOtp(data.otpCode);
                setTeachingSecondsLeft(10);
            }
        } catch (e) {
            console.error('Failed to generate HOD teaching OTP:', e);
        } finally {
            setIsGeneratingTeachingOtp(false);
        }
    };

    // HOD 10s Timer Countdown
    useEffect(() => {
        if (!teachingRoomId) return;
        const timer = setInterval(() => {
            setTeachingSecondsLeft(prev => {
                if (prev <= 1) {
                    if (teachingAutoRegen) {
                        generateTeachingOtp();
                    }
                    return 10;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [teachingRoomId, teachingAutoRegen]);

    // Live Teaching Room Roster Polling
    const fetchTeachingRoster = async () => {
        if (!teachingRoomId) return;
        try {
            const token = localStorage.getItem('fxec_token');
            const res = await fetch(`/api/attendance/room-live-roster/${teachingRoomId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.room) {
                setTeachingRoomInfo(data.room);
                setTeachingPresentCount(data.presentCount || 0);
                setTeachingRoomStudents(data.students || []);
            }
        } catch (e) {
            console.error('Failed to fetch teaching room roster:', e);
        }
    };

    const fetchLatestAudit = async (roomId) => {
        if (!roomId) {
            setLatestAudit(null);
            return;
        }
        try {
            const token = localStorage.getItem('fxec_token');
            const res = await fetch(`/api/attendance/latest-room-audit/${roomId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.hasAudit && data.audit) {
                setLatestAudit(data.audit);
            } else {
                setLatestAudit(null);
            }
        } catch (e) {
            console.error('Failed to fetch latest audit for HOD room:', e);
        }
    };

    useEffect(() => {
        if (teachingRoomId) {
            generateTeachingOtp();
            fetchTeachingRoster();
            fetchLatestAudit(teachingRoomId);
            const poll = setInterval(() => {
                fetchTeachingRoster();
                fetchLatestAudit(teachingRoomId);
            }, 2000);
            return () => clearInterval(poll);
        } else {
            setTeachingOtp('------');
            setTeachingRoomInfo(null);
            setTeachingPresentCount(0);
            setTeachingRoomStudents([]);
            setLatestAudit(null);
        }
    }, [teachingRoomId]);

    const loadHodOdPasses = async () => {
        try {
            const res = await fetch('/api/sports/passes');
            const data = await res.json();
            if (res.ok) {
                setHodOdPasses(data.passes || []);
            }
        } catch (e) {
            console.error('Failed to load OD passes:', e);
        }
    };

    const loadHODData = async () => {
        try {
            const token = localStorage.getItem('fxec_token');
            const [resOverview, resStudents, resLocked] = await Promise.all([
                fetch('/api/hod/overview', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`/api/hod/students?q=${encodeURIComponent(searchQuery)}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/hod/locked-students', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            const dataOverview = await resOverview.json();
            const dataStudents = await resStudents.json();
            const dataLocked = await resLocked.json();

            setOverview(dataOverview);
            setStudents(dataStudents.students || []);
            setDayLockedStudents(dataLocked.lockedStudents || []);
            loadHodOdPasses();
        } catch (e) {
            console.error('Failed to load HOD data:', e);
        }
    };

    useEffect(() => {
        loadHODData();
    }, [searchQuery]);

    // Handle Create HOD OD Pass
    const handleCreateHodOdPass = async (e) => {
        e.preventDefault();
        if (!odEventName.trim()) {
            setOdNotice({ type: 'error', text: 'Please enter the OD Event / Project title.' });
            return;
        }
        if (odSelectedStudents.length === 0) {
            setOdNotice({ type: 'error', text: 'Please select at least 1 student for the On-Duty Pass.' });
            return;
        }

        setOdIsSubmitting(true);
        try {
            const payload = {
                event_name: odEventName.trim(),
                sport_category: odCategory,
                venue: odVenue.trim(),
                from_date: odFromDate,
                to_date: odToDate,
                is_all_day: odIsAllDay,
                from_period: odIsAllDay ? 1 : parseInt(odFromPeriod),
                to_period: odIsAllDay ? 7 : parseInt(odToPeriod),
                reason: odReason.trim(),
                student_ids: odSelectedStudents.map(s => ({ id: s.id, notes: s.notes || 'HOD Approved OD' })),
                created_by: currentUser?.id || 1
            };

            const res = await fetch('/api/sports/passes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok) {
                setOdNotice({ type: 'success', text: `OD Pass issued! ${odSelectedStudents.length} students are granted OTP-exemption and On-Duty credit.` });
                setIsOdModalOpen(false);
                setOdEventName('');
                setOdReason('');
                setOdSelectedStudents([]);
                loadHodOdPasses();
                loadHODData();
                setTimeout(() => setOdNotice(null), 5000);
            } else {
                setOdNotice({ type: 'error', text: data.error || 'Failed to issue OD pass' });
            }
        } catch (err) {
            console.error('Failed to issue HOD OD pass:', err);
            setOdNotice({ type: 'error', text: 'Network error issuing OD pass.' });
        } finally {
            setOdIsSubmitting(false);
        }
    };

    const handleDeleteHodOdPass = async (passId) => {
        if (!window.confirm('Are you sure you want to revoke this On-Duty Pass? Enrolled students will no longer be exempt.')) {
            return;
        }
        try {
            const res = await fetch(`/api/sports/passes/${passId}`, { method: 'DELETE' });
            if (res.ok) {
                setOdNotice({ type: 'success', text: 'On-Duty Pass revoked successfully.' });
                loadHodOdPasses();
                loadHODData();
                setTimeout(() => setOdNotice(null), 5000);
            }
        } catch (e) {
            console.error('Failed to revoke pass:', e);
        }
    };

    const handleResetDevice = async (studentId, studentName) => {
        if (!window.confirm(`Take lock back / Reset device lock for ${studentName}? This frees their account so they can register their new device.`)) {
            return;
        }

        try {
            const token = localStorage.getItem('fxec_token');
            const res = await fetch('/api/hod/reset-device-lock', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ studentId })
            });
            const data = await res.json();
            if (data.success) {
                setResetNotice(`Device lock released for ${studentName}. Student can now bind their authorized device on next login.`);
                loadHODData();
                setTimeout(() => setResetNotice(null), 5000);
            }
        } catch (e) {
            console.error('Failed to reset device:', e);
        }
    };

    const handleUnlockStudentDay = async (studentId, studentName) => {
        try {
            const token = localStorage.getItem('fxec_token');
            const res = await fetch('/api/hod/unlock-student-day', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ studentId })
            });
            const data = await res.json();
            if (data.success) {
                setUnlockNotice(data.message || `Day attendance unlocked for ${studentName}!`);
                loadHODData();
                setTimeout(() => setUnlockNotice(null), 6000);
            }
        } catch (e) {
            console.error('Failed to unlock student day:', e);
        }
    };

    const handleRelockStudentDay = async (studentId, studentName) => {
        if (!window.confirm(`Re-lock today's attendance for ${studentName}?`)) return;
        try {
            const token = localStorage.getItem('fxec_token');
            const res = await fetch('/api/hod/relock-student-day', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ studentId })
            });
            const data = await res.json();
            if (data.success) {
                setUnlockNotice(`Day attendance re-locked for ${studentName}.`);
                loadHODData();
                setTimeout(() => setUnlockNotice(null), 6000);
            }
        } catch (e) {
            console.error('Failed to relock student day:', e);
        }
    };

    const handleDeclareHoliday = async (e) => {
        e.preventDefault();
        setHolidayNotice(null);

        if (!holidayTitle || !holidayDate) return;

        try {
            const token = localStorage.getItem('fxec_token');
            const res = await fetch('/api/holidays/declare', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: holidayTitle,
                    holiday_date: holidayDate,
                    scope: 'department',
                    department,
                    reason: holidayReason,
                    is_timed: isTimed ? 1 : 0,
                    start_time: isTimed ? `${startTime}:00` : null,
                    end_time: isTimed ? `${endTime}:00` : null
                })
            });

            const data = await res.json();
            if (res.ok) {
                setHolidayNotice(data.message);
                setHolidayTitle('');
                setHolidayDate('');
                setTimeout(() => setHolidayNotice(null), 5000);
            } else {
                setHolidayNotice(data.message || data.error || 'Failed to save');
            }
        } catch (err) {
            console.error('Holiday declaration error:', err);
        }
    };

    // Day lock lookup map and counts
    const dayLockedMap = new Map(dayLockedStudents.map(st => [st.id, st]));
    const dayLockedPendingCount = dayLockedStudents.filter(st => !st.isHodUnlocked).length;
    const lockedCount = students.filter(st => st.is_locked || st.device_name).length;
    const pendingHodLeaveCount = hodLeaveRequests.filter(r => r.status === 'pending_hod').length;

    // Filter students by active tab
    let displayedStudents = students;
    if (filterTab === 'day_locked') {
        displayedStudents = students.filter(st => dayLockedMap.has(st.id));
    } else if (filterTab === 'device_locked') {
        displayedStudents = students.filter(st => st.is_locked || st.device_name);
    }

    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        displayedStudents = displayedStudents.filter(st => 
            (st.name || '').toLowerCase().includes(q) || 
            (st.email || '').toLowerCase().includes(q) ||
            (st.roll_number || '').toLowerCase().includes(q)
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%' }}>
            
            {/* Top Workspace Navigation Bar for HOD */}
            <div className="hod-main-nav-bar">
                <button
                    type="button"
                    className={`hod-nav-btn ${mainTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setMainTab('overview')}
                >
                    <Building2 size={16} />
                    <span>Department Overview</span>
                </button>

                <button
                    type="button"
                    className={`hod-nav-btn ${mainTab === 'leave_requests' ? 'active' : ''}`}
                    onClick={() => { setMainTab('leave_requests'); loadHodLeaveRequests(); }}
                >
                    <CheckCircle2 size={16} />
                    <span>Student Leave & OD Sanctions</span>
                    {pendingHodLeaveCount > 0 && (
                        <span className="hod-badge-amber">{pendingHodLeaveCount} Pending</span>
                    )}
                </button>

                <button
                    type="button"
                    className={`hod-nav-btn ${mainTab === 'teaching' ? 'active' : ''}`}
                    onClick={() => setMainTab('teaching')}
                >
                    <QrCode size={16} />
                    <span>Teaching Session & OTP</span>
                </button>

                <button
                    type="button"
                    className={`hod-nav-btn ${mainTab === 'lockouts' ? 'active' : ''}`}
                    onClick={() => setMainTab('lockouts')}
                >
                    <Lock size={16} />
                    <span>Student Roster & Lockouts</span>
                    {dayLockedPendingCount > 0 && (
                        <span className="hod-badge-amber">{dayLockedPendingCount}</span>
                    )}
                </button>
            </div>

            {/* TAB 1: STUDENT LEAVE & OD SANCTIONS VIEW */}
            {mainTab === 'leave_requests' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                    {/* Header & Sub-filters */}
                    <div className="fx-card" style={{ padding: '16px 20px' }}>
                        <div className="fx-card-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
                            <div>
                                <div className="fx-card-title" style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <CheckCircle2 size={20} color="var(--blue)" />
                                    <span>Student Leave & On-Duty (OD) Sanctions</span>
                                </div>
                                <div style={{ fontSize: '0.76rem', color: 'var(--text-sub)', marginTop: '2px' }}>
                                    Department of {department} • Student applications endorsed by faculty mentors. Approving grants 100% On-Duty (OD) attendance credit and unlocks missed periods.
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', gap: '6px', background: 'var(--light-blue)', padding: '3px', borderRadius: '8px' }}>
                                    <button
                                        type="button"
                                        className={`role-btn ${hodLeaveFilter === 'pending' ? 'active' : ''}`}
                                        style={{ padding: '6px 12px', fontSize: '0.76rem' }}
                                        onClick={() => setHodLeaveFilter('pending')}
                                    >
                                        Pending Sanction ({pendingHodLeaveCount})
                                    </button>
                                    <button
                                        type="button"
                                        className={`role-btn ${hodLeaveFilter === 'all' ? 'active' : ''}`}
                                        style={{ padding: '6px 12px', fontSize: '0.76rem' }}
                                        onClick={() => setHodLeaveFilter('all')}
                                    >
                                        All Applications ({hodLeaveRequests.length})
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    className="duo-btn duo-btn-slate sm"
                                    onClick={loadHodLeaveRequests}
                                    disabled={isHodLeaveLoading}
                                    title="Refresh applications list"
                                >
                                    <RefreshCw size={13} className={isHodLeaveLoading ? 'spinning' : ''} />
                                    <span>Refresh</span>
                                </button>
                            </div>
                        </div>

                        {hodDecisionNotice && (
                            <div 
                                className={hodDecisionNotice.type === 'success' ? 'aero-alert-success' : 'aero-alert-error'}
                                style={{ marginTop: '12px', fontWeight: 700 }}
                            >
                                {hodDecisionNotice.text}
                            </div>
                        )}
                    </div>

                    {/* Requests List */}
                    {isHodLeaveLoading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
                            Loading applications...
                        </div>
                    ) : (
                        (() => {
                            const filtered = hodLeaveRequests.filter(r => {
                                if (hodLeaveFilter === 'pending') return r.status === 'pending_hod';
                                return true;
                            });

                            if (filtered.length === 0) {
                                return (
                                    <div className="fx-card" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-dim)' }}>
                                        <CheckCircle2 size={36} color="var(--blue)" style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                                        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--dark-blue)' }}>
                                            {hodLeaveFilter === 'pending' ? 'All Clear! No Applications Awaiting Sanction' : 'No Leave or OD Records Found'}
                                        </div>
                                        <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>
                                            {hodLeaveFilter === 'pending' 
                                                ? 'All mentor-endorsed applications have been sanctioned or reviewed.'
                                                : 'When students submit leave or OD requests and mentors endorse them, they will show here.'}
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    {filtered.map(req => {
                                        const isPending = req.status === 'pending_hod';
                                        const isApproved = req.status === 'approved';
                                        const isRejected = req.status === 'rejected';

                                        return (
                                            <div key={req.id} className="hod-leave-card">
                                                <div className="hod-leave-card-top">
                                                    <div className="hod-leave-student-meta">
                                                        <div className="hod-student-name">{req.student_name}</div>
                                                        <div className="hod-student-sub">
                                                            {req.student_email} • Roll: {req.roll_number || 'N/A'} • {req.department} (Year {req.year_of_study || 2})
                                                        </div>
                                                    </div>

                                                    <div>
                                                        {isPending && (
                                                            <span className="count-pill amber" style={{ fontSize: '0.74rem' }}>
                                                                ● Mentor Endorsed • Awaiting HOD
                                                            </span>
                                                        )}
                                                        {isApproved && (
                                                            <span className="count-pill green" style={{ fontSize: '0.74rem' }}>
                                                                ✓ Sanctioned (100% OD Credit)
                                                            </span>
                                                        )}
                                                        {isRejected && (
                                                            <span className="count-pill red" style={{ fontSize: '0.74rem' }}>
                                                                ✕ Rejected by HOD
                                                            </span>
                                                        )}
                                                        {req.status === 'pending_mentor' && (
                                                            <span className="count-pill slate" style={{ fontSize: '0.74rem' }}>
                                                                Awaiting Mentor Endorsement
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Application Meta Details */}
                                                <div className="hod-leave-grid-details">
                                                    <div>
                                                        <span style={{ fontWeight: 700, color: '#152641' }}>Category: </span>
                                                        <span>{req.sub_type || req.type?.toUpperCase()}</span>
                                                    </div>
                                                    <div>
                                                        <span style={{ fontWeight: 700, color: '#152641' }}>Duration: </span>
                                                        <span>{req.from_date?.slice(0, 10)} to {req.to_date?.slice(0, 10)}</span>
                                                    </div>
                                                    <div>
                                                        <span style={{ fontWeight: 700, color: '#152641' }}>Scope: </span>
                                                        <span>{req.is_all_day ? 'Full Day (All 7 Periods)' : `Periods ${req.from_period} - ${req.to_period}`}</span>
                                                    </div>
                                                    {req.event_name && (
                                                        <div>
                                                            <span style={{ fontWeight: 700, color: '#152641' }}>Event / Topic: </span>
                                                            <span>{req.event_name}</span>
                                                        </div>
                                                    )}
                                                    {req.event_venue && (
                                                        <div>
                                                            <span style={{ fontWeight: 700, color: '#152641' }}>Venue: </span>
                                                            <span>{req.event_venue}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Student Reason */}
                                                <div style={{ fontSize: '0.80rem', color: '#152641', background: '#FFFFFF', padding: '10px 14px', borderRadius: '10px', border: '1px solid #E2D9CE' }}>
                                                    <div style={{ fontSize: '0.70rem', fontWeight: 800, color: '#8C827A', textTransform: 'uppercase', marginBottom: '2px' }}>
                                                        Student Reason & Objectives
                                                    </div>
                                                    <div>{req.reason}</div>
                                                </div>

                                                {/* Mentor Endorsement Box */}
                                                <div className="hod-mentor-endorsement-box">
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                                                        <span style={{ fontWeight: 800 }}>Faculty Mentor Endorsement: {req.mentor_name || 'Assigned Mentor'}</span>
                                                        <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>{req.mentor_email}</span>
                                                    </div>
                                                    <div style={{ fontStyle: 'italic', color: '#1E3A8A' }}>
                                                        "{req.mentor_remarks || 'Endorsed and forwarded to HOD for sanction.'}"
                                                    </div>
                                                </div>

                                                {/* HOD Remarks & Action Controls */}
                                                {isPending ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '4px' }}>
                                                        <input
                                                            type="text"
                                                            className="fx-select"
                                                            style={{ width: '100%', fontSize: '0.80rem' }}
                                                            placeholder="Enter HOD sanction remark / instruction (optional)..."
                                                            value={hodActionRemarks[req.id] || ''}
                                                            onChange={(e) => setHodActionRemarks(prev => ({ ...prev, [req.id]: e.target.value }))}
                                                            disabled={isProcessingDecision}
                                                        />
                                                        <div className="hod-leave-actions-row">
                                                            <div style={{ fontSize: '0.74rem', color: '#5A5249' }}>
                                                                Sanctioning automatically grants <b>100% OD attendance credit</b> across target periods and unlocks day locks.
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                                <button
                                                                    type="button"
                                                                    className="hod-btn-reject"
                                                                    onClick={() => handleHodDecisionAction(req.id, 'reject')}
                                                                    disabled={isProcessingDecision}
                                                                >
                                                                    <span>Reject</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="hod-btn-sanction"
                                                                    onClick={() => handleHodDecisionAction(req.id, 'approve')}
                                                                    disabled={isProcessingDecision}
                                                                >
                                                                    <CheckCircle2 size={15} />
                                                                    <span>Sanction (Grant OD Credit)</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div style={{ fontSize: '0.76rem', color: '#5A5249', background: '#F8FAFC', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                                        <span style={{ fontWeight: 700 }}>HOD Decision Note: </span>
                                                        <span>{req.hod_remarks || (isApproved ? 'Approved by HOD' : 'Rejected by HOD')}</span>
                                                        {req.hod_reviewed_at && (
                                                            <span style={{ marginLeft: '10px', color: '#94A3B8' }}>
                                                                ({new Date(req.hod_reviewed_at).toLocaleDateString()})
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()
                    )}
                </div>
            )}

            {/* TAB 2: OVERVIEW */}
            {mainTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%' }}>
                    {/* Amber Alert Banner for Pending Leave / OD Sanctions */}
                    {pendingHodLeaveCount > 0 && (
                        <div className="hod-pending-alert-banner">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span className="hod-ping-circle" />
                                <div>
                                    <div style={{ fontWeight: 800, color: '#92400E', fontSize: '0.94rem' }}>
                                        {pendingHodLeaveCount} Student Leave / On-Duty Application{pendingHodLeaveCount > 1 ? 's' : ''} Endorsed by Mentors
                                    </div>
                                    <div style={{ fontSize: '0.74rem', color: '#B45309', marginTop: '2px' }}>
                                        Waiting for your sanction to automatically grant 100% OD attendance credit and unblock timetable periods.
                                    </div>
                                </div>
                            </div>
                            <button 
                                type="button" 
                                className="hod-alert-action-btn"
                                onClick={() => { setMainTab('leave_requests'); loadHodLeaveRequests(); }}
                            >
                                <span>Review & Sanction Now</span>
                                <ArrowRight size={14} />
                            </button>
                        </div>
                    )}

                    {/* KPI Cards */}
                    <div className="dashboard-grid-tri">
                        <div className="fx-card">
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>Department of {department}</div>
                            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--dark-blue)' }}>
                                {overview?.totalStudents || 0}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Total Enrolled Students</div>
                        </div>

                        <div className="fx-card">
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>Present Today</div>
                            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--blue)' }}>
                                {overview?.presentToday || 0}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>In Attendance ({overview?.attendanceRate || 0}%)</div>
                        </div>

                        <div className="fx-card">
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>Active Rooms</div>
                            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--blue)' }}>
                                {overview?.roomDistribution?.length || 0}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Tap room below to view students</div>
                        </div>
                    </div>

                    {/* Quick Navigation Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                        <div 
                            className="fx-card" 
                            style={{ padding: '16px', cursor: 'pointer', border: '1.5px solid #E2D9CE' }}
                            onClick={() => { setMainTab('leave_requests'); loadHodLeaveRequests(); }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#152641' }}>
                                    <CheckCircle2 size={18} color="var(--blue)" />
                                    <span>Leave & OD Sanctions</span>
                                </div>
                                {pendingHodLeaveCount > 0 ? (
                                    <span className="hod-badge-amber">{pendingHodLeaveCount} Pending</span>
                                ) : (
                                    <span className="count-pill green" style={{ fontSize: '0.68rem' }}>Up to date</span>
                                )}
                            </div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-sub)' }}>
                                Review and sanction student leave applications and off-campus OD requests endorsed by faculty mentors.
                            </div>
                        </div>

                        <div 
                            className="fx-card" 
                            style={{ padding: '16px', cursor: 'pointer', border: '1.5px solid #E2D9CE' }}
                            onClick={() => setMainTab('teaching')}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#152641' }}>
                                    <QrCode size={18} color="var(--blue)" />
                                    <span>Teaching Session & OTP</span>
                                </div>
                                <span className="count-pill blue" style={{ fontSize: '0.68rem' }}>10s OTP Broadcast</span>
                            </div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-sub)' }}>
                                Broadcast rolling classroom OTP for your lecture and verify live seated students with AI Headcount.
                            </div>
                        </div>

                        <div 
                            className="fx-card" 
                            style={{ padding: '16px', cursor: 'pointer', border: '1.5px solid #E2D9CE' }}
                            onClick={() => setMainTab('lockouts')}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#152641' }}>
                                    <Lock size={18} color="#DC2626" />
                                    <span>Student Roster & Lockouts</span>
                                </div>
                                {dayLockedPendingCount > 0 && (
                                    <span className="hod-badge-amber">{dayLockedPendingCount} Locked</span>
                                )}
                            </div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-sub)' }}>
                                Manage morning/lunch cutoff locked students and reset bound devices for replacement phones.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: HOD Faculty Teaching Session & Live Classroom OTP Generator */}
            {mainTab === 'teaching' && (
                <div className="fx-card" style={{ padding: '18px 20px', border: '1.5px solid rgba(19, 108, 252, 0.25)' }}>
                <div className="fx-card-header" style={{ marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <div className="fx-card-title" style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <QrCode size={20} color="var(--blue)" />
                            <span>HOD Faculty Teaching Session & Live Classroom OTP</span>
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-sub)', marginTop: '2px' }}>
                            Department of {department} • Select your classroom to generate the 5-min attendance window OTP & manage student On-Duty passes.
                        </div>
                    </div>
                    
                    {/* Sleek Duolingo-Style Action Toolbar */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button 
                            type="button" 
                            className="duo-btn duo-btn-green sm"
                            onClick={() => setIsLeaveModalOpen(true)}
                            title="Review and Sanction Student Leave Applications (Automatically grants 100% OD attendance credit)"
                        >
                            <CheckCircle2 size={14} />
                            <span>Sanction Leave & OD</span>
                        </button>
                        <button 
                            type="button" 
                            className="duo-btn duo-btn-amber sm"
                            onClick={() => setIsOdModalOpen(true)}
                            title="Issue official On-Duty (OD) Pass for Hackathons, Symposiums, or Projects"
                        >
                            <Trophy size={14} />
                            <span>+ Issue OD Pass ({hodOdPasses.length})</span>
                        </button>
                        <button 
                            type="button" 
                            className="duo-btn duo-btn-slate sm"
                            onClick={() => setIsHodCalendarOpen(true)}
                            title="View your personal teaching calendar and location history"
                        >
                            <Calendar size={14} color="var(--blue)" />
                            <span>My Teaching Calendar</span>
                        </button>
                        <button 
                            type="button" 
                            className="duo-btn duo-btn-blue sm"
                            onClick={() => setIsTeachingRoomModalOpen(true)}
                            title="Select Building, Floor and Room to start live OTP broadcast"
                        >
                            <DoorOpen size={14} />
                            <span>{teachingRoomId ? 'Change Room / Lab' : 'Select Classroom'}</span>
                        </button>
                    </div>
                </div>

                {teachingRoomId ? (
                    <div>
                        {/* Selected Room Location Banner */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--light-blue)', padding: '10px 14px', borderRadius: '10px', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Radio size={18} color="var(--blue)" />
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontWeight: 800, color: 'var(--dark-blue)', fontSize: '0.96rem' }}>
                                            {teachingRoomInfo?.building_name || 'Dr. APJ Abdul Kalam Block'}
                                        </span>
                                        <span className="room-badge">Room {teachingRoomInfo ? teachingRoomInfo.room_number : teachingRoomId}</span>
                                    </div>
                                    <div style={{ fontSize: '0.74rem', color: 'var(--text-sub)', marginTop: '2px' }}>
                                        {teachingRoomInfo?.floor_name || '2nd Floor'} • {teachingRoomInfo?.name || 'Classroom / Lab'} (Dept of {department})
                                    </div>
                                </div>
                            </div>
                            <span className="count-pill green" style={{ fontSize: '0.72rem' }}>
                                Live Session Broadcasting
                            </span>
                        </div>

                        {/* Split Grid: OTP Box + Roster Table */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
                            {/* 10s Rolling OTP */}
                            <div className="fx-card" style={{ textAlign: 'center', alignItems: 'center', background: '#F8FAFC', padding: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '10px' }}>
                                    <span style={{ fontWeight: 800, color: 'var(--dark-blue)', fontSize: '0.88rem' }}>10-Second Rolling Code</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>Auto-Refresh</span>
                                        <input 
                                            type="checkbox" 
                                            checked={teachingAutoRegen} 
                                            onChange={(e) => setTeachingAutoRegen(e.target.checked)} 
                                            style={{ cursor: 'pointer', width: '13px', height: '13px' }}
                                        />
                                    </div>
                                </div>

                                <div className="otp-hero-box" style={{ width: '100%', margin: 0 }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)', textTransform: 'uppercase' }}>
                                        Broadcast Code for Room {teachingRoomInfo ? teachingRoomInfo.room_number : teachingRoomId}
                                    </div>
                                    <div className="otp-display-digits" style={{ fontSize: '2.4rem', margin: '6px 0' }}>
                                        {teachingOtp}
                                    </div>

                                    {/* Circular Timer */}
                                    <div className="timer-circular-wrap" style={{ margin: '8px auto' }}>
                                        <svg className="timer-svg" viewBox="0 0 90 90">
                                            <circle className="timer-circle-bg" cx="45" cy="45" r="40" />
                                            <circle 
                                                className="timer-circle-progress" 
                                                cx="45" cy="45" r="40"
                                                style={{
                                                    strokeDasharray: '251.2',
                                                    strokeDashoffset: 251.2 - (251.2 * teachingSecondsLeft) / 10,
                                                    stroke: teachingSecondsLeft <= 3 ? '#EF4444' : 'var(--blue)'
                                                }}
                                            />
                                        </svg>
                                        <div className="timer-seconds-label" style={{ color: teachingSecondsLeft <= 3 ? '#DC2626' : 'var(--dark-blue)' }}>
                                            {teachingSecondsLeft}s
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.74rem', color: 'var(--text-sub)' }}>
                                        Regenerates every 10 seconds (Strict Anti-Proxy Lock)
                                    </div>
                                </div>

                                <button 
                                    className="fx-btn-outline" 
                                    onClick={generateTeachingOtp}
                                    disabled={isGeneratingTeachingOtp}
                                    style={{ marginTop: '10px', fontSize: '0.78rem' }}
                                >
                                    <RefreshCw size={13} className={isGeneratingTeachingOtp ? 'spin-icon' : ''} />
                                    Generate Fresh OTP
                                </button>
                            </div>

                            {/* Live Students Roster */}
                            <div className="fx-card" style={{ background: '#F8FAFC', padding: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                                    <span style={{ fontWeight: 800, color: 'var(--dark-blue)', fontSize: '0.88rem' }}>
                                        Live Classroom Roster ({teachingPresentCount} Checked-in)
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setIsHeadcountModalOpen(true)}
                                            className="aero-gloss-btn"
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '5px 12px',
                                                fontSize: '0.74rem',
                                                background: latestAudit 
                                                    ? (latestAudit.match_status === 'verified' ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)')
                                                    : 'linear-gradient(135deg, #136CFC 0%, #0B3064 100%)',
                                                color: '#FFF',
                                                border: 'none',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontWeight: 700
                                            }}
                                            title="Capture/Upload classroom photo and run YOLO AI face headcount to detect proxy submissions"
                                        >
                                            <Camera size={14} />
                                            <span>{latestAudit ? 'AI Audit Active' : 'AI Headcount (YOLO)'}</span>
                                        </button>
                                        <span className="aero-pill green" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                                            Room {teachingRoomInfo ? teachingRoomInfo.room_number : teachingRoomId}
                                        </span>
                                    </div>
                                </div>

                                {latestAudit && (
                                    <div 
                                        style={{
                                            margin: '4px 0 10px 0',
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            background: latestAudit.match_status === 'verified' ? '#F0FDF4' : '#FEF2F2',
                                            border: `1.5px solid ${latestAudit.match_status === 'verified' ? '#86EFAC' : '#FCA5A5'}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            flexWrap: 'wrap',
                                            gap: '8px',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => setIsHeadcountModalOpen(true)}
                                        title="Click to view full YOLO face detection photo and box overlays"
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{
                                                width: '28px',
                                                height: '28px',
                                                borderRadius: '6px',
                                                background: latestAudit.match_status === 'verified' ? '#16A34A' : '#DC2626',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#FFF'
                                            }}>
                                                <Camera size={14} />
                                            </div>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: latestAudit.match_status === 'verified' ? '#15803D' : '#991B1B' }}>
                                                        AI YOLO Snapshot
                                                    </span>
                                                    <span style={{ fontSize: '0.64rem', padding: '1px 5px', borderRadius: '4px', background: latestAudit.match_status === 'verified' ? '#DCFCE7' : '#FEE2E2', color: latestAudit.match_status === 'verified' ? '#166534' : '#991B1B', fontWeight: 800 }}>
                                                        {latestAudit.match_status === 'verified' ? 'MATCH' : 'DISCREPANCY'}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: latestAudit.match_status === 'verified' ? '#14532D' : '#7F1D1D' }}>
                                                    {latestAudit.visual_count} Seated Detected vs {latestAudit.otp_count} OTPs Verified
                                                </div>
                                            </div>
                                        </div>
                                        <span style={{ fontSize: '0.66rem', color: 'var(--text-sub)' }}>Valid 1 hour</span>
                                    </div>
                                )}

                                <div className="fx-table-container" style={{ maxHeight: '230px' }}>
                                    <table className="fx-table">
                                        <thead>
                                            <tr>
                                                <th>Official Email</th>
                                                <th>Student Name</th>
                                                <th>Time</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {teachingRoomStudents.length > 0 ? (
                                                teachingRoomStudents.map((st, idx) => (
                                                    <tr key={idx}>
                                                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#93C5FD' }}>
                                                            {st.email}
                                                        </td>
                                                        <td style={{ fontWeight: 600, color: '#FFF' }}>
                                                            {st.name}
                                                        </td>
                                                        <td style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                                                            {st.marked_at ? new Date(st.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                                                        </td>
                                                        <td>
                                                            <span className="status-tag present">Present</span>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                                                        No students have checked into Room {teachingRoomInfo ? teachingRoomInfo.room_number : teachingRoomId} yet.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: '28px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <div className="aero-badge-circle" style={{ width: '52px', height: '52px', background: '#FEF3C7', color: '#D97706', border: '1px solid #FCD34D' }}>
                            <DoorOpen size={24} />
                        </div>
                        <div style={{ fontWeight: 800, color: 'var(--dark-blue)', fontSize: '1.02rem' }}>
                            Classroom Location Required to Generate OTP
                        </div>
                        <p style={{ fontSize: '0.80rem', color: 'var(--text-sub)', maxWidth: '380px', margin: 0, lineHeight: 1.45 }}>
                            HODs can teach courses and broadcast live OTPs to students. To unlock the rolling OTP and live student roster, select your teaching Building, Floor, and Room.
                        </p>
                        <button 
                            type="button" 
                            className="aero-gloss-btn" 
                            onClick={() => setIsTeachingRoomModalOpen(true)}
                            style={{ width: 'auto', padding: '9px 20px', marginTop: '4px' }}
                        >
                            <DoorOpen size={15} style={{ marginRight: '6px' }} />
                            <span>Select Teaching Classroom / Lab</span>
                        </button>
                    </div>
                )}
            </div>
            )}

            {/* OVERVIEW CONTINUATION: Room Distribution & Holiday & OD Passes */}
            {mainTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%' }}>
                    {/* Room Distribution & Holiday */}
                    <div className="dashboard-grid-main">
                {/* Active Rooms Location: CLICKABLE */}
                <div className="fx-card">
                    <div className="fx-card-header">
                        <div className="fx-card-title">
                            <Building2 size={20} color="var(--blue)" />
                            Active Room Locations (Tap to Inspect)
                        </div>
                        <span className="count-pill green" style={{ fontSize: '0.72rem' }}>
                            Interactive Rooms
                        </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {overview?.roomDistribution?.length > 0 ? (
                            overview.roomDistribution.map((r, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    className="list-row-item active-room-click-card"
                                    onClick={() => setSelectedActiveRoom(r)}
                                    title={`Click to view all students currently present in Room ${r.room_number}`}
                                >
                                    <div style={{ textAlign: 'left' }}>
                                        <div style={{ fontWeight: 800, color: 'var(--dark-blue)', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span>Room {r.room_number} – {r.room_name}</span>
                                        </div>
                                        <div style={{ fontSize: '0.74rem', color: 'var(--text-sub)', marginTop: '2px' }}>
                                            {r.building_name} • Click to view live roster
                                        </div>
                                    </div>
                                    <span className="aero-status-tag present" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <Eye size={13} />
                                        <span>{r.student_count} Present</span>
                                    </span>
                                </button>
                            ))
                        ) : (
                            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                                No classrooms currently active for {department}.
                            </div>
                        )}
                    </div>
                </div>

                {/* Holiday & Timed Event Exemption Management */}
                <div className="fx-card">
                    <div className="fx-card-header">
                        <div className="fx-card-title">
                            <Calendar size={20} color="var(--blue)" />
                            Declare Department Leave / Event Exemption
                        </div>
                    </div>

                    {holidayNotice && (
                        <div className="aero-alert-success">{holidayNotice}</div>
                    )}

                    <form onSubmit={handleDeclareHoliday} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Exemption Type Switcher */}
                        <div style={{ display: 'flex', gap: '8px', background: 'var(--light-blue)', padding: '3px', borderRadius: '8px' }}>
                            <button
                                type="button"
                                className={`role-btn ${!isTimed ? 'active' : ''}`}
                                style={{ flex: 1, padding: '6px 10px', fontSize: '0.76rem' }}
                                onClick={() => setIsTimed(false)}
                            >
                                Full Day Holiday
                            </button>
                            <button
                                type="button"
                                className={`role-btn ${isTimed ? 'active' : ''}`}
                                style={{ flex: 1, padding: '6px 10px', fontSize: '0.76rem' }}
                                onClick={() => setIsTimed(true)}
                            >
                                Timed Event (Competition / Exemption)
                            </button>
                        </div>

                        <div>
                            <label className="picker-label" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--dark-blue)' }}>
                                {isTimed ? 'Event / Competition Title' : 'Holiday Name'}
                            </label>
                            <input 
                                type="text"
                                className="fx-select"
                                style={{ width: '100%', marginTop: '4px' }}
                                placeholder={isTimed ? "e.g. Smart India Hackathon / Inter-College Coding Contest" : "e.g. 1st Saturday Institutional Holiday / Rainy Day"}
                                value={holidayTitle}
                                onChange={(e) => setHolidayTitle(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="picker-label" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--dark-blue)' }}>Date</label>
                            <input 
                                type="date"
                                className="fx-select"
                                style={{ width: '100%', marginTop: '4px' }}
                                value={holidayDate}
                                onChange={(e) => setHolidayDate(e.target.value)}
                            />
                        </div>

                        {/* Timed Window Inputs */}
                        {isTimed && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label className="picker-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--dark-blue)' }}>Start Time</label>
                                    <input 
                                        type="time"
                                        className="fx-select"
                                        style={{ width: '100%', marginTop: '4px' }}
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="picker-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--dark-blue)' }}>End Time</label>
                                    <input 
                                        type="time"
                                        className="fx-select"
                                        style={{ width: '100%', marginTop: '4px' }}
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        <button type="submit" className="fx-btn-primary" style={{ marginTop: '4px' }}>
                            {isTimed ? 'Save Timed Event Exemption' : 'Save Department Holiday'}
                        </button>
                    </form>
                </div>
            </div>

            {/* HOD On-Duty (OD) Passes & Student Exemption Section */}
            <div className="fx-card" style={{ padding: '18px 20px', border: '1.5px solid rgba(245, 158, 11, 0.35)' }}>
                <div className="fx-card-header" style={{ marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                        <div className="fx-card-title" style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Trophy size={20} color="#F59E0B" />
                            <span>Department Student On-Duty (OD) Passes</span>
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-sub)', marginTop: '2px' }}>
                            Issue On-Duty passes for hackathons, symposiums, industrial visits, or project work. Exempts students from OTP submission with 100% attendance credit.
                        </div>
                    </div>

                    <button 
                        type="button" 
                        className="aero-gloss-btn"
                        style={{ 
                            padding: '8px 18px', 
                            fontSize: '0.80rem', 
                            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                            color: '#FFFFFF',
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '6px' 
                        }}
                        onClick={() => setIsOdModalOpen(true)}
                    >
                        <Plus size={15} />
                        <span>Issue New OD Pass</span>
                    </button>
                </div>

                {odNotice && (
                    <div className={odNotice.type === 'success' ? 'aero-alert-success' : 'aero-alert-error'} style={{ marginBottom: '12px', fontWeight: 700 }}>
                        {odNotice.text}
                    </div>
                )}

                {/* Active OD Passes List */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                    {hodOdPasses.length > 0 ? (
                        hodOdPasses.map(p => {
                            const todayStr = new Date().toISOString().slice(0, 10);
                            const isCurrentlyActive = todayStr >= p.from_date?.slice(0, 10) && todayStr <= p.to_date?.slice(0, 10);
                            return (
                                <div 
                                    key={p.id}
                                    style={{
                                        background: '#FFFBEB',
                                        border: isCurrentlyActive ? '1.5px solid #F59E0B' : '1px solid #FDE68A',
                                        borderRadius: '10px',
                                        padding: '14px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        gap: '10px'
                                    }}
                                >
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                            <span style={{ fontSize: '0.68rem', fontWeight: 800, background: '#FDE68A', color: '#92400E', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                                                {p.sport_category || 'On-Duty'}
                                            </span>
                                            {isCurrentlyActive ? (
                                                <span className="aero-pill green" style={{ fontSize: '0.66rem' }}>● Active Today</span>
                                            ) : (
                                                <span style={{ fontSize: '0.66rem', color: '#B45309' }}>{p.status}</span>
                                            )}
                                        </div>

                                        <div style={{ fontWeight: 800, color: 'var(--dark-blue)', fontSize: '0.92rem', marginBottom: '4px' }}>
                                            {p.event_name}
                                        </div>

                                        <div style={{ fontSize: '0.74rem', color: '#78350F', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <div>Venue: {p.venue}</div>
                                            <div>Duration: {p.from_date?.slice(0, 10)} to {p.to_date?.slice(0, 10)}</div>
                                            <div>Timing: {p.is_all_day ? 'Full Day (All 7 Periods)' : `Periods ${p.from_period} - ${p.to_period}`}</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #FDE68A' }}>
                                        <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#92400E' }}>
                                            {p.student_count || 0} Students Exempted
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteHodOdPass(p.id)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: 700 }}
                                            title="Revoke OD Pass"
                                        >
                                            <Trash2 size={13} />
                                            <span>Revoke</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.82rem', gridColumn: '1 / -1' }}>
                            No active On-Duty passes issued yet. Click "Issue New OD Pass" to select students and exempt them from OTP attendance.
                        </div>
                    )}
                </div>
            </div>
            </div>
            )}

            {/* TAB 4: Student Attendance Status & Hardware Locks */}
            {mainTab === 'lockouts' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                    {/* Day / Lunch Attendance Lock Alert */}
            {dayLockedPendingCount > 0 && (
                <div style={{
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.12) 100%)',
                    border: '1.5px solid #FCA5A5',
                    borderRadius: '14px',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#FEE2E2', border: '1.5px solid #FCA5A5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626' }}>
                            <AlertTriangle size={22} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, color: '#991B1B', fontSize: '0.98rem' }}>
                                {dayLockedPendingCount} Student{dayLockedPendingCount > 1 ? 's' : ''} Locked Out (Morning 9:05 AM or Lunch 1:35 PM Cutoff)
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#7F1D1D', marginTop: '2px' }}>
                                Students who missed OTP within 5 mins cannot choose classrooms without your authorization. Click below to review and unlock.
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="duo-btn duo-btn-red sm"
                        onClick={() => setFilterTab('day_locked')}
                    >
                        <Unlock size={14} />
                        <span>Review & Unlock ({dayLockedPendingCount})</span>
                    </button>
                </div>
            )}

            {/* Device Lock Management & Student History Table */}
            <div className="fx-card">
                <div className="fx-card-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                        <div className="fx-card-title">
                            <Users size={20} color="var(--blue)" />
                            Student Attendance Status & Hardware Locks
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)', marginTop: '2px' }}>
                            Search students, click any row to view calendar & location history, unlock Period 1 / Lunch lockouts, or reset device bindings
                        </div>
                    </div>

                    {/* Filter Tabs: All vs Attendance Locked vs Hardware Locked */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            className={`duo-btn ${filterTab === 'all' ? 'duo-btn-blue' : 'duo-btn-slate'} sm`}
                            onClick={() => setFilterTab('all')}
                        >
                            All Students ({students.length})
                        </button>
                        <button
                            type="button"
                            className={`duo-btn ${filterTab === 'day_locked' ? 'duo-btn-red' : 'duo-btn-slate'} sm`}
                            style={filterTab !== 'day_locked' && dayLockedPendingCount > 0 ? { borderColor: '#FCA5A5', color: '#DC2626' } : {}}
                            onClick={() => setFilterTab('day_locked')}
                        >
                            <Lock size={12} />
                            <span>Cutoff Locked ({dayLockedPendingCount})</span>
                        </button>
                        <button
                            type="button"
                            className={`duo-btn ${filterTab === 'device_locked' ? 'duo-btn-blue' : 'duo-btn-slate'} sm`}
                            onClick={() => setFilterTab('device_locked')}
                        >
                            <Lock size={12} />
                            <span>Device Bound ({lockedCount})</span>
                        </button>
                    </div>
                </div>

                {unlockNotice && (
                    <div className="aero-alert-success" style={{ fontWeight: 700 }}>
                        <ShieldCheck size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                        {unlockNotice}
                    </div>
                )}

                {resetNotice && (
                    <div className="aero-alert-success">{resetNotice}</div>
                )}

                <div style={{ maxWidth: '380px' }}>
                    <input 
                        type="text"
                        className="fx-select"
                        style={{ width: '100%' }}
                        placeholder="Search student by name or roll number (e.g. Daniel A)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="fx-table-container">
                    <table className="fx-table">
                        <thead>
                            <tr>
                                <th>Student Name</th>
                                <th>Official College Email</th>
                                <th>Day Status (Period 1)</th>
                                <th>Registered Device</th>
                                <th>Current Location</th>
                                <th style={{ textAlign: 'center' }}>History</th>
                                <th style={{ textAlign: 'center' }}>Attendance / Device Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedStudents.map((st, i) => {
                                const hasLock = !!(st.is_locked || st.device_name);
                                const dayLockInfo = dayLockedMap.get(st.id);
                                return (
                                    <tr key={i}>
                                        <td 
                                            style={{ fontWeight: 800, color: 'var(--dark-blue)', cursor: 'pointer' }}
                                            onClick={() => setSelectedStudentForCalendar(st)}
                                            title={`Click to view attendance calendar for ${st.name}`}
                                        >
                                            <span style={{ textDecoration: 'underline', color: 'var(--blue)' }}>{st.name}</span>
                                        </td>
                                        <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--blue)', fontWeight: 700 }}>
                                            {st.email}
                                        </td>
                                        <td>
                                            {dayLockInfo ? (
                                                dayLockInfo.isHodUnlocked ? (
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        padding: '4px 9px',
                                                        borderRadius: '8px',
                                                        background: '#ECFDF5',
                                                        color: '#059669',
                                                        fontSize: '0.74rem',
                                                        fontWeight: 800,
                                                        border: '1.5px solid #A7F3D0'
                                                    }}>
                                                        <ShieldCheck size={13} />
                                                        Unlocked by HOD
                                                    </span>
                                                ) : (
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        padding: '4px 9px',
                                                        borderRadius: '8px',
                                                        background: '#FEF2F2',
                                                        color: '#DC2626',
                                                        fontSize: '0.74rem',
                                                        fontWeight: 800,
                                                        border: '1.5px solid #FECACA'
                                                    }}>
                                                        <Lock size={13} />
                                                        {dayLockInfo.lockType === 'Post-Lunch (Period 5)' ? 'Lunch Locked (P5 Missed)' : 'Day Locked (P1 Missed)'}
                                                    </span>
                                                )
                                            ) : (
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    padding: '4px 9px',
                                                    borderRadius: '8px',
                                                    background: '#F0FDF4',
                                                    color: '#15803D',
                                                    fontSize: '0.74rem',
                                                    fontWeight: 800
                                                }}>
                                                    <CheckCircle2 size={13} />
                                                    Attendance Active
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            {hasLock ? (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--dark-blue)', fontWeight: 600 }}>
                                                    <Lock size={13} color="#DC2626" />
                                                    <span>{st.device_name || 'Primary Mobile'}</span>
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--text-dim)', fontSize: '0.76rem' }}>
                                                    <Unlock size={13} style={{ display: 'inline', marginRight: '4px' }} />
                                                    Clean / Unbound
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            {st.current_room ? (
                                                <span className="aero-status-tag present">Room {st.current_room}</span>
                                            ) : (
                                                <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Not checked-in</span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button 
                                                type="button" 
                                                className="duo-btn duo-btn-slate xs"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedStudentForCalendar(st);
                                                }}
                                                title="View monthly attendance calendar"
                                            >
                                                <Eye size={12} />
                                                <span>Calendar</span>
                                            </button>
                                        </td>
                                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                            <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                                                {dayLockInfo && !dayLockInfo.isHodUnlocked && (
                                                    <button
                                                        type="button"
                                                        className="duo-btn duo-btn-green xs"
                                                        onClick={() => handleUnlockStudentDay(st.id, st.name)}
                                                        title="Authorize student to enter classroom and take attendance today"
                                                    >
                                                        <Unlock size={12} />
                                                        <span>Unlock Attendance</span>
                                                    </button>
                                                )}
                                                {dayLockInfo && dayLockInfo.isHodUnlocked && (
                                                    <button
                                                        type="button"
                                                        className="duo-btn duo-btn-slate xs"
                                                        style={{ color: '#DC2626', borderColor: '#FECACA' }}
                                                        onClick={() => handleRelockStudentDay(st.id, st.name)}
                                                        title="Revoke authorization and re-lock student"
                                                    >
                                                        <Lock size={11} />
                                                        <span>Relock</span>
                                                    </button>
                                                )}
                                                {hasLock ? (
                                                    <button 
                                                        type="button" 
                                                        className="duo-btn duo-btn-red xs"
                                                        onClick={() => handleResetDevice(st.id, st.name)}
                                                        title="Take lock back / Allow student to register a new phone"
                                                    >
                                                        <RotateCcw size={12} />
                                                        <span>Reset Lock</span>
                                                    </button>
                                                ) : (
                                                    <span style={{ fontSize: '0.74rem', color: '#16A34A', fontWeight: 700, padding: '0 4px' }}>
                                                        Ready
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            </div>
            )}

            {/* Modal: Live Students in Clicked Active Room */}
            <RoomStudentsModal 
                isOpen={!!selectedActiveRoom}
                onClose={() => setSelectedActiveRoom(null)}
                roomId={selectedActiveRoom?.room_id}
                roomName={selectedActiveRoom?.room_name}
                buildingName={selectedActiveRoom?.building_name}
            />

            {/* Modal: Student Month Calendar View (Image 2 Match) */}
            <AttendanceCalendarModal 
                isOpen={!!selectedStudentForCalendar}
                onClose={() => setSelectedStudentForCalendar(null)}
                student={selectedStudentForCalendar}
            />

            {/* Modal: Full Student Timeline & Location History */}
            <StudentDetailsModal 
                isOpen={!!inspectedStudentId}
                onClose={() => setInspectedStudentId(null)}
                studentId={inspectedStudentId}
            />

            {/* Modal: HOD Teaching Room Selection (Building -> Floor -> Room) */}
            <RoomSelectionModal 
                isOpen={isTeachingRoomModalOpen}
                onClose={() => setIsTeachingRoomModalOpen(false)}
                hierarchy={hierarchy}
                onSelectRoom={(bId, fId, rId) => {
                    setTeachingRoomId(Number(rId));
                    setIsTeachingRoomModalOpen(false);
                }}
                currentRoomId={teachingRoomId}
            />

            {/* Modal: HOD AI Classroom Headcount & Face Audit (YOLO) */}
            <ClassroomHeadcountModal 
                isOpen={isHeadcountModalOpen}
                onClose={() => setIsHeadcountModalOpen(false)}
                roomId={teachingRoomId}
                roomName={teachingRoomInfo ? `Room ${teachingRoomInfo.room_number} – ${teachingRoomInfo.name}` : `Room ${teachingRoomId}`}
                currentOtpCount={teachingPresentCount}
                onAuditSaved={() => {
                    fetchLatestAudit(teachingRoomId);
                }}
            />

            {/* Modal: Issue Department Student On-Duty (OD) Pass */}
            {isOdModalOpen && (
                <div className="aero-modal-backdrop" onClick={() => setIsOdModalOpen(false)}>
                    <div 
                        className="aero-modal-card fa-glass-card" 
                        onClick={e => e.stopPropagation()} 
                        style={{ maxWidth: '800px', width: '95%', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}
                    >
                        <div className="aero-modal-header" style={{ paddingBottom: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div className="aero-badge-circle" style={{ background: '#F59E0B', color: '#FFFFFF' }}>
                                    <Trophy size={20} />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--dark-blue)', margin: 0 }}>
                                        Issue Department Student On-Duty (OD) Pass
                                    </h2>
                                    <p style={{ fontSize: '0.76rem', color: 'var(--text-sub)', margin: '2px 0 0 0' }}>
                                        Exempt participating students from OTP submission with 100% On-Duty attendance credit
                                    </p>
                                </div>
                            </div>
                            <button type="button" className="aero-close-btn" onClick={() => setIsOdModalOpen(false)}>
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateHodOdPass} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '14px' }}>
                            
                            {/* 1. Event Details */}
                            <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                                <div style={{ fontSize: '0.80rem', fontWeight: 800, color: 'var(--blue)', textTransform: 'uppercase', marginBottom: '12px' }}>
                                    1. Event / Project Details
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                                    <div>
                                        <label className="picker-label">Event / Activity Title *</label>
                                        <input 
                                            type="text" 
                                            className="fx-select"
                                            style={{ width: '100%', marginTop: '4px' }}
                                            placeholder="e.g. Smart India Hackathon / Tech Symposium"
                                            value={odEventName}
                                            onChange={(e) => setOdEventName(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="picker-label">Category</label>
                                        <select 
                                            className="fx-select"
                                            style={{ width: '100%', marginTop: '4px' }}
                                            value={odCategory}
                                            onChange={(e) => setOdCategory(e.target.value)}
                                        >
                                            <option value="Department Hackathon">Department Hackathon / Coding</option>
                                            <option value="Inter-College Symposium">Inter-College Symposium</option>
                                            <option value="Project Expo & Presentation">Project Expo & Presentation</option>
                                            <option value="Industrial Visit (IV)">Industrial Visit (IV)</option>
                                            <option value="Placement Drive / Interview">Placement Drive / Interview</option>
                                            <option value="General Academic OD">General Academic OD</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="picker-label">Venue / Location</label>
                                        <input 
                                            type="text" 
                                            className="fx-select"
                                            style={{ width: '100%', marginTop: '4px' }}
                                            placeholder="e.g. Campus Lab 4 / External Venue"
                                            value={odVenue}
                                            onChange={(e) => setOdVenue(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Date Range and Period Select */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '12px' }}>
                                    <div>
                                        <label className="picker-label">From Date (Start) *</label>
                                        <input 
                                            type="date" 
                                            className="fx-select"
                                            style={{ width: '100%', marginTop: '4px' }}
                                            value={odFromDate}
                                            onChange={(e) => {
                                                setOdFromDate(e.target.value);
                                                if (e.target.value > odToDate) setOdToDate(e.target.value);
                                            }}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="picker-label">To Date (End) *</label>
                                        <input 
                                            type="date" 
                                            className="fx-select"
                                            style={{ width: '100%', marginTop: '4px' }}
                                            value={odToDate}
                                            min={odFromDate}
                                            onChange={(e) => setOdToDate(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="picker-label">Attendance Scope</label>
                                        <select 
                                            className="fx-select"
                                            style={{ width: '100%', marginTop: '4px' }}
                                            value={odIsAllDay ? 'all' : 'partial'}
                                            onChange={(e) => setOdIsAllDay(e.target.value === 'all')}
                                        >
                                            <option value="all">Full Day (All 7 Periods)</option>
                                            <option value="partial">Specific Periods / Timings</option>
                                        </select>
                                    </div>
                                </div>

                                {!odIsAllDay && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                                        <div>
                                            <label className="picker-label">From Period (Start)</label>
                                            <select 
                                                className="fx-select"
                                                style={{ width: '100%', marginTop: '4px' }}
                                                value={odFromPeriod}
                                                onChange={(e) => setOdFromPeriod(parseInt(e.target.value))}
                                            >
                                                <option value={1}>Period 1 (09:00 - 09:50 AM)</option>
                                                <option value={2}>Period 2 (09:50 - 10:40 AM)</option>
                                                <option value={3}>Period 3 (10:55 - 11:45 AM)</option>
                                                <option value={4}>Period 4 (11:45 - 12:35 PM)</option>
                                                <option value={5}>Period 5 (01:30 - 02:20 PM)</option>
                                                <option value={6}>Period 6 (02:20 - 03:10 PM)</option>
                                                <option value={7}>Period 7 (03:10 - 04:00 PM)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="picker-label">To Period (End)</label>
                                            <select 
                                                className="fx-select"
                                                style={{ width: '100%', marginTop: '4px' }}
                                                value={odToPeriod}
                                                onChange={(e) => setOdToPeriod(parseInt(e.target.value))}
                                            >
                                                <option value={1}>Period 1 (09:00 - 09:50 AM)</option>
                                                <option value={2}>Period 2 (09:50 - 10:40 AM)</option>
                                                <option value={3}>Period 3 (10:55 - 11:45 AM)</option>
                                                <option value={4}>Period 4 (11:45 - 12:35 PM)</option>
                                                <option value={5}>Period 5 (01:30 - 02:20 PM)</option>
                                                <option value={6}>Period 6 (02:20 - 03:10 PM)</option>
                                                <option value={7}>Period 7 (03:10 - 04:00 PM)</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 2. Student Selection */}
                            <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                                <div style={{ fontSize: '0.80rem', fontWeight: 800, color: 'var(--blue)', textTransform: 'uppercase', marginBottom: '10px' }}>
                                    2. Select Students for On-Duty ({odSelectedStudents.length} Selected)
                                </div>

                                <div style={{ position: 'relative', marginBottom: '10px' }}>
                                    <Search size={15} color="var(--blue)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                                    <input 
                                        type="text" 
                                        className="fx-select"
                                        style={{ width: '100%', paddingLeft: '32px' }}
                                        placeholder="Search student by name or email (e.g. Daniel, Arun...)..."
                                        value={odSearchStudent}
                                        onChange={(e) => setOdSearchStudent(e.target.value)}
                                    />
                                </div>

                                {/* Student Results to select */}
                                <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '6px', background: '#FFFFFF' }}>
                                    {students
                                        .filter(st => {
                                            if (!odSearchStudent.trim()) return true;
                                            const q = odSearchStudent.toLowerCase();
                                            return (st.name || '').toLowerCase().includes(q) || (st.email || '').toLowerCase().includes(q);
                                        })
                                        .map(st => {
                                            const isSelected = odSelectedStudents.some(s => s.id === st.id);
                                            return (
                                                <div 
                                                    key={st.id} 
                                                    style={{ 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'space-between', 
                                                        padding: '8px 12px', 
                                                        borderBottom: '1px solid #F1F5F9',
                                                        background: isSelected ? '#FEF3C7' : '#FFFFFF'
                                                    }}
                                                >
                                                    <div>
                                                        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--dark-blue)' }}>{st.name}</div>
                                                        <div style={{ fontSize: '0.70rem', color: 'var(--text-sub)' }}>{st.email} • {st.department}</div>
                                                    </div>
                                                    {isSelected ? (
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setOdSelectedStudents(prev => prev.filter(s => s.id !== st.id))}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', fontSize: '0.72rem', fontWeight: 700 }}
                                                        >
                                                            Remove
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            type="button" 
                                                            className="aero-glass-btn"
                                                            style={{ padding: '2px 10px', fontSize: '0.72rem' }}
                                                            onClick={() => setOdSelectedStudents(prev => [...prev, st])}
                                                        >
                                                            + Add
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                </div>

                                {/* Selected chips */}
                                <div style={{ marginTop: '10px' }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--dark-blue)', marginBottom: '4px' }}>
                                        Selected Students ({odSelectedStudents.length}):
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {odSelectedStudents.map(s => (
                                            <span 
                                                key={s.id} 
                                                style={{ 
                                                    background: '#FEF3C7', 
                                                    border: '1px solid #FDE68A', 
                                                    color: '#92400E', 
                                                    borderRadius: '4px', 
                                                    padding: '2px 8px', 
                                                    fontSize: '0.72rem', 
                                                    display: 'inline-flex', 
                                                    alignItems: 'center', 
                                                    gap: '6px' 
                                                }}
                                            >
                                                <b>{s.name}</b>
                                                <button 
                                                    type="button" 
                                                    onClick={() => setOdSelectedStudents(prev => prev.filter(x => x.id !== s.id))}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', padding: 0 }}
                                                >
                                                    X
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Submit */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                                <button 
                                    type="button" 
                                    className="aero-glass-btn"
                                    onClick={() => setIsOdModalOpen(false)}
                                    style={{ padding: '8px 16px', fontSize: '0.80rem' }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="aero-gloss-btn"
                                    disabled={odIsSubmitting || odSelectedStudents.length === 0}
                                    style={{ 
                                        padding: '8px 22px', 
                                        fontSize: '0.82rem', 
                                        background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                                        color: '#FFFFFF'
                                    }}
                                >
                                    {odIsSubmitting ? 'Issuing Pass...' : `Issue OD Pass & Exempt ${odSelectedStudents.length} Students`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: HOD Personal Teaching Movement & Monthly Calendar View */}
            <StaffMovementModal
                isOpen={isHodCalendarOpen}
                onClose={() => setIsHodCalendarOpen(false)}
                staffId={currentUser?.id}
            />

            {/* Modal: HOD Final Leave & OD Sanction */}
            <LeaveReviewModal
                isOpen={isLeaveModalOpen}
                onClose={() => setIsLeaveModalOpen(false)}
                role="hod"
                department={department}
            />

        </div>
    );
};
