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
    Shield, 
    Award, 
    FileText, 
    Building2, 
    Laptop,
    Sparkles
} from 'lucide-react';

export const AttendanceCalendarModal = ({ isOpen, onClose, student, currentUser }) => {
    const activeStudent = student || currentUser;
    const [selectedDate, setSelectedDate] = useState('2026-10-21');
    const [currentMonth, setCurrentMonth] = useState('October 2026');
    const [fullReport, setFullReport] = useState(null);

    useEffect(() => {
        if (!isOpen || !activeStudent?.id) return;
        const fetchStudentReport = async () => {
            try {
                const token = localStorage.getItem('fxec_token');
                const res = await fetch(`http://localhost:5000/api/attendance/student-details/${activeStudent.id}`, {
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

    // October 2026 calendar days data
    // Complete simulated and dynamic attendance history for the month
    const daysData = [
        { day: 1, date: '2026-10-01', status: 'present', periods: 7, total: 7, room: 'Room 207', note: 'Full Attendance' },
        { day: 2, date: '2026-10-02', status: 'present', periods: 7, total: 7, room: 'Room 207', note: 'Full Attendance' },
        { day: 3, date: '2026-10-03', status: 'weekend', periods: 0, total: 0, note: 'Saturday (College Holiday)' },
        { day: 4, date: '2026-10-04', status: 'weekend', periods: 0, total: 0, note: 'Sunday (Weekly Holiday)' },
        { day: 5, date: '2026-10-05', status: 'present', periods: 6, total: 7, room: 'AI & ML Lab', note: '6 Periods Attended' },
        { day: 6, date: '2026-10-06', status: 'present', periods: 7, total: 7, room: 'Room 207', note: 'Full Attendance' },
        { day: 7, date: '2026-10-07', status: 'present', periods: 7, total: 7, room: 'Cloud Lab', note: 'Full Attendance' },
        { day: 8, date: '2026-10-08', status: 'leave', periods: 7, total: 7, room: 'College Auditorium', note: 'Smart India Hackathon (Approved Leave Exemption)' },
        { day: 9, date: '2026-10-09', status: 'present', periods: 7, total: 7, room: 'Room 207', note: 'Full Attendance' },
        { day: 10, date: '2026-10-10', status: 'weekend', periods: 0, total: 0, note: 'Saturday (Institutional Holiday)' },
        { day: 11, date: '2026-10-11', status: 'weekend', periods: 0, total: 0, note: 'Sunday (Weekly Holiday)' },
        { day: 12, date: '2026-10-12', status: 'present', periods: 7, total: 7, room: 'Room 207', note: 'Full Attendance' },
        { day: 13, date: '2026-10-13', status: 'present', periods: 7, total: 7, room: 'AI & ML Lab', note: 'Full Attendance' },
        { day: 14, date: '2026-10-14', status: 'present', periods: 7, total: 7, room: 'Room 207', note: 'Full Attendance' },
        { day: 15, date: '2026-10-15', status: 'present', periods: 7, total: 7, room: 'Room 207', note: 'Full Attendance' },
        { day: 16, date: '2026-10-16', status: 'present', periods: 7, total: 7, room: 'Cloud Lab', note: 'Full Attendance' },
        { day: 17, date: '2026-10-17', status: 'weekend', periods: 0, total: 0, note: 'Saturday (Holiday)' },
        { day: 18, date: '2026-10-18', status: 'weekend', periods: 0, total: 0, note: 'Sunday (Holiday)' },
        { day: 19, date: '2026-10-19', status: 'present', periods: 7, total: 7, room: 'Room 207', note: 'Full Attendance' },
        { day: 20, date: '2026-10-20', status: 'present', periods: 7, total: 7, room: 'Dr. APJ Block Rm 207', note: 'Full Attendance' },
        { day: 21, date: '2026-10-21', status: 'present', periods: 7, total: 7, room: 'Dr. APJ Block Rm 207', note: 'Full Attendance' },
        { day: 22, date: '2026-10-22', status: 'today', periods: fullReport?.todayRecords?.length || 1, total: 7, room: fullReport?.currentLocation?.room_number ? `Room ${fullReport.currentLocation.room_number}` : 'Dr. APJ Block Rm 207', note: 'Today (Live Session)' },
        { day: 23, date: '2026-10-23', status: 'upcoming', note: 'Upcoming College Day' },
        { day: 24, date: '2026-10-24', status: 'upcoming', note: 'Upcoming College Day' },
        { day: 25, date: '2026-10-25', status: 'upcoming', note: 'Upcoming Weekend' },
        { day: 26, date: '2026-10-26', status: 'upcoming', note: 'Upcoming College Day' },
        { day: 27, date: '2026-10-27', status: 'upcoming', note: 'Upcoming College Day' },
        { day: 28, date: '2026-10-28', status: 'upcoming', note: 'Upcoming College Day' },
        { day: 29, date: '2026-10-29', status: 'upcoming', note: 'Upcoming College Day' },
        { day: 30, date: '2026-10-30', status: 'upcoming', note: 'Upcoming College Day' },
        { day: 31, date: '2026-10-31', status: 'upcoming', note: 'Upcoming College Day' }
    ];

    const activeDayInfo = daysData.find(d => d.date === selectedDate) || daysData[20];
    const stats = fullReport?.stats;
    const rollNo = activeStudent?.roll_number || '950724IT021';

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
                                    Official Student Attendance & Leave Report
                                </h2>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-sub)', marginTop: '3px' }}>
                                Student: <strong style={{ color: 'var(--dark-blue)' }}>{activeStudent?.name || 'Daniel A'}</strong> • Roll No: <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--blue)' }}>{rollNo}</span> • Dept: <strong>{activeStudent?.department || 'IT'}</strong>
                            </div>
                        </div>
                    </div>
                    <button type="button" className="aero-close-btn" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Roll Number Format Guide Tooltip / Note */}
                <div style={{ background: '#F1F5F9', padding: '6px 12px', borderRadius: '8px', fontSize: '0.72rem', color: 'var(--text-sub)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <Shield size={13} color="var(--blue)" />
                    <span>
                        <strong>Roll Number Format:</strong> 9507 (FXEC College Code) • 24 (2024 Joining Batch) • {activeStudent?.department || 'IT'} (Dept) • {rollNo.slice(-3)} (Student Serial No)
                    </span>
                </div>

                {/* Overall Attendance Metrics Ribbon */}
                <div className="aero-metric-ribbon" style={{ marginBottom: '14px' }}>
                    <div className="ribbon-col">
                        <span className="lbl">Overall Attendance</span>
                        <span className="val highlight">{stats?.percentage !== undefined ? `${stats.percentage}%` : '96.8%'}</span>
                    </div>
                    <div className="ribbon-col">
                        <span className="lbl">Periods Attended</span>
                        <span className="val">{stats?.presentPeriods !== undefined ? `${stats.presentPeriods} / ${stats.totalPeriods || 112}` : '108 / 112'}</span>
                    </div>
                    <div className="ribbon-col">
                        <span className="lbl">Exam Eligibility</span>
                        <span className="val" style={{ color: '#16A34A', fontWeight: 800 }}>
                            {(stats?.percentage === undefined || stats.percentage >= 75) ? '✓ Eligible (Min 75%)' : '⚠ Condonation / Shortage'}
                        </span>
                    </div>
                </div>

                {/* Attendance & Leave Breakdown Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginBottom: '14px' }}>
                    <div style={{ background: '#F8FAFC', border: '1px solid rgba(19, 108, 252, 0.15)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.70rem', color: 'var(--text-sub)', textTransform: 'uppercase' }}>Present Days</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16A34A' }}>17 Days</div>
                    </div>
                    <div style={{ background: '#F8FAFC', border: '1px solid rgba(19, 108, 252, 0.15)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.70rem', color: 'var(--text-sub)', textTransform: 'uppercase' }}>Leaves / Absent</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#DC2626' }}>0 Days</div>
                    </div>
                    <div style={{ background: '#F8FAFC', border: '1px solid rgba(19, 108, 252, 0.15)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.70rem', color: 'var(--text-sub)', textTransform: 'uppercase' }}>Event Exemption</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#9333EA' }}>1 Day</div>
                    </div>
                    <div style={{ background: '#F8FAFC', border: '1px solid rgba(19, 108, 252, 0.15)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.70rem', color: 'var(--text-sub)', textTransform: 'uppercase' }}>College Holidays</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--blue)' }}>4 Days</div>
                    </div>
                </div>

                {/* Month Navigator */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CalendarIcon size={16} color="var(--blue)" />
                        <span style={{ fontWeight: 800, color: 'var(--dark-blue)', fontSize: '0.94rem' }}>{currentMonth}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <button type="button" className="aero-mini-btn" title="Previous Month"><ChevronLeft size={16} /></button>
                        <button type="button" className="aero-mini-btn" title="Next Month"><ChevronRight size={16} /></button>
                    </div>
                </div>

                {/* Day of Week Headers */}
                <div className="aero-calendar-weekdays">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(w => (
                        <div key={w} className="weekday-lbl">{w}</div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="aero-calendar-grid">
                    {/* Padding for Oct 1 2026 (Thursday = 4 empty cells) */}
                    <div className="calendar-day-cell empty"></div>
                    <div className="calendar-day-cell empty"></div>
                    <div className="calendar-day-cell empty"></div>
                    <div className="calendar-day-cell empty"></div>

                    {daysData.map(d => {
                        const isSelected = d.date === selectedDate;
                        const isLeave = d.status === 'leave';

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
                            <strong>{activeDayInfo.room || 'Dr. APJ Block Rm 207'}</strong>
                        </div>
                        <div className="mini-trail-item">
                            <Clock size={14} color="#136CFC" />
                            <span>Periods 4 – 5 (11:50 AM – 02:15 PM):</span>
                            <strong>{activeDayInfo.status === 'leave' ? 'Hackathon / Competition Venue' : 'AI & Machine Learning Lab'}</strong>
                        </div>
                        <div className="mini-trail-item">
                            <Clock size={14} color="#136CFC" />
                            <span>Periods 6 – 7 (02:15 PM – 04:05 PM Dismissal):</span>
                            <strong>{activeDayInfo.room || 'Dr. APJ Block Rm 207'}</strong>
                        </div>
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
                                    : 'Room 207 (IT Lecture Hall)'}
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
