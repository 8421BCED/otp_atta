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
    ArrowRight
} from 'lucide-react';

export const AttendanceCalendarModal = ({ isOpen, onClose, student, currentUser }) => {
    const activeStudent = student || currentUser;
    const [monthIndex, setMonthIndex] = useState(1); // 0: September 2026, 1: October 2026, 2: November 2026
    const [selectedDate, setSelectedDate] = useState('2026-10-22');
    const [fullReport, setFullReport] = useState(null);

    useEffect(() => {
        if (!isOpen || !activeStudent?.id) return;
        const fetchStudentReport = async () => {
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
            }
        };
        fetchStudentReport();
    }, [isOpen, activeStudent?.id]);

    if (!isOpen) return null;

    // Multi-Month Dataset allowing comparison between previous month (September), current (October), and upcoming (November)
    const monthsData = [
        {
            name: 'September 2026',
            emptyOffset: 2, // Tuesday start (Sun=0, Mon=1, Tue=2)
            daysCount: 30,
            stats: {
                presentDays: 22,
                leaves: 0,
                eventExemption: 0,
                collegeHolidays: 8,
                overallAttendance: '100%',
                periodsAttended: '154 / 154',
                classesConducted: '154 Periods'
            },
            days: Array.from({ length: 30 }, (_, i) => {
                const d = i + 1;
                const isWeekend = [5, 6, 12, 13, 19, 20, 26, 27].includes(d);
                const dateStr = `2026-09-${String(d).padStart(2, '0')}`;
                return {
                    day: d,
                    date: dateStr,
                    status: isWeekend ? 'weekend' : 'present',
                    periods: isWeekend ? 0 : 7,
                    total: isWeekend ? 0 : 7,
                    room: isWeekend ? null : (d % 3 === 0 ? 'AK 102 (Data Science Lab)' : 'AK 207'),
                    note: isWeekend ? (d % 2 === 1 ? 'Saturday Holiday' : 'Sunday Holiday') : 'Full Attendance (7/7 Periods)'
                };
            })
        },
        {
            name: 'October 2026',
            emptyOffset: 4, // Thursday start (Sun=0, Mon=1, Tue=2, Wed=3, Thu=4)
            daysCount: 31,
            stats: {
                presentDays: 17,
                leaves: 0,
                eventExemption: 1,
                collegeHolidays: 4,
                overallAttendance: fullReport?.stats?.percentage !== undefined ? `${fullReport.stats.percentage}%` : '96.8%',
                periodsAttended: fullReport?.stats?.presentPeriods !== undefined ? `${fullReport.stats.presentPeriods} / ${fullReport.stats.totalPeriods || 112}` : '108 / 112',
                classesConducted: `${fullReport?.stats?.totalPeriods || 112} Periods`
            },
            days: [
                { day: 1, date: '2026-10-01', status: 'present', periods: 7, total: 7, room: 'AK 207', note: 'Full Attendance' },
                { day: 2, date: '2026-10-02', status: 'present', periods: 7, total: 7, room: 'AK 207', note: 'Full Attendance' },
                { day: 3, date: '2026-10-03', status: 'weekend', periods: 0, total: 0, note: 'Saturday (College Holiday)' },
                { day: 4, date: '2026-10-04', status: 'weekend', periods: 0, total: 0, note: 'Sunday (Weekly Holiday)' },
                { day: 5, date: '2026-10-05', status: 'present', periods: 6, total: 7, room: 'AK 102 (Data Science Lab)', note: '6 Periods Attended' },
                { day: 6, date: '2026-10-06', status: 'present', periods: 7, total: 7, room: 'AK 207', note: 'Full Attendance' },
                { day: 7, date: '2026-10-07', status: 'present', periods: 7, total: 7, room: 'FX 104 (Network Lab)', note: 'Full Attendance' },
                { day: 8, date: '2026-10-08', status: 'leave', periods: 7, total: 7, room: 'AK 002 (APJ Auditorium)', note: 'Smart India Hackathon (Approved Exemption)' },
                { day: 9, date: '2026-10-09', status: 'present', periods: 7, total: 7, room: 'AK 207', note: 'Full Attendance' },
                { day: 10, date: '2026-10-10', status: 'weekend', periods: 0, total: 0, note: 'Saturday (Institutional Holiday)' },
                { day: 11, date: '2026-10-11', status: 'weekend', periods: 0, total: 0, note: 'Sunday (Weekly Holiday)' },
                { day: 12, date: '2026-10-12', status: 'present', periods: 7, total: 7, room: 'AK 207', note: 'Full Attendance' },
                { day: 13, date: '2026-10-13', status: 'present', periods: 7, total: 7, room: 'AK 102 (Data Science Lab)', note: 'Full Attendance' },
                { day: 14, date: '2026-10-14', status: 'present', periods: 7, total: 7, room: 'AK 207', note: 'Full Attendance' },
                { day: 15, date: '2026-10-15', status: 'present', periods: 7, total: 7, room: 'AK 207', note: 'Full Attendance' },
                { day: 16, date: '2026-10-16', status: 'present', periods: 7, total: 7, room: 'FX 104 (Network Lab)', note: 'Full Attendance' },
                { day: 17, date: '2026-10-17', status: 'weekend', periods: 0, total: 0, note: 'Saturday (Holiday)' },
                { day: 18, date: '2026-10-18', status: 'weekend', periods: 0, total: 0, note: 'Sunday (Holiday)' },
                { day: 19, date: '2026-10-19', status: 'present', periods: 7, total: 7, room: 'AK 207', note: 'Full Attendance' },
                { day: 20, date: '2026-10-20', status: 'present', periods: 7, total: 7, room: 'AK 207', note: 'Full Attendance' },
                { day: 21, date: '2026-10-21', status: 'present', periods: 7, total: 7, room: 'AK 207', note: 'Full Attendance' },
                { day: 22, date: '2026-10-22', status: 'today', periods: fullReport?.todayRecords?.length || 1, total: 7, room: fullReport?.currentLocation?.room_number ? `${fullReport.currentLocation.room_number}` : 'AK 207', note: 'Today (Live Session)' },
                { day: 23, date: '2026-10-23', status: 'upcoming', note: 'Upcoming College Day' },
                { day: 24, date: '2026-10-24', status: 'upcoming', note: 'Upcoming College Day' },
                { day: 25, date: '2026-10-25', status: 'upcoming', note: 'Upcoming Weekend' },
                { day: 26, date: '2026-10-26', status: 'upcoming', note: 'Upcoming College Day' },
                { day: 27, date: '2026-10-27', status: 'upcoming', note: 'Upcoming College Day' },
                { day: 28, date: '2026-10-28', status: 'upcoming', note: 'Upcoming College Day' },
                { day: 29, date: '2026-10-29', status: 'upcoming', note: 'Upcoming College Day' },
                { day: 30, date: '2026-10-30', status: 'upcoming', note: 'Upcoming College Day' },
                { day: 31, date: '2026-10-31', status: 'upcoming', note: 'Upcoming College Day' }
            ]
        },
        {
            name: 'November 2026',
            emptyOffset: 0, // Sunday start
            daysCount: 30,
            stats: {
                presentDays: 0,
                leaves: 0,
                eventExemption: 0,
                collegeHolidays: 9,
                overallAttendance: 'Scheduled',
                periodsAttended: '0 / 147',
                classesConducted: '147 Periods Scheduled'
            },
            days: Array.from({ length: 30 }, (_, i) => {
                const d = i + 1;
                const isWeekend = [1, 7, 8, 14, 15, 21, 22, 28, 29].includes(d);
                return {
                    day: d,
                    date: `2026-11-${String(d).padStart(2, '0')}`,
                    status: isWeekend ? 'weekend' : 'upcoming',
                    periods: 0,
                    total: 7,
                    note: isWeekend ? 'Scheduled Weekend' : 'Upcoming College Day'
                };
            })
        }
    ];

    const currentMonthData = monthsData[monthIndex];
    const daysData = currentMonthData.days;
    const activeDayInfo = daysData.find(d => d.date === selectedDate) || daysData[0] || {};
    const studentEmail = activeStudent?.email || 'daniela.ug.24.it@francisxavier.ac.in';

    // Movements list from report or fallback for active day
    const studentMovements = fullReport?.movements || [];

    const handlePrevMonth = () => {
        if (monthIndex > 0) {
            setMonthIndex(monthIndex - 1);
            setSelectedDate(monthsData[monthIndex - 1].days[0].date);
        }
    };

    const handleNextMonth = () => {
        if (monthIndex < monthsData.length - 1) {
            setMonthIndex(monthIndex + 1);
            setSelectedDate(monthsData[monthIndex + 1].days[0].date);
        }
    };

    return (
        <div className="aero-modal-backdrop" onClick={onClose}>
            <div className="aero-modal-card fa-glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '680px', width: '94%', maxHeight: '92vh', overflowY: 'auto' }}>
                
                {/* Header */}
                <div className="aero-modal-header" style={{ paddingBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="aero-icon-bubble" style={{ background: 'var(--blue)', color: '#FFF' }}>
                            <FileText size={22} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <h2 style={{ fontSize: '1.20rem', fontWeight: 800, color: 'var(--dark-blue)', margin: 0 }}>
                                    Student Attendance & Campus Movement History
                                </h2>
                            </div>
                            <div style={{ fontSize: '0.80rem', color: 'var(--text-sub)', marginTop: '3px' }}>
                                Student: <strong style={{ color: 'var(--dark-blue)' }}>{activeStudent?.name || 'Daniel A'}</strong> • Email: <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--blue)' }}>{studentEmail}</span> • Dept: <strong>{activeStudent?.department || 'IT'}</strong>
                            </div>
                        </div>
                    </div>
                    <button type="button" className="aero-close-btn" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Overall Attendance Metrics Ribbon (Objective, Faculty Decision Compliant) */}
                <div className="aero-metric-ribbon" style={{ marginBottom: '14px' }}>
                    <div className="ribbon-col">
                        <span className="lbl">Overall Attendance</span>
                        <span className="val highlight">{currentMonthData.stats.overallAttendance}</span>
                    </div>
                    <div className="ribbon-col">
                        <span className="lbl">Periods Attended</span>
                        <span className="val">{currentMonthData.stats.periodsAttended}</span>
                    </div>
                    <div className="ribbon-col">
                        <span className="lbl">Total Classes Conducted</span>
                        <span className="val" style={{ color: 'var(--blue)', fontWeight: 800 }}>
                            {currentMonthData.stats.classesConducted}
                        </span>
                    </div>
                </div>

                {/* Attendance & Leave Breakdown Cards for Selected Month */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginBottom: '14px' }}>
                    <div style={{ background: '#F8FAFC', border: '1px solid rgba(19, 108, 252, 0.15)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.70rem', color: 'var(--text-sub)', textTransform: 'uppercase' }}>Present Days</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16A34A' }}>{currentMonthData.stats.presentDays} Days</div>
                    </div>
                    <div style={{ background: '#F8FAFC', border: '1px solid rgba(19, 108, 252, 0.15)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.70rem', color: 'var(--text-sub)', textTransform: 'uppercase' }}>Leaves / Absent</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#DC2626' }}>{currentMonthData.stats.leaves} Days</div>
                    </div>
                    <div style={{ background: '#F8FAFC', border: '1px solid rgba(19, 108, 252, 0.15)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.70rem', color: 'var(--text-sub)', textTransform: 'uppercase' }}>Event Exemption</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#9333EA' }}>{currentMonthData.stats.eventExemption} Day</div>
                    </div>
                    <div style={{ background: '#F8FAFC', border: '1px solid rgba(19, 108, 252, 0.15)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.70rem', color: 'var(--text-sub)', textTransform: 'uppercase' }}>College Holidays</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--blue)' }}>{currentMonthData.stats.collegeHolidays} Days</div>
                    </div>
                </div>

                {/* Month Navigator Switcher (< Previous Month / Next Month >) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 2px', marginBottom: '8px', background: 'rgba(19, 108, 252, 0.05)', borderRadius: '8px' }}>
                    <button 
                        type="button" 
                        className="aero-mini-btn" 
                        onClick={handlePrevMonth} 
                        disabled={monthIndex === 0}
                        title="Switch to Previous Month"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: monthIndex === 0 ? 0.4 : 1 }}
                    >
                        <ChevronLeft size={16} />
                        <span style={{ fontSize: '0.74rem', fontWeight: 700 }}>Prev Month</span>
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CalendarIcon size={16} color="var(--blue)" />
                        <span style={{ fontWeight: 800, color: 'var(--dark-blue)', fontSize: '0.96rem' }}>
                            {currentMonthData.name}
                        </span>
                        {monthIndex === 1 && (
                            <span className="aero-pill cyan" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>Current Month</span>
                        )}
                    </div>

                    <button 
                        type="button" 
                        className="aero-mini-btn" 
                        onClick={handleNextMonth} 
                        disabled={monthIndex === monthsData.length - 1}
                        title="Switch to Next Month"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: monthIndex === monthsData.length - 1 ? 0.4 : 1 }}
                    >
                        <span style={{ fontSize: '0.74rem', fontWeight: 700 }}>Next Month</span>
                        <ChevronRight size={16} />
                    </button>
                </div>

                {/* Day of Week Headers */}
                <div className="aero-calendar-weekdays">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(w => (
                        <div key={w} className="weekday-lbl">{w}</div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="aero-calendar-grid">
                    {/* Padding cells according to month starting day */}
                    {Array.from({ length: currentMonthData.emptyOffset }).map((_, i) => (
                        <div key={`empty-${i}`} className="calendar-day-cell empty"></div>
                    ))}

                    {daysData.map(d => {
                        const isSelected = d.date === selectedDate;
                        return (
                            <button
                                key={d.day}
                                type="button"
                                className={`calendar-day-cell ${d.status} ${isSelected ? 'selected' : ''}`}
                                onClick={() => d.status !== 'upcoming' && d.status !== 'weekend' && setSelectedDate(d.date)}
                                disabled={d.status === 'upcoming'}
                                title={`${d.date}: ${d.note || d.status}`}
                            >
                                <span className="day-num">{d.day}</span>
                                {d.status === 'present' && <span className="aero-dot green"></span>}
                                {d.status === 'leave' && <span className="aero-dot" style={{ background: '#9333EA' }}></span>}
                                {d.status === 'partial' && <span className="aero-dot amber"></span>}
                                {d.status === 'today' && <span className="aero-dot blue"></span>}
                            </button>
                        );
                    })}
                </div>

                {/* Selected Day Breakdown */}
                <div className="aero-day-detail-panel" style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CheckCircle2 size={18} color="var(--blue)" />
                            <strong style={{ color: 'var(--dark-blue)', fontSize: '0.90rem' }}>
                                Details for {activeDayInfo.date} ({activeDayInfo.status === 'today' ? 'Today' : activeDayInfo.status === 'leave' ? 'Event Exemption' : 'Completed'})
                            </strong>
                        </div>
                        <span className={`aero-pill ${activeDayInfo.status === 'leave' ? 'cyan' : 'green'}`}>
                            {activeDayInfo.status === 'leave' ? '★ Event Leave Exemption' : `${activeDayInfo.periods || 0} / 7 Periods Attended`}
                        </span>
                    </div>

                    <div className="aero-timeline-mini" style={{ marginTop: '10px' }}>
                        <div className="mini-trail-item">
                            <Clock size={14} color="#136CFC" />
                            <span>Periods 1 – 3 (09:00 AM – 11:50 AM):</span>
                            <strong>{activeDayInfo.room || 'Room 101 (Main Block)'}</strong>
                        </div>
                        <div className="mini-trail-item">
                            <Clock size={14} color="#136CFC" />
                            <span>Periods 4 – 5 (11:50 AM – 02:15 PM):</span>
                            <strong>{activeDayInfo.status === 'leave' ? 'Smart India Hackathon Venue' : 'Cloud Computing & Networks Lab (AL-02)'}</strong>
                        </div>
                        <div className="mini-trail-item">
                            <Clock size={14} color="#136CFC" />
                            <span>Periods 6 – 7 (02:15 PM – 04:05 PM Dismissal):</span>
                            <strong>{activeDayInfo.room || 'Dr. APJ Block Rm 207'}</strong>
                        </div>
                    </div>
                </div>

                {/* Physical Movement & Lab Relocation Trail */}
                <div style={{ marginTop: '14px', background: '#F8FAFC', border: '1px solid rgba(19, 108, 252, 0.15)', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Navigation size={16} color="var(--blue)" />
                            <span style={{ fontWeight: 800, color: 'var(--dark-blue)', fontSize: '0.86rem' }}>
                                Physical Classroom & Lab Movement Trail
                            </span>
                        </div>
                        <span className="aero-pill green" style={{ fontSize: '0.68rem' }}>
                            {studentMovements.length > 0 ? `${studentMovements.length} Movements Recorded` : 'Active Session'}
                        </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {studentMovements.length > 0 ? (
                            studentMovements.map((m, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFFFF', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.78rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <Clock size={13} color="var(--text-sub)" />
                                        <span style={{ color: 'var(--text-sub)' }}>
                                            {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '09:00 AM'}
                                        </span>
                                        <span style={{ fontWeight: 700, color: 'var(--dark-blue)' }}>
                                            {m.from_room ? `Room ${m.from_room}` : 'Classroom Arrival'}
                                        </span>
                                        <ArrowRight size={13} color="var(--blue)" />
                                        <span style={{ fontWeight: 800, color: 'var(--blue)' }}>
                                            Room {m.to_room || m.to_room_id} ({m.to_room_name || 'Lab'})
                                        </span>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                                            • {m.to_building || 'Campus'}
                                        </span>
                                    </div>
                                    <span className="aero-status-tag present" style={{ fontSize: '0.70rem', padding: '2px 8px' }}>
                                        ✓ OTP Verified
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFFFF', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.78rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Clock size={13} color="var(--text-sub)" />
                                        <span style={{ color: 'var(--text-sub)' }}>09:00 AM</span>
                                        <span style={{ fontWeight: 700, color: 'var(--dark-blue)' }}>Room 101 (Main Block)</span>
                                        <ArrowRight size={13} color="var(--blue)" />
                                        <span style={{ fontWeight: 800, color: 'var(--blue)' }}>Room AL-02 (Cloud Computing Lab)</span>
                                    </div>
                                    <span className="aero-status-tag present" style={{ fontSize: '0.70rem', padding: '2px 8px' }}>
                                        ✓ OTP Verified
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)', textAlign: 'center', paddingTop: '4px' }}>
                                    Live student movements update in real-time when students enter the lab faculty's 10-second OTP.
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Live Campus Presence & Device Lock Security Footer */}
                <div style={{ 
                    marginTop: '12px', 
                    padding: '12px 14px', 
                    background: 'var(--light-blue)', 
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MapPin size={16} color="var(--blue)" />
                        <div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>Live Campus Location</div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--dark-blue)' }}>
                                {fullReport?.currentLocation?.room_number 
                                    ? `Room ${fullReport.currentLocation.room_number} (${fullReport.currentLocation.building_name || 'Main Block'})` 
                                    : 'Room AL-02 (Applied Labs & Innovation Centre)'}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Laptop size={16} color="var(--blue)" />
                        <div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>Hardware Device Binding</div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--dark-blue)' }}>
                                {fullReport?.deviceLock?.device_name || 'Windows Workstation / Laptop (Bound)'}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
