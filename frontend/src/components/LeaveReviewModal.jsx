import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle2, XCircle, ArrowRight, Clock, User, Building, MapPin, AlertCircle } from 'lucide-react';

export const LeaveReviewModal = ({ isOpen, onClose, role = 'staff', department = 'IT' }) => {
    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [actionId, setActionId] = useState(null);
    const [actionType, setActionType] = useState(null); // 'forward' | 'approve' | 'reject'
    const [remarks, setRemarks] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notice, setNotice] = useState(null);

    const isHod = role === 'hod' || role === 'principal';

    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('fxec_token');
            const endpoint = isHod ? `/api/leave/hod-requests?department=${department}` : '/api/leave/mentor-requests';
            const res = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.requests) {
                setRequests(data.requests);
            }
        } catch (err) {
            console.error('Failed to load leave requests:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchRequests();
        }
    }, [isOpen, role, department]);

    if (!isOpen) return null;

    const handleActionSubmit = async (e) => {
        e.preventDefault();
        if (!actionId || !actionType) return;

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('fxec_token');
            const endpoint = isHod ? '/api/leave/hod-review' : '/api/leave/mentor-review';
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    applicationId: actionId,
                    action: actionType,
                    remarks: remarks.trim()
                })
            });

            const data = await res.json();
            if (res.ok) {
                setNotice({ type: 'success', text: data.message });
                setActionId(null);
                setActionType(null);
                setRemarks('');
                fetchRequests();
                setTimeout(() => setNotice(null), 4000);
            } else {
                setNotice({ type: 'error', text: data.error || 'Failed to process application' });
            }
        } catch (err) {
            console.error('Action submit error:', err);
            setNotice({ type: 'error', text: 'Server connection error.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter pending according to role
    const pendingList = isHod 
        ? requests.filter(r => r.status === 'pending_hod')
        : requests.filter(r => r.status === 'pending_mentor');

    const historyList = isHod
        ? requests.filter(r => r.status !== 'pending_hod')
        : requests.filter(r => r.status !== 'pending_mentor');

    return (
        <div className="aero-modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
            <div 
                className="aero-modal-card" 
                onClick={(e) => e.stopPropagation()} 
                style={{ width: '95%', maxWidth: '880px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
            >
                {/* Header */}
                <div className="aero-modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: isHod ? '#ECFDF5' : '#EFF6FF', color: isHod ? '#059669' : '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FileText size={20} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, color: 'var(--dark-blue)', fontSize: '1.05rem' }}>
                                {isHod ? 'HOD Leave & OD Sanction Portal' : 'Faculty Mentor Leave Endorsement'}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-sub)' }}>
                                {isHod 
                                    ? `Final sanction of student leave applications with automated 100% On-Duty (OD) credit`
                                    : `Review and endorse applications to forward to HOD Dr. Caroline`}
                            </div>
                        </div>
                    </div>
                    <button type="button" className="aero-modal-close" onClick={onClose}>&times;</button>
                </div>

                {/* Body Content */}
                <div style={{ padding: '18px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    
                    {notice && (
                        <div className={notice.type === 'success' ? 'aero-alert-success' : 'aero-alert-error'} style={{ fontWeight: 700 }}>
                            {notice.text}
                        </div>
                    )}

                    {/* Pending Reviews Section */}
                    <div>
                        <div style={{ fontWeight: 800, color: 'var(--dark-blue)', fontSize: '0.92rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>Action Required ({pendingList.length})</span>
                            <span style={{ fontSize: '0.70rem', background: '#FEE2E2', color: '#DC2626', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
                                Pending
                            </span>
                        </div>

                        {isLoading ? (
                            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-sub)' }}>Loading applications...</div>
                        ) : pendingList.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', background: '#F8FAFC', borderRadius: '10px', border: '1px dashed #CBD5E1', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                                All student leave applications have been reviewed! No pending requests.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {pendingList.map(app => (
                                    <div
                                        key={app.id}
                                        style={{
                                            background: '#FFFFFF',
                                            border: '1.5px solid rgba(19, 108, 252, 0.25)',
                                            borderRadius: '12px',
                                            padding: '14px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                            <div>
                                                <div style={{ fontWeight: 800, color: 'var(--dark-blue)', fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span>{app.student_name}</span>
                                                    <span style={{ fontSize: '0.74rem', color: 'var(--text-sub)', fontWeight: 600 }}>({app.roll_number || app.student_email})</span>
                                                    <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: app.type === 'internal' ? '#EFF6FF' : '#FEF3C7', color: app.type === 'internal' ? '#1D4ED8' : '#B45309', fontWeight: 800, textTransform: 'uppercase' }}>
                                                        {app.type}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.76rem', color: 'var(--text-sub)', marginTop: '2px' }}>
                                                    Event: <strong>{app.event_name}</strong> • {app.category} • {app.venue || 'FXEC'}
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {isHod ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="duo-btn duo-btn-green xs"
                                                            onClick={() => {
                                                                setActionId(app.id);
                                                                setActionType('approve');
                                                                setRemarks('Approved by HOD with full OD attendance credit.');
                                                            }}
                                                        >
                                                            <CheckCircle2 size={12} />
                                                            <span>Approve & Grant OD</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="duo-btn duo-btn-red xs"
                                                            onClick={() => {
                                                                setActionId(app.id);
                                                                setActionType('reject');
                                                                setRemarks('Rejected.');
                                                            }}
                                                        >
                                                            <XCircle size={12} />
                                                            <span>Reject</span>
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="duo-btn duo-btn-blue xs"
                                                            onClick={() => {
                                                                setActionId(app.id);
                                                                setActionType('forward');
                                                                setRemarks('Recommended and forwarded to HOD.');
                                                            }}
                                                        >
                                                            <ArrowRight size={12} />
                                                            <span>Forward to HOD</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="duo-btn duo-btn-red xs"
                                                            onClick={() => {
                                                                setActionId(app.id);
                                                                setActionType('reject');
                                                                setRemarks('Rejected by mentor.');
                                                            }}
                                                        >
                                                            <XCircle size={12} />
                                                            <span>Reject</span>
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ fontSize: '0.78rem', color: '#475569', background: '#F8FAFC', padding: '8px 12px', borderRadius: '8px' }}>
                                            <div><strong>Dates:</strong> {app.from_date?.slice(0, 10)} to {app.to_date?.slice(0, 10)} ({app.is_all_day ? 'All Periods' : `Periods ${app.from_period}-${app.to_period}`})</div>
                                            <div style={{ marginTop: '2px' }}><strong>Reason:</strong> {app.reason}</div>
                                            {app.mentor_remarks && (
                                                <div style={{ marginTop: '2px', color: '#1D4ED8' }}><strong>Mentor Recommendation:</strong> {app.mentor_remarks}</div>
                                            )}
                                        </div>

                                        {/* Inline Action Confirm Form */}
                                        {actionId === app.id && (
                                            <form onSubmit={handleActionSubmit} style={{ marginTop: '6px', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '10px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1E40AF' }}>
                                                    Confirm {actionType.toUpperCase()}: Add optional remarks below
                                                </div>
                                                <input
                                                    type="text"
                                                    className="fx-select"
                                                    style={{ width: '100%', fontSize: '0.78rem' }}
                                                    value={remarks}
                                                    onChange={(e) => setRemarks(e.target.value)}
                                                    placeholder="Enter remarks..."
                                                />
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                                                    <button type="button" className="duo-btn duo-btn-slate xs" onClick={() => setActionId(null)}>
                                                        Cancel
                                                    </button>
                                                    <button type="submit" className={`duo-btn ${actionType === 'reject' ? 'duo-btn-red' : 'duo-btn-green'} xs`} disabled={isSubmitting}>
                                                        <span>{isSubmitting ? 'Saving...' : `Confirm ${actionType}`}</span>
                                                    </button>
                                                </div>
                                            </form>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Reviewed History */}
                    {historyList.length > 0 && (
                        <div style={{ marginTop: '12px' }}>
                            <div style={{ fontWeight: 800, color: 'var(--dark-blue)', fontSize: '0.88rem', marginBottom: '8px' }}>
                                Past Reviewed Applications ({historyList.length})
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {historyList.slice(0, 5).map(app => (
                                    <div key={app.id} style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                                        <div>
                                            <strong>{app.student_name}</strong> – {app.event_name} ({app.from_date?.slice(0, 10)})
                                        </div>
                                        <span style={{ fontWeight: 800, color: app.status === 'approved' ? '#16A34A' : (app.status === 'rejected' ? '#DC2626' : '#2563EB') }}>
                                            {app.status.toUpperCase()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-card)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="button" className="duo-btn duo-btn-slate sm" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
