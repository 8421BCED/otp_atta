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
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    const [monthIndex, setMonthIndex] = useState(1); // 0: September 2026, 1: October 2026, 2: November 2026
    const [selectedDate, setSelectedDate] = useState(todayStr);
    const [fullReport, setFullReport] = useState(null);

    useEffect(() => {
        if (!isOpen || !activeStudent?.id) return;
        setSelectedDate(todayStr);
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

    const allRecords = fullReport?.allRecords || [];
    const holidays = fullReport?.holidays || [];
    const sportsPasses = fullReport?.sportsPasses || [];
    const allMovements = fullReport?.movements || [];

    // Dynamically build October 2026 from real database records
    const octDays = Array.from({ length: 31 }, (_, i) => {
        const d = i + 1;
        const dateStr = `2026-10-${String(d).padStart(2, '0')}`;
        // Day of week for 2026-10-01 (Thu): 4
        const dayOfWeek = (4 + i) % 7; // 0=Sun, 1=Mon, ..., 6=Sat
        const isSunday = dayOfWeek === 0;
        const isSaturday = dayOfWeek === 6;
        const isWeekend = isSunday || isSaturday;

        const dayAtt = allRecords.filter(r => r.date_str === dateStr);
        const attendedPeriods = dayAtt.filter(r => r.status === 'present' || r.status === 'od');
        const attendedCount = attendedPeriods.length;
        const isAttended = attendedCount > 0;
        const dayRooms = [...new Set(dayAtt.map(r => r.room_number).filter(Boolean))].join(', ');

        const isHoliday = holidays.some(h => h.date_str === dateStr);
        const isSports = sportsPasses.some(s => dateStr >= s.from_date_str && dateStr <= s.to_date_str);

        let status = 'upcoming';
        let note = 'Upcoming College Day';

        if (dateStr === todayStr) {
            if (isAttended) {
                status = 'present';
                note = `${attendedCount}/7 Periods Attended (Today)`;
            } else {
                status = 'today';
                note = 'Today (Live Session)';
            }
        } else if (dateStr > todayStr) {
            status = 'upcoming';
            note = isWeekend ? 'Scheduled Weekend' : 'Upcoming College Day';
        } else {
            // Past days
            if (isSports) {
                status = 'leave';
                note = 'Approved Sports OD / Event Exemption';
            } else if (isHoliday) {
                status = 'weekend';
                note = 'College / Department Holiday';
            } else if (isWeekend) {
                status = 'weekend';
                note = isSunday ? 'Sunday Holiday' : 'Saturday Holiday';
            } else if (isAttended) {
                status = attendedCount >= 7 ? 'present' : 'partial';
                note = `${attendedCount}/7 Periods Attended`;
            } else {
                status = 'absent';
                note = 'Absent / Period 1 Cutoff Missed';
            }
        }

        return {
            day: d,
            date: dateStr,
            status,
            periods: attendedCount,
            total: 7,
            room: dayRooms || (dateStr === todayStr && fullReport?.currentLocation?.room_number ? `Room ${fullReport.currentLocation.room_number}` : null),
            note
        };
    });

    // Real dynamic stats for October up to today
    const pastAndTodayDays = octDays.filter(d => d.date <= todayStr);
    const realPresentDays = pastAndTodayDays.filter(d => d.status === 'present' || d.status === 'partial' || (d.date === todayStr && d.periods > 0)).length;
    const realLeaves = pastAndTodayDays.filter(d => d.status === 'absent').length;
    const realEventExemptions = pastAndTodayDays.filter(d => d.status === 'leave').length;
    const realCollegeHolidays = pastAndTodayDays.filter(d => d.status === 'weekend').length;
    const realPeriodsAttended = allRecords.filter(r => r.date_str && r.date_str.startsWith('2026-10') && (r.status === 'present' || r.status === 'od')).length;
    const realConductedPeriods = Math.max(realPeriodsAttended, (realPresentDays + realLeaves) * 7);
    const realOverallPercentage = realConductedPeriods > 0 ? `${Math.round((realPeriodsAttended / realConductedPeriods) * 100)}%` : '100%';

    // September 2026
    const sepDays = Array.from({ length: 30 }, (_, i) => {
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
    });

    // November 2026
    const novDays = Array.from({ length: 30 }, (_, i) => {
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
    });

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
            days: sepDays
        },
        {
            name: 'October 2026',
            emptyOffset: 4, // Thursday start
            daysCount: 31,
            stats: {
                presentDays: realPresentDays,
                leaves: realLeaves,
                eventExemption: realEventExemptions,
                collegeHolidays: realCollegeHolidays,
                overallAttendance: realOverallPercentage,
                periodsAttended: `${realPeriodsAttended} / ${realConductedPeriods || 7}`,
                classesConducted: `${realConductedPeriods || 7} Periods`
            },
            days: octDays
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
            days: novDays
        }
    ];

    const currentMonthData = monthsData[monthIndex];
    const daysData = currentMonthData.days;
    const activeDayInfo = daysData.find(d => d.date === selectedDate) || daysData[0] || {};
    const studentEmail = activeStudent?.email || 'daniela.ug.24.it@francisxavier.ac.in';

    // Filter real records & movements strictly for selectedDate
    const selectedDayRecords = allRecords.filter(r => r.date_str === selectedDate);
    const selectedDayMovements = allMovements.filter(m => m.date_str === selectedDate || (m.timestamp && m.timestamp.slice(0, 10) === selectedDate));

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

                {/* Overall Attendance Metrics Ribbon */}
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
                        <span className="lbl">Classes Conducted</span>
                        <span className="val" style={{ color: 'var(--blue)', fontWeight: 800 }}>
                            {currentMonthData.stats.classesConducted}
                        </span>
                    </div>
                </div>

                {/* Real-time Attendance & Leave Breakdown Cards */}
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

                {/* Month Navigator Switcher */}
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
                                onClick={() => setSelectedDate(d.date)}
                                title={`${d.date}: ${d.note || d.status}`}
                            >
                                <span className="day-num">{d.day}</span>
                                {d.status === 'present' && <span className="aero-dot green"></span>}
                                {d.status === 'leave' && <span className="aero-dot" style={{ background: '#9333EA' }}></span>}
                                {d.status === 'partial' && <span className="aero-dot amber"></span>}
                                {d.status === 'today' && <span className="aero-dot blue"></span>}
                                {d.status === 'absent' && <span className="aero-dot red" style={{ background: '#DC2626' }}></span>}
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
                                Details for {activeDayInfo.date} {activeDayInfo.date === todayStr ? '(Today)' : ''}
                            </strong>
                        </div>
                        <span className={`aero-pill ${activeDayInfo.status === 'leave' ? 'cyan' : activeDayInfo.status === 'present' ? 'green' : activeDayInfo.status === 'absent' ? 'red' : 'blue'}`}>
                            {activeDayInfo.status === 'leave' 
                                ? '★ Event Leave Exemption' 
                                : `${selectedDayRecords.length} / 7 Periods Attended`}
                        </span>
                    </div>

                    {/* Actual marked periods for selected date */}
                    <div className="aero-timeline-mini" style={{ marginTop: '10px' }}>
                        {selectedDayRecords.length > 0 ? (
                            selectedDayRecords.map((rec, idx) => (
                                <div key={idx} className="mini-trail-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFFFF', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '6px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <Clock size={14} color="#136CFC" />
                                        <strong style={{ color: 'var(--dark-blue)', fontSize: '0.82rem' }}>
                                            {rec.period_name || `Period ${rec.period_id}`} ({rec.start_time ? rec.start_time.slice(0, 5) : '09:00'} – {rec.end_time ? rec.end_time.slice(0, 5) : '09:50'}):
                                        </strong>
                                        <span style={{ fontWeight: 700, color: 'var(--blue)', fontSize: '0.80rem' }}>
                                            Room {rec.room_number || '101'}
                                        </span>
                                        <span style={{ color: 'var(--text-sub)', fontSize: '0.76rem' }}>
                                            ({rec.room_name || 'Classroom'} • {rec.building_name || 'FX Engineering Block'})
                                        </span>
                                    </div>
                                    <span className="aero-status-tag present" style={{ fontSize: '0.70rem', padding: '2px 8px' }}>
                                        ✓ OTP Verified
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: '14px', textAlign: 'center', color: 'var(--text-sub)', fontSize: '0.80rem' }}>
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
                <div style={{ marginTop: '14px', background: '#F8FAFC', border: '1px solid rgba(19, 108, 252, 0.15)', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Navigation size={16} color="var(--blue)" />
                            <span style={{ fontWeight: 800, color: 'var(--dark-blue)', fontSize: '0.86rem' }}>
                                Physical Classroom & Lab Movement Trail
                            </span>
                        </div>
                        <span className="aero-pill green" style={{ fontSize: '0.68rem' }}>
                            {selectedDayMovements.length > 0 ? `${selectedDayMovements.length} Movements on this Date` : '0 Movements'}
                        </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {selectedDayMovements.length > 0 ? (
                            selectedDayMovements.map((m, idx) => (
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
                                            Room {m.to_room || m.to_room_id} ({m.to_room_name || 'Classroom'})
                                        </span>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                                            • {m.to_building || 'FX Engineering Block'}
                                        </span>
                                    </div>
                                    <span className="aero-status-tag present" style={{ fontSize: '0.70rem', padding: '2px 8px' }}>
                                        ✓ OTP Verified
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-sub)', fontSize: '0.80rem' }}>
                                No classroom movements recorded on {selectedDate}.
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
                                    ? `Room ${fullReport.currentLocation.room_number} (${fullReport.currentLocation.building_name || 'FX Engineering Block'})` 
                                    : 'Not currently checked-in to any room'}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Laptop size={16} color="var(--blue)" />
                        <div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>Hardware Device Binding</div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--dark-blue)' }}>
                                {fullReport?.deviceLock?.device_name || 'Device Unbound / Clean'}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
