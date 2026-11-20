import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle2, XCircle, ArrowRight, Inbox } from 'lucide-react';
import { Modal, Empty, Spinner, IconTile, Segmented } from './kit';

const STATUS_CHIP = {
    approved: ['present', 'Approved'],
    rejected: ['absent', 'Rejected'],
    pending_hod: ['od', 'With HOD'],
    pending_mentor: ['od', 'With mentor']
};

const LeaveReviewBody = ({ role, department }) => {
    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [tab, setTab] = useState('pending');
    const [actionId, setActionId] = useState(null);
    const [actionType, setActionType] = useState(null); // forward | approve | reject
    const [remarks, setRemarks] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notice, setNotice] = useState(null);

    const isHod = role === 'hod' || role === 'principal';

    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            const endpoint = isHod ? `/api/leave/hod-requests?department=${encodeURIComponent(department)}` : '/api/leave/mentor-requests';
            const res = await fetch(endpoint);
            const data = await res.json();
            if (data.requests) setRequests(data.requests);
        } catch (err) {
            console.error('Failed to load leave requests:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchRequests(); }, [role, department]);

    const pendingStatus = isHod ? 'pending_hod' : 'pending_mentor';
    const pending = requests.filter((r) => r.status === pendingStatus);
    const history = requests.filter((r) => r.status !== pendingStatus);
    const shown = tab === 'pending' ? pending : history;

    const begin = (id, type, text) => { setActionId(id); setActionType(type); setRemarks(text); };

    const submit = async (e) => {
        e.preventDefault();
        if (!actionId || !actionType) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(isHod ? '/api/leave/hod-review' : '/api/leave/mentor-review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ applicationId: actionId, action: actionType, remarks: remarks.trim() })
            });
            const data = await res.json();
            if (res.ok) {
                setNotice({ type: 'success', text: data.message });
                setActionId(null); setActionType(null); setRemarks('');
                fetchRequests();
                setTimeout(() => setNotice(null), 4000);
            } else {
                setNotice({ type: 'danger', text: data.error || 'Could not process the application' });
            }
        } catch (err) {
            setNotice({ type: 'danger', text: 'Server connection error.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const actions = (app) => (isHod ? (
        <>
            <button type="button" className="ui-btn ui-btn--primary ui-btn--sm" onClick={() => begin(app.id, 'approve', 'Approved with On-Duty credit.')}>
                <CheckCircle2 size={15} />Approve
            </button>
            <button type="button" className="ui-btn ui-btn--danger ui-btn--sm" onClick={() => begin(app.id, 'reject', 'Rejected.')}>
                <XCircle size={15} />Reject
            </button>
        </>
    ) : (
        <>
            <button type="button" className="ui-btn ui-btn--primary ui-btn--sm" onClick={() => begin(app.id, 'forward', 'Recommended and forwarded to the HOD.')}>
                <ArrowRight size={15} />Forward to HOD
            </button>
            <button type="button" className="ui-btn ui-btn--danger ui-btn--sm" onClick={() => begin(app.id, 'reject', 'Rejected by mentor.')}>
                <XCircle size={15} />Reject
            </button>
        </>
    ));

    return (
        <div className="u-col" style={{ gap: 16 }}>
            {notice && (
                <div className={`ui-alert ui-alert--${notice.type}`} role="status">
                    <span>{notice.text}</span>
                </div>
            )}

            <Segmented
                label="Applications"
                value={tab}
                onChange={setTab}
                options={[
                    { value: 'pending', label: 'Needs action', count: pending.length },
                    { value: 'history', label: 'Reviewed', count: history.length }
                ]}
            />

            {isLoading ? <Spinner label="Loading applications" /> : shown.length === 0 ? (
                <Empty icon={Inbox} title={tab === 'pending' ? 'Nothing waiting for you' : 'No reviewed applications yet'}>
                    {tab === 'pending' ? 'New leave and On-Duty applications will show up here.' : 'Decisions you make are listed here.'}
                </Empty>
            ) : (
                <div className="ui-list">
                    {shown.map((app) => {
                        const [tone, label] = STATUS_CHIP[app.status] || ['neutral', app.status];
                        return (
                            <div key={app.id} className="ui-card ui-card--sm" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div className="u-row u-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                    <div className="u-grow">
                                        <div className="u-row" style={{ gap: 8, flexWrap: 'wrap' }}>
                                            <span className="cell-strong" style={{ fontSize: '1rem' }}>{app.student_name}</span>
                                            <span className="ui-chip ui-chip--neutral">{app.type === 'internal' ? 'Internal' : 'External'}</span>
                                            {tab === 'history' && <span className={`ui-chip ui-chip--${tone}`}>{label}</span>}
                                        </div>
                                        <div className="cell-sub" style={{ marginTop: 2 }}>
                                            {app.roll_number || app.student_email}, {app.year_of_study || ''} {app.department}
                                        </div>
                                    </div>
                                    {tab === 'pending' && <div className="u-row" style={{ gap: 8, flexWrap: 'wrap' }}>{actions(app)}</div>}
                                </div>

                                <div className="state-facts">
                                    <div><strong>{app.event_name}</strong>, {app.category}, {app.venue || 'FXEC'}</div>
                                    <div>
                                        {String(app.from_date).slice(0, 10)} to {String(app.to_date).slice(0, 10)}
                                        {' '}({app.is_all_day ? 'all periods' : `periods ${app.from_period} to ${app.to_period}`})
                                    </div>
                                    <div>{app.reason}</div>
                                    {app.mentor_remarks && <div style={{ color: 'var(--denim-600)' }}><strong>Mentor:</strong> {app.mentor_remarks}</div>}
                                    {app.hod_remarks && <div style={{ color: 'var(--denim-600)' }}><strong>HOD:</strong> {app.hod_remarks}</div>}
                                </div>

                                {actionId === app.id && (
                                    <form onSubmit={submit} className="u-col" style={{ gap: 10 }}>
                                        <label className="ui-label" htmlFor={`remarks-${app.id}`}>
                                            {actionType === 'reject' ? 'Reason for rejecting' : 'Remarks (optional)'}
                                        </label>
                                        <input id={`remarks-${app.id}`} className="ui-input" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                                        <div className="u-row" style={{ justifyContent: 'flex-end' }}>
                                            <button type="button" className="ui-btn ui-btn--sm" onClick={() => setActionId(null)}>Cancel</button>
                                            <button type="submit" className={`ui-btn ui-btn--sm ${actionType === 'reject' ? 'ui-btn--danger' : 'ui-btn--primary'}`} disabled={isSubmitting}>
                                                {isSubmitting ? 'Saving' : `Confirm ${actionType}`}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export const LeaveReviewModal = ({ isOpen, onClose, role = 'staff', department = 'IT', inline = false }) => {
    const isHod = role === 'hod' || role === 'principal';
    const title = isHod ? 'Leave and On-Duty sanction' : 'Mentee leave requests';
    const sub = isHod
        ? 'Approving credits On-Duty attendance for the covered periods'
        : 'Endorse an application to send it to your HOD, or reject it';

    if (inline) {
        return (
            <section className="ui-card">
                <div className="ui-card-head">
                    <div className="u-row" style={{ gap: 12 }}>
                        <IconTile icon={FileText} tone={isHod ? 'pistachio' : 'denim'} size={40} />
                        <div>
                            <div className="ui-card-title">{title}</div>
                            <div className="ui-card-sub">{sub}</div>
                        </div>
                    </div>
                </div>
                <LeaveReviewBody role={role} department={department} />
            </section>
        );
    }

    return (
        <Modal open={isOpen} onClose={onClose} size="lg" icon={FileText} tone={isHod ? 'pistachio' : 'denim'} title={title} subtitle={sub}
            footer={<button type="button" className="ui-btn" onClick={onClose}>Close</button>}>
            {isOpen && <LeaveReviewBody role={role} department={department} />}
        </Modal>
    );
};
