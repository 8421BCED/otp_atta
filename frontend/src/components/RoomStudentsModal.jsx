import React, { useState, useEffect } from 'react';
import { Users, Camera, Eye, EyeOff } from 'lucide-react';
import { Modal, Empty, Spinner, timeOf } from './kit';

export const RoomStudentsModal = ({ isOpen, onClose, roomId, roomName, buildingName }) => {
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [roomInfo, setRoomInfo] = useState(null);
    const [audit, setAudit] = useState(null);
    const [showPhoto, setShowPhoto] = useState(false);

    useEffect(() => {
        if (!isOpen || !roomId) return;
        let cancelled = false;
        setShowPhoto(false);
        setIsLoading(true);

        (async () => {
            try {
                const res = await fetch(`/api/attendance/room-live-roster/${roomId}`);
                const data = await res.json();
                if (!cancelled && data.students) {
                    setStudents(data.students);
                    setRoomInfo(data.room);
                }
            } catch (err) {
                console.error('Failed to fetch room roster:', err);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
            try {
                const res = await fetch(`/api/headcount/latest/${roomId}`);
                const data = await res.json();
                if (!cancelled) setAudit(data.hasAudit ? data.audit : null);
            } catch (e) {
                console.error('Failed to fetch audit:', e);
            }
        })();

        return () => { cancelled = true; };
    }, [isOpen, roomId]);

    const verified = audit?.match_status === 'verified';

    return (
        <Modal
            open={isOpen}
            onClose={onClose}
            size="lg"
            icon={Users}
            title={`Room ${roomInfo?.room_number || roomId}`}
            subtitle={`${roomInfo?.building_name || buildingName || 'Campus'}, ${roomInfo?.name || roomName || ''}  ${students.length} present`}
            footer={<button type="button" className="ui-btn" onClick={onClose}>Close</button>}
        >
            {audit && (
                <div className={`ui-alert ${verified ? 'ui-alert--success' : 'ui-alert--danger'}`} style={{ marginBottom: 16, flexDirection: 'column', gap: 10 }}>
                    <div className="u-row u-between" style={{ width: '100%' }}>
                        <div className="u-row" style={{ gap: 10 }}>
                            <Camera size={18} />
                            <span>
                                <strong>AI headcount:</strong> {audit.visual_count} seen, {audit.otp_count} codes verified
                                {audit.staff_name ? `, by ${audit.staff_name}` : ''}
                            </span>
                        </div>
                        <button type="button" className="ui-btn ui-btn--sm" onClick={() => setShowPhoto((s) => !s)}>
                            {showPhoto ? <EyeOff size={15} /> : <Eye size={15} />}
                            {showPhoto ? 'Hide photo' : 'View photo'}
                        </button>
                    </div>
                    {showPhoto && audit.image_url && (
                        <img src={audit.image_url} alt="Headcount snapshot" style={{ width: '100%', maxHeight: 360, objectFit: 'contain', borderRadius: 14, background: 'var(--ink)' }} />
                    )}
                </div>
            )}

            {isLoading ? (
                <Spinner label="Loading roster" />
            ) : students.length > 0 ? (
                <div className="ui-table-wrap table-scroll">
                    <table className="ui-table">
                        <thead>
                            <tr><th>Student</th><th>Department</th><th>Checked in</th><th>Status</th></tr>
                        </thead>
                        <tbody>
                            {students.map((st) => (
                                <tr key={st.student_id}>
                                    <td>
                                        <div className="cell-strong">{st.name}</div>
                                        <div className="cell-sub">{st.email}</div>
                                    </td>
                                    <td>{st.department}{st.year_of_study ? `, ${st.year_of_study}` : ''}</td>
                                    <td className="mono">{timeOf(st.marked_at, 'Live')}</td>
                                    <td><span className="ui-chip ui-chip--present">Present</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <Empty icon={Users} title="No one has checked in yet">Students appear here as soon as they enter the room code.</Empty>
            )}
        </Modal>
    );
};
