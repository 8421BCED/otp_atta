import React, { useState, useEffect } from 'react';
import { Users, X, Clock, MapPin, CheckCircle2, Camera, AlertTriangle, Eye } from 'lucide-react';

export const RoomStudentsModal = ({ isOpen, onClose, roomId, roomName, buildingName }) => {
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [roomInfo, setRoomInfo] = useState(null);
    const [audit, setAudit] = useState(null);
    const [showFullPhoto, setShowFullPhoto] = useState(false);

    useEffect(() => {
        if (!isOpen || !roomId) return;

        const fetchRoster = async () => {
            setIsLoading(true);
            try {
                const token = localStorage.getItem('fxec_token');
                const res = await fetch(`/api/attendance/room-live-roster/${roomId}`, {
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

        const fetchAudit = async () => {
            try {
                const token = localStorage.getItem('fxec_token');
                const res = await fetch(`/api/headcount/latest/${roomId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.hasAudit && data.audit) {
                    setAudit(data.audit);
                } else {
                    setAudit(null);
                }
            } catch (e) {
                console.error('Failed to fetch audit in room modal:', e);
            }
        };

        fetchRoster();
        fetchAudit();
        setShowFullPhoto(false);
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
                {/* Active AI YOLO Headcount Audit Snapshot if available */}
                {audit && (
                    <div style={{
                        margin: '12px 0 14px 0',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        background: audit.match_status === 'verified' ? '#F0FDF4' : '#FEF2F2',
                        border: `1.5px solid ${audit.match_status === 'verified' ? '#86EFAC' : '#FCA5A5'}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    background: audit.match_status === 'verified' ? '#16A34A' : '#DC2626',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#FFF'
                                }}>
                                    <Camera size={16} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', color: audit.match_status === 'verified' ? '#15803D' : '#991B1B' }}>
                                        AI Headcount Audit (YOLO Vision)
                                    </div>
                                    <div style={{ fontSize: '0.80rem', fontWeight: 700, color: audit.match_status === 'verified' ? '#14532D' : '#7F1D1D' }}>
                                        {audit.visual_count} Faces Detected vs {audit.otp_count} OTPs Verified • By {audit.staff_name || 'Faculty'}
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                className="fx-btn-outline"
                                style={{ padding: '4px 10px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                                onClick={() => setShowFullPhoto(!showFullPhoto)}
                            >
                                <Eye size={13} />
                                <span>{showFullPhoto ? 'Hide Photo' : 'View YOLO Photo'}</span>
                            </button>
                        </div>

                        {showFullPhoto && audit.image_url && (
                            <div style={{ borderRadius: '8px', overflow: 'hidden', background: '#0F172A', textAlign: 'center', marginTop: '6px' }}>
                                <img 
                                    src={audit.image_url} 
                                    alt="YOLO Headcount Audit" 
                                    style={{ width: '100%', maxHeight: '380px', objectFit: 'contain' }}
                                />
                                <div style={{ padding: '6px 12px', fontSize: '0.72rem', color: '#94A3B8' }}>
                                    Neon green bounding boxes show AI detected student faces (#1, #2, ...). Valid for 1 hour.
                                </div>
                            </div>
                        )}
                    </div>
                )}

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
                                        <th>Official Email</th>
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
                                                {st.email}
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
