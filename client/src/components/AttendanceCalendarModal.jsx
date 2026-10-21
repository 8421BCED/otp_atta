import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, X, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, MapPin, Clock } from 'lucide-react';

export const AttendanceCalendarModal = ({ isOpen, onClose, student, currentUser }) => {
    const activeStudent = student || currentUser;
    const [selectedDate, setSelectedDate] = useState('2026-10-21');
    const [currentMonth, setCurrentMonth] = useState('October 2026');
    const [dynamicStats, setDynamicStats] = useState(null);

    useEffect(() => {
        if (!isOpen || !activeStudent?.id) return;
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('fxec_token');
                const res = await fetch(`http://localhost:5000/api/attendance/student-details/${activeStudent.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.stats) setDynamicStats(data.stats);
                }
            } catch (err) {
                console.error('Failed to fetch student details for calendar modal:', err);
            }
        };
        fetchStats();
    }, [isOpen, activeStudent?.id]);

    if (!isOpen) return null;

    // October 2026 calendar days data
    // Days 1-22 with realistic simulated attendance history
    const daysData = [
        { day: 1, date: '2026-10-01', status: 'present', periods: 7, total: 7, room: 'Room 207' },
        { day: 2, date: '2026-10-02', status: 'present', periods: 7, total: 7, room: 'Room 207' },
        { day: 3, date: '2026-10-03', status: 'weekend', periods: 0, total: 0 },
        { day: 4, date: '2026-10-04', status: 'weekend', periods: 0, total: 0 },
        { day: 5, date: '2026-10-05', status: 'present', periods: 6, total: 7, room: 'AI & ML Lab' },
        { day: 6, date: '2026-10-06', status: 'present', periods: 7, total: 7, room: 'Room 207' },
        { day: 7, date: '2026-10-07', status: 'present', periods: 7, total: 7, room: 'Cloud Lab' },
        { day: 8, date: '2026-10-08', status: 'partial', periods: 5, total: 7, room: 'Room 207' },
        { day: 9, date: '2026-10-09', status: 'present', periods: 7, total: 7, room: 'Room 207' },
        { day: 10, date: '2026-10-10', status: 'weekend', periods: 0, total: 0 },
        { day: 11, date: '2026-10-11', status: 'weekend', periods: 0, total: 0 },
        { day: 12, date: '2026-10-12', status: 'present', periods: 7, total: 7, room: 'Room 207' },
        { day: 13, date: '2026-10-13', status: 'present', periods: 7, total: 7, room: 'AI & ML Lab' },
        { day: 14, date: '2026-10-14', status: 'present', periods: 7, total: 7, room: 'Room 207' },
        { day: 15, date: '2026-10-15', status: 'present', periods: 7, total: 7, room: 'Room 207' },
        { day: 16, date: '2026-10-16', status: 'present', periods: 7, total: 7, room: 'Cloud Lab' },
        { day: 17, date: '2026-10-17', status: 'weekend', periods: 0, total: 0 },
        { day: 18, date: '2026-10-18', status: 'weekend', periods: 0, total: 0 },
        { day: 19, date: '2026-10-19', status: 'present', periods: 7, total: 7, room: 'Room 207' },
        { day: 20, date: '2026-10-20', status: 'present', periods: 7, total: 7, room: 'Dr. APJ Block Rm 207' },
        { day: 21, date: '2026-10-21', status: 'present', periods: 7, total: 7, room: 'Dr. APJ Block Rm 207' },
        { day: 22, date: '2026-10-22', status: 'today', periods: 1, total: 7, room: 'Dr. APJ Block Rm 207' },
        { day: 23, date: '2026-10-23', status: 'upcoming' },
        { day: 24, date: '2026-10-24', status: 'upcoming' },
        { day: 25, date: '2026-10-25', status: 'upcoming' },
        { day: 26, date: '2026-10-26', status: 'upcoming' },
        { day: 27, date: '2026-10-27', status: 'upcoming' },
        { day: 28, date: '2026-10-28', status: 'upcoming' },
        { day: 29, date: '2026-10-29', status: 'upcoming' },
        { day: 30, date: '2026-10-30', status: 'upcoming' },
        { day: 31, date: '2026-10-31', status: 'upcoming' }
    ];

    const activeDayInfo = daysData.find(d => d.date === selectedDate) || daysData[20];

    return (
        <div className="aero-modal-backdrop" onClick={onClose}>
            <div className="aero-modal-card fa-glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px', width: '92%' }}>
                
                {/* Header */}
                <div className="aero-modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="aero-icon-bubble">
                            <CalendarIcon size={20} color="#136CFC" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--dark-blue)' }}>Attendance History & Calendar</h2>
                            <p style={{ fontSize: '0.74rem', color: 'var(--text-sub)' }}>
                                Student: <strong>{activeStudent?.name || 'Daniel A'}</strong> • Roll: {activeStudent?.roll_number || '950724IT021'} • Department of {activeStudent?.department || 'IT'}
                            </p>
                        </div>
                    </div>
                    <button type="button" className="aero-close-btn" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Overall Month Metric Ribbons */}
                <div className="aero-metric-ribbon">
                    <div className="ribbon-col">
                        <span className="lbl">Overall Attendance</span>
                        <span className="val highlight">{dynamicStats?.percentage !== undefined ? `${dynamicStats.percentage}%` : '96.8%'}</span>
                    </div>
                    <div className="ribbon-col">
                        <span className="lbl">Periods Present</span>
                        <span className="val">{dynamicStats?.presentPeriods !== undefined ? `${dynamicStats.presentPeriods} / ${dynamicStats.totalPeriods || 112}` : '108 / 112'}</span>
                    </div>
                    <div className="ribbon-col">
                        <span className="lbl">Exam Eligibility</span>
                        <span className="val" style={{ color: 'var(--blue)' }}>
                            {(dynamicStats?.percentage === undefined || dynamicStats.percentage >= 75) ? 'Eligible (Min 75%)' : 'Shortage (< 75%)'}
                        </span>
                    </div>
                </div>

                {/* Month Navigator */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ fontWeight: 800, color: 'var(--dark-blue)', fontSize: '0.92rem' }}>{currentMonth}</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <button type="button" className="aero-mini-btn"><ChevronLeft size={16} /></button>
                        <button type="button" className="aero-mini-btn"><ChevronRight size={16} /></button>
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
                        return (
                            <button
                                key={d.day}
                                type="button"
                                className={`calendar-day-cell ${d.status} ${isSelected ? 'selected' : ''}`}
                                onClick={() => d.status !== 'upcoming' && d.status !== 'weekend' && setSelectedDate(d.date)}
                                disabled={d.status === 'upcoming'}
                            >
                                <span className="day-num">{d.day}</span>
                                {d.status === 'present' && <span className="aero-dot green"></span>}
                                {d.status === 'partial' && <span className="aero-dot amber"></span>}
                                {d.status === 'today' && <span className="aero-dot blue"></span>}
                            </button>
                        );
                    })}
                </div>

                {/* Selected Day Breakdown */}
                <div className="aero-day-detail-panel">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CheckCircle2 size={18} color="var(--blue)" />
                            <strong style={{ color: 'var(--dark-blue)', fontSize: '0.9rem' }}>
                                Details for {activeDayInfo.date} ({activeDayInfo.status === 'today' ? 'Today' : 'Completed'})
                            </strong>
                        </div>
                        <span className="aero-pill green">
                            {activeDayInfo.periods || 0} / 7 Periods Attended
                        </span>
                    </div>

                    <div className="aero-timeline-mini">
                        <div className="mini-trail-item">
                            <Clock size={14} color="#136CFC" />
                            <span>Periods 1 – 3 (09:00 AM – 11:50 AM):</span>
                            <strong>{activeDayInfo.room || 'Dr. APJ Block Rm 207'}</strong>
                        </div>
                        <div className="mini-trail-item">
                            <Clock size={14} color="#136CFC" />
                            <span>Periods 4 – 5 (11:50 AM – 02:15 PM):</span>
                            <strong>AI & Machine Learning Lab</strong>
                        </div>
                        <div className="mini-trail-item">
                            <Clock size={14} color="#136CFC" />
                            <span>Periods 6 – 7 (02:15 PM – 04:05 PM Dismissal):</span>
                            <strong>Dr. APJ Block Rm 207</strong>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
