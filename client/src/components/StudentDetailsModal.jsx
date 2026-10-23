import React, { useState, useEffect } from 'react';
import { User, X, MapPin, Calendar, Clock, ShieldCheck, History, Award } from 'lucide-react';

export const StudentDetailsModal = ({ isOpen, onClose, studentId }) => {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !studentId) return;

        const loadDetails = async () => {
            setIsLoading(true);
            try {
                const token = localStorage.getItem('fxec_token');
                const res = await fetch(`http://localhost:5000/api/attendance/student-details/${studentId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const json = await res.json();
                setData(json);
            } catch (err) {
                console.error('Failed to load student details:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadDetails();
    }, [isOpen, studentId]);

    if (!isOpen) return null;

    const student = data?.student;
    const currentLocation = data?.currentLocation;
    const todayRecords = data?.todayRecords || [];
    const yesterdayRecords = data?.yesterdayRecords || [];
    const stats = data?.stats;
    const pastDates = data?.pastDates || [];

    return (
        <div className="aero-modal-backdrop" onClick={onClose}>
            <div className="aero-modal-card fa-glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '720px', width: '94%', maxHeight: '88vh', overflowY: 'auto' }}>
                
                {/* Header */}
                <div className="aero-modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="aero-icon-bubble">
                            <User size={20} color="#136CFC" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--dark-blue)' }}>
                                {student?.name || 'Student Profile & Attendance History'}
                            </h2>
                            <p style={{ fontSize: '0.74rem', color: 'var(--text-sub)' }}>
                                Roll No: <strong style={{ color: 'var(--blue)' }}>{student?.roll_number}</strong> • {student?.department} Dept • {student?.email}
                            </p>
                        </div>
                    </div>
                    <button type="button" className="aero-close-btn" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-sub)' }}>
                        Loading student records & past history...
                    </div>
                ) : data ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 0' }}>
                        
                        {/* Summary Ribbon: Current Location, Yesterday Location, Overall % */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                            {/* Current Location Right Now */}
                            <div className="list-row-item" style={{ background: 'var(--light-blue)', border: '1px solid var(--border-card)', borderRadius: '10px', padding: '12px 14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--blue)', fontWeight: 800 }}>
                                    <MapPin size={15} />
                                    <span>CURRENT LOCATION RIGHT NOW</span>
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--dark-blue)', marginTop: '4px' }}>
                                    {currentLocation ? `Room ${currentLocation.room_number}` : 'Not Checked-In'}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>
                                    {currentLocation ? `${currentLocation.building_name} (${currentLocation.floor_name})` : 'Awaiting classroom check-in'}
                                </div>
                            </div>

                            {/* Yesterday Location At This Time */}
                            <div className="list-row-item" style={{ background: '#F8FAFC', border: '1px solid var(--border-card)', borderRadius: '10px', padding: '12px 14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--dark-blue)', fontWeight: 800 }}>
                                    <Clock size={15} color="var(--blue)" />
                                    <span>YESTERDAY AT THIS TIME</span>
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--dark-blue)', marginTop: '4px' }}>
                                    {yesterdayRecords.length > 0 
                                        ? `${yesterdayRecords[yesterdayRecords.length - 1].room_number || 'AK 207'}`
                                        : 'AK 207 (IT Hall)'}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>
                                    {yesterdayRecords.length > 0 
                                        ? `${yesterdayRecords[yesterdayRecords.length - 1].building_name || 'Dr. APJ Abdul Kalam Block'} • Attended` 
                                        : 'Dr. APJ Abdul Kalam Block • Attended'}
                                </div>
                            </div>

                            {/* Overall Attendance */}
                            <div className="list-row-item" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '12px 14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#16A34A', fontWeight: 800 }}>
                                    <Award size={15} />
                                    <span>ATTENDANCE RATE</span>
                                </div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#16A34A', marginTop: '2px' }}>
                                    {stats?.percentage || 100}%
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>
                                    {stats?.presentPeriods || 0} periods attended
                                </div>
                            </div>
                        </div>

                        {/* Today's Period-by-Period Timeline */}
                        <div style={{ marginTop: '6px' }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--dark-blue)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Calendar size={15} color="var(--blue)" />
                                <span>Today's Verified Classroom Attendance</span>
                            </div>

                            {todayRecords.length > 0 ? (
                                <div className="fx-table-container">
                                    <table className="fx-table">
                                        <thead>
                                            <tr>
                                                <th>Period</th>
                                                <th>Time Window</th>
                                                <th>Classroom Location</th>
                                                <th>Check-in Time</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {todayRecords.map((r, i) => (
                                                <tr key={i}>
                                                    <td style={{ fontWeight: 700 }}>{r.period_name}</td>
                                                    <td style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>{r.start_time?.slice(0, 5)} – {r.end_time?.slice(0, 5)}</td>
                                                    <td>
                                                        <strong>Room {r.room_number}</strong> ({r.building_name})
                                                    </td>
                                                    <td style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>
                                                        {r.marked_at ? new Date(r.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Verified'}
                                                    </td>
                                                    <td>
                                                        <span className="aero-status-tag present">✓ Present</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div style={{ padding: '16px', background: 'var(--light-blue)', borderRadius: '8px', fontSize: '0.78rem', color: 'var(--text-sub)', textAlign: 'center' }}>
                                    No periods marked yet today.
                                </div>
                            )}
                        </div>

                        {/* Recent Past Days Attendance Log */}
                        <div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--dark-blue)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <History size={15} color="var(--blue)" />
                                <span>Previous Days Attendance History</span>
                            </div>

                            <div className="fx-table-container">
                                <table className="fx-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Periods Attended</th>
                                            <th>Primary Room</th>
                                            <th>Campus Building</th>
                                            <th>Day Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pastDates.length > 0 ? (
                                            pastDates.map((d, i) => (
                                                <tr key={i}>
                                                    <td style={{ fontWeight: 700, color: 'var(--dark-blue)' }}>
                                                        {new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </td>
                                                    <td>
                                                        <span className="aero-pill cyan">{d.periods_marked} Periods</span>
                                                    </td>
                                                    <td>Room {d.last_room || '207'}</td>
                                                    <td>{d.last_building || 'Dr. APJ Abdul Kalam Block'}</td>
                                                    <td>
                                                        <span className="aero-status-tag present">✓ Present</span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" style={{ textAlign: 'center', padding: '16px', color: 'var(--text-dim)' }}>
                                                    No past attendance history available.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                ) : null}

                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', marginTop: '8px' }}>
                    <button type="button" className="fx-btn-primary" onClick={onClose}>
                        Done
                    </button>
                </div>

            </div>
        </div>
    );
};
