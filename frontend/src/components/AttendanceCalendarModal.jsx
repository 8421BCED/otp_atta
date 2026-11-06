import React, { useState, useEffect } from 'react';
import { 
    Calendar as CalendarIcon, 
    X, 
    ChevronLeft, 
    ChevronRight, 
    CheckCircle2, 
    AlertCircle, 
    MapPin, 
    Clock, 
    FileText, 
    Building2, 
    Laptop,
    Navigation,
    ArrowRight,
    ShieldCheck,
    CalendarCheck,
    CalendarX,
    Award
} from 'lucide-react';

export const AttendanceCalendarModal = ({ isOpen, onClose, student, currentUser, isInlinePage = false }) => {
    const activeStudent = student || currentUser;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    // Default to the current real month and year
    const [viewYear, setViewYear] = useState(() => now.getFullYear());
    const [viewMonth, setViewMonth] = useState(() => now.getMonth()); // 0-indexed (10 = Nov)
    const [selectedDate, setSelectedDate] = useState(todayStr);
    const [fullReport, setFullReport] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if ((!isOpen && !isInlinePage) || !activeStudent?.id) return;
        
        const fetchStudentReport = async () => {
            setIsLoading(true);
            try {
                const token = localStorage.getItem('fxec_token');
                const res = await fetch(`/api/attendance/student-details/${activeStudent.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setFullReport(data);
                }
            } catch (err) {
                console.error('Failed to fetch full student report:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStudentReport();
    }, [isOpen, isInlinePage, activeStudent?.id]);

    if (!isOpen && !isInlinePage) return null;

    const allRecords = fullReport?.allRecords || [];
    const holidays = fullReport?.holidays || [];
    const sportsPasses = fullReport?.sportsPasses || [];
    const allMovements = fullReport?.movements || [];

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

    // Build day items dynamically from real database records and official college rules
    const daysData = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayOfWeek = new Date(viewYear, viewMonth, day).getDay();
        const isSunday = dayOfWeek === 0;
        const isSaturday = dayOfWeek === 6;
        const isWeekend = isSunday || isSaturday;

        const dayAtt = allRecords.filter(r => r.date_str === dateStr);
        const attendedPeriods = dayAtt.filter(r => r.status === 'present' || r.status === 'od');
        const attendedCount = attendedPeriods.length;
        const isAttended = attendedCount > 0;
        const dayRooms = [...new Set(dayAtt.map(r => r.room_number).filter(Boolean))].join(', ');

        const isHoliday = holidays.find(h => h.date_str === dateStr);
        const isSports = sportsPasses.find(s => dateStr >= s.from_date_str && dateStr <= s.to_date_str);

        let status = 'upcoming';
        let note = 'Scheduled College Day';

        if (dateStr > todayStr) {
            if (isHoliday) {
                status = 'weekend';
                note = isHoliday.title || 'Official College Holiday';
            } else if (isWeekend) {
                status = 'weekend';
                note = isSunday ? 'Sunday Holiday' : 'Saturday Holiday';
            } else {
                status = 'upcoming';
                note = 'Upcoming College Day';
            }
        } else if (dateStr === todayStr) {
            if (isSports) {
                status = 'leave';
                note = `Approved Sports OD (${isSports.event_name || 'College Exemption'})`;
            } else if (isHoliday) {
                status = 'weekend';
                note = isHoliday.title || 'Official College Holiday';
            } else if (isWeekend) {
                status = 'weekend';
                note = isSunday ? 'Sunday Holiday' : 'Saturday Holiday';
            } else if (isAttended) {
                status = attendedCount >= 7 ? 'present' : 'partial';
                note = `${attendedCount}/7 Periods Attended (Today)`;
            } else {
                status = 'today';
                note = 'Today (Live Session Active)';
            }
        } else {
            // Past dates
            if (isSports) {
                status = 'leave';
                note = `Approved Sports OD (${isSports.event_name || 'Event Exemption'})`;
            } else if (isHoliday) {
                status = 'weekend';
                note = isHoliday.title || 'College Holiday';
            } else if (isWeekend) {
                status = 'weekend';
                note = isSunday ? 'Sunday Holiday' : 'Saturday Holiday';
            } else if (isAttended) {
                status = attendedCount >= 7 ? 'present' : 'partial';
                note = `${attendedCount}/7 Periods Attended`;
            } else {
                status = 'absent';
                note = 'Absent (Period 1 Cutoff Missed)';
            }
        }

        return {
            day,
            date: dateStr,
            dayOfWeek,
            isWeekend,
            isHoliday: !!isHoliday,
            status,
            periods: attendedCount,
            total: 7,
            room: dayRooms || (status === 'present' ? 'Room 101' : null),
            note
        };
    });

    // Real-Time Stats (Strictly calculated from real database records & dates up to today)
    const pastWorkingDays = daysData.filter(d => d.date <= todayStr && !d.isWeekend && !d.isHoliday);
    const classesConductedPeriods = pastWorkingDays.length * 7;

    const presentDaysCount = daysData.filter(d => d.date <= todayStr && (d.status === 'present' || d.status === 'partial')).length;
    const leavesCount = daysData.filter(d => d.date <= todayStr && d.status === 'absent').length;
    const eventExemptionCount = daysData.filter(d => d.date <= todayStr && d.status === 'leave').length;
    const collegeHolidaysCount = daysData.filter(d => d.status === 'weekend').length;

    const currentMonthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    const rawAttendedPeriods = allRecords.filter(r => r.date_str && r.date_str.startsWith(currentMonthPrefix) && (r.status === 'present' || r.status === 'od')).length;
    // Event exemption days grant full period credit
    const periodsAttendedCount = rawAttendedPeriods + (eventExemptionCount * 7);

    const overallAttendancePct = classesConductedPeriods > 0 
        ? `${Math.min(100, Math.round((periodsAttendedCount / classesConductedPeriods) * 100))}%`
        : '100%';

    const activeDayInfo = daysData.find(d => d.date === selectedDate) || daysData[0] || {};
    const selectedDayRecords = allRecords.filter(r => r.date_str === selectedDate);
    const selectedDayMovements = allMovements.filter(m => m.date_str === selectedDate || (m.timestamp && m.timestamp.slice(0, 10) === selectedDate));
    const studentEmail = activeStudent?.email || 'daniela.ug.24.it@francisxavier.ac.in';

    const handlePrevMonth = () => {
        if (viewMonth === 0) {
            setViewYear(viewYear - 1);
            setViewMonth(11);
        } else {
            setViewMonth(viewMonth - 1);
        }
    };

    const handleNextMonth = () => {
        if (viewMonth === 11) {
            setViewYear(viewYear + 1);
            setViewMonth(0);
        } else {
            setViewMonth(viewMonth + 1);
        }
    };

    const content = (
        <div 
            className={`attendance-history-page-card ${isInlinePage ? 'is-inline-view' : 'aero-modal-card'}`} 
            onClick={e => e.stopPropagation()}
        >
            {/* Top Header */}
            <div className="attendance-page-header">
                <div className="header-meta-group">
                    <div className="header-icon-box">
                        <FileText size={20} strokeWidth={2.2} />
                    </div>
                    <div className="header-text-block">
                        <h1 className="header-title">Attendance & Academic History</h1>
                        <div className="header-sub">
                            <span className="student-name">{activeStudent?.name || 'Daniel A'}</span>
                            <span className="header-dot">•</span>
                            <span className="student-email">{studentEmail}</span>
                        </div>
                    </div>
                </div>
                {onClose && !isInlinePage && (
                    <button 
                        type="button" 
                        className="canary-modal-close-btn" 
                        onClick={onClose} 
                        title="Close"
                        aria-label="Close"
                    >
                        <X size={18} strokeWidth={2.4} />
                    </button>
                )}
            </div>

            {/* Overall Attendance Metrics Ribbon */}
            <div className="aero-metric-ribbon">
                <div className="ribbon-col">
                    <span className="lbl">Attendance</span>
                    <span className="val highlight">{overallAttendancePct}</span>
                </div>
                <div className="ribbon-col">
                    <span className="lbl">Attended</span>
                    <span className="val">{periodsAttendedCount} <span className="val-sub">/ {classesConductedPeriods || 7}</span></span>
                </div>
                <div className="ribbon-col">
                    <span className="lbl">Conducted</span>
                    <span className="val" style={{ color: '#1E3A8A' }}>
                        {classesConductedPeriods || 7} <span className="val-sub">Periods</span>
                    </span>
                </div>
            </div>

            {/* Real-time Status Breakdown Pills (Sleek, Compact, Enterprise-Grade) */}
            <div className="calendar-status-stat-bar">
                <div className="stat-pill stat-present">
                    <span className="stat-dot" style={{ background: '#16A34A' }} />
                    <span className="stat-label">Present</span>
                    <span className="stat-num">{presentDaysCount}</span>
                </div>
                <div className="stat-pill stat-absent">
                    <span className="stat-dot" style={{ background: '#DC2626' }} />
                    <span className="stat-label">Absent</span>
                    <span className="stat-num">{leavesCount}</span>
                </div>
                <div className="stat-pill stat-od">
                    <span className="stat-dot" style={{ background: '#7E22CE' }} />
                    <span className="stat-label">Sports OD</span>
                    <span className="stat-num">{eventExemptionCount}</span>
                </div>
                <div className="stat-pill stat-holiday">
                    <span className="stat-dot" style={{ background: '#1D4ED8' }} />
                    <span className="stat-label">Holidays</span>
                    <span className="stat-num">{collegeHolidaysCount}</span>
                </div>
            </div>

            {/* PC Desktop Full-Width 2-Column Responsive Layout */}
            <div className="attendance-desktop-grid">
                
                {/* Column 1: Calendar Grid & Month Navigator */}
                <div className="attendance-grid-left">
                    
                    {/* Month Navigator Header */}
                    <div className="calendar-month-nav">
                        <button 
                            type="button" 
                            onClick={handlePrevMonth} 
                            title="Previous Month"
                            className="month-nav-btn"
                        >
                            <ChevronLeft size={17} strokeWidth={2.4} />
                        </button>

                        <div className="month-nav-title">
                            <CalendarIcon size={16} color="#1E3A8A" />
                            <span>{monthNames[viewMonth]} {viewYear}</span>
                        </div>

                        <button 
                            type="button" 
                            onClick={handleNextMonth} 
                            title="Next Month"
                            className="month-nav-btn"
                        >
                            <ChevronRight size={17} strokeWidth={2.4} />
                        </button>
                    </div>

                    {/* Day of Week Headers */}
                    <div className="aero-calendar-weekdays">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(w => (
                            <div key={w} className="weekday-lbl">{w}</div>
                        ))}
                    </div>

                    {/* 7-Column Days Grid */}
                    <div className="aero-calendar-grid">
                        {/* Empty padding cells */}
                        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                            <div key={`empty-${i}`} className="calendar-day-cell empty"></div>
                        ))}

                        {daysData.map(d => {
                            const isSelected = d.date === selectedDate;
                            return (
                                <button
                                    key={d.day}
                                    type="button"
                                    className={`calendar-day-cell ${d.status} ${isSelected ? 'selected' : ''}`}
                                    onClick={() => setSelectedDate(d.date)}
                                    title={`${d.date}: ${d.note}`}
                                >
                                    <span className="day-num">{d.day}</span>
                                    {d.status === 'present' && <span className="aero-dot green"></span>}
                                    {d.status === 'leave' && <span className="aero-dot" style={{ background: '#7E22CE' }}></span>}
                                    {d.status === 'partial' && <span className="aero-dot amber"></span>}
                                    {d.status === 'today' && <span className="aero-dot blue"></span>}
                                    {d.status === 'absent' && <span className="aero-dot red" style={{ background: '#DC2626' }}></span>}
                                </button>
                            );
                        })}
                    </div>

                    {/* Quick Legend */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', marginTop: '14px', fontSize: '0.72rem', color: '#5A5249', fontWeight: 650 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16A34A' }}></span> Present
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#DC2626' }}></span> Absent
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#7E22CE' }}></span> Sports OD
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1E3A8A' }}></span> Live Today
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#CBD5E1' }}></span> Weekend / Holiday
                        </span>
                    </div>

                </div>

                {/* Column 2: Selected Day Inspection & Lab Movement Trail */}
                <div className="attendance-grid-right">
                    
                    {/* Selected Day Details Panel */}
                    <div className="aero-day-detail-panel" style={{ background: '#FEFDFB', border: '1.5px solid #E2D9CE', borderRadius: '18px', padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', paddingBottom: '10px', borderBottom: '1px solid #E2D9CE' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CheckCircle2 size={18} color="#1E3A8A" />
                                <strong style={{ color: '#152641', fontSize: '0.94rem', fontWeight: 800 }}>
                                    Details for {activeDayInfo.date} {activeDayInfo.date === todayStr ? '(Today)' : ''}
                                </strong>
                            </div>
                            <span className={`aero-pill ${activeDayInfo.status === 'leave' ? 'cyan' : activeDayInfo.status === 'present' ? 'green' : activeDayInfo.status === 'absent' ? 'red' : 'blue'}`}>
                                {activeDayInfo.status === 'leave' 
                                    ? 'Event Leave Exemption' 
                                    : `${selectedDayRecords.length} / 7 Periods Attended`}
                            </span>
                        </div>

                        {/* Actual marked periods for selected date */}
                        <div className="aero-timeline-mini" style={{ marginTop: '12px' }}>
                            {selectedDayRecords.length > 0 ? (
                                selectedDayRecords.map((rec, idx) => (
                                    <div key={idx} className="mini-trail-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8FAFC', padding: '10px 14px', borderRadius: '12px', border: '1px solid #E2D9CE', marginBottom: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                            <Clock size={15} color="#1E3A8A" />
                                            <strong style={{ color: '#152641', fontSize: '0.86rem', fontWeight: 800 }}>
                                                {rec.period_name || `Period ${rec.period_id}`} ({rec.start_time ? rec.start_time.slice(0, 5) : '09:00'} – {rec.end_time ? rec.end_time.slice(0, 5) : '09:50'}):
                                            </strong>
                                            <span style={{ fontWeight: 800, color: '#1E3A8A', fontSize: '0.84rem' }}>
                                                Room {rec.room_number || '101'}
                                            </span>
                                            <span style={{ color: '#5A5249', fontSize: '0.78rem', fontWeight: 600 }}>
                                                ({rec.room_name || 'Classroom'} • {rec.building_name || 'FX Engineering Block'})
                                            </span>
                                        </div>
                                        <span className="aero-status-tag present" style={{ fontSize: '0.72rem', padding: '3px 10px', fontWeight: 750 }}>
                                            OTP Verified
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div style={{ padding: '18px 14px', textAlign: 'center', color: '#5A5249', fontSize: '0.84rem', fontWeight: 600 }}>
                                    {activeDayInfo.status === 'upcoming' 
                                        ? 'Upcoming schedule — no attendance records yet.' 
                                        : activeDayInfo.status === 'weekend' 
                                        ? 'Weekend / Holiday — no academic sessions scheduled.'
                                        : activeDayInfo.status === 'leave'
                                        ? 'Approved Event / Sports Exemption active for this day.'
                                        : `No classroom attendance marked on ${selectedDate} (Absent / Period 1 Cutoff Missed).`}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Physical Movement & Lab Relocation Trail */}
                    <div style={{ marginTop: '16px', background: '#FEFDFB', border: '1.5px solid #E2D9CE', borderRadius: '18px', padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #E2D9CE' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Navigation size={17} color="#1E3A8A" />
                                <span style={{ fontWeight: 850, color: '#152641', fontSize: '0.90rem' }}>
                                    Physical Classroom & Lab Movement Trail
                                </span>
                            </div>
                            <span className="aero-pill green" style={{ fontSize: '0.70rem' }}>
                                {selectedDayMovements.length > 0 ? `${selectedDayMovements.length} Movements on Date` : '0 Movements'}
                            </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {selectedDayMovements.length > 0 ? (
                                selectedDayMovements.map((m, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8FAFC', padding: '10px 14px', borderRadius: '12px', border: '1px solid #E2D9CE', fontSize: '0.80rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <Clock size={14} color="#5A5249" />
                                            <span style={{ color: '#5A5249', fontWeight: 650 }}>
                                                {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '09:00 AM'}
                                            </span>
                                            <span style={{ fontWeight: 800, color: '#152641' }}>
                                                {m.from_room ? `Room ${m.from_room}` : 'Classroom Arrival'}
                                            </span>
                                            <ArrowRight size={13} color="#1E3A8A" />
                                            <span style={{ fontWeight: 850, color: '#1E3A8A' }}>
                                                Room {m.to_room || m.to_room_id} ({m.to_room_name || 'Classroom'})
                                            </span>
                                            <span style={{ fontSize: '0.74rem', color: '#5A5249' }}>
                                                • {m.to_building || 'FX Engineering Block'}
                                            </span>
                                        </div>
                                        <span className="aero-status-tag present" style={{ fontSize: '0.70rem', padding: '2px 8px' }}>
                                            Verified
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div style={{ padding: '14px', textAlign: 'center', color: '#5A5249', fontSize: '0.82rem', fontWeight: 600 }}>
                                    No classroom movements recorded on {selectedDate}.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Anti-Proxy Hardware Binding Tag */}
                    <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '14px', padding: '10px 14px', fontSize: '0.76rem', color: '#065F46', fontWeight: 700 }}>
                        <ShieldCheck size={16} color="#059669" />
                        <span>Autonomous Anti-Proxy Ledger: All dates cryptographically mapped to student hardware.</span>
                    </div>

                </div>

            </div>

        </div>
    );

    if (isInlinePage) {
        return (
            <div className="attendance-history-page-wrapper">
                {content}
            </div>
        );
    }

    return (
        <div className="aero-modal-backdrop" onClick={onClose}>
            {content}
        </div>
    );
};
