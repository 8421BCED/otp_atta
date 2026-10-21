import React, { useState, useEffect } from 'react';
import { Users, X, Clock, MapPin, CheckCircle2 } from 'lucide-react';

export const RoomStudentsModal = ({ isOpen, onClose, roomId, roomName, buildingName }) => {
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [roomInfo, setRoomInfo] = useState(null);

    useEffect(() => {
        if (!isOpen || !roomId) return;

        const fetchRoster = async () => {
            setIsLoading(true);
            try {
                const token = localStorage.getItem('fxec_token');
                const res = await fetch(`http://localhost:5000/api/attendance/room-live-roster/${roomId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.students) {
                    setStudents(data.students);
                    setRoomInfo(data.room);
                }
            } catch (err) {
                console.error('Failed to fetch room roster:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRoster();
    }, [isOpen, roomId]);

    if (!isOpen) return null;

    return (
        <div className="aero-modal-backdrop" onClick={onClose}>
            <div className="aero-modal-card fa-glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px', width: '92%' }}>
                
                {/* Header */}
                <div className="aero-modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="aero-icon-bubble">
                            <Users size={20} color="#136CFC" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--dark-blue)' }}>
                                Room {roomInfo?.room_number || roomId} Live Students
                            </h2>
                            <p style={{ fontSize: '0.74rem', color: 'var(--text-sub)' }}>
                                {roomInfo?.building_name || buildingName || 'Campus'} • {roomInfo?.name || roomName} ({students.length} Verified Present)
                            </p>
                        </div>
                    </div>
                    <button type="button" className="aero-close-btn" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '8px 0' }}>
                    {isLoading ? (
                        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-sub)', fontSize: '0.85rem' }}>
                            Loading live classroom students...
                        </div>
                    ) : students.length > 0 ? (
                        <div className="fx-table-container" style={{ maxHeight: '360px' }}>
                            <table className="fx-table">
                                <thead>
                                    <tr>
                                        <th>Roll Number</th>
                                        <th>Student Name</th>
                                        <th>Dept & Year</th>
                                        <th>Checked In</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((st, idx) => (
                                        <tr key={idx}>
                                            <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--blue)' }}>
                                                {st.roll_number}
                                            </td>
                                            <td style={{ fontWeight: 700, color: 'var(--dark-blue)' }}>
                                                {st.name}
                                            </td>
                                            <td>
                                                {st.department} • {st.year_of_study || '2nd Year'}
                                            </td>
                                            <td style={{ fontSize: '0.74rem', color: 'var(--text-sub)' }}>
                                                {st.marked_at ? new Date(st.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Live'}
                                            </td>
                                            <td>
                                                <span className="aero-status-tag present">
                                                    ✓ Present
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                            No students have submitted the OTP for Room {roomInfo?.room_number || roomId} yet today.
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                    <button type="button" className="fx-btn-outline" onClick={onClose}>
                        Close
                    </button>
                </div>

            </div>
        </div>
    );
};
