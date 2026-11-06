import React, { useState, useEffect } from 'react';
import { 
    FileText, 
    Send, 
    CheckCircle2, 
    Clock, 
    XCircle, 
    Building, 
    MapPin, 
    Calendar, 
    User, 
    ArrowLeft, 
    RefreshCw
} from 'lucide-react';

export const StudentLeavePortal = ({ currentUser, onBackToHome }) => {
    const [activeTab, setActiveTab] = useState('apply'); // 'apply' | 'my_leaves'
    const [leaveType, setLeaveType] = useState('internal'); // 'internal' | 'external'
    const [eventName, setEventName] = useState('');
    const [category, setCategory] = useState('');
    const [venue, setVenue] = useState('');
    const [fromDate, setFromDate] = useState(new Date().toISOString().slice(0, 10));
    const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
    const [isAllDay, setIsAllDay] = useState(true);
    const [fromPeriod, setFromPeriod] = useState(1);
    const [toPeriod, setToPeriod] = useState(7);
    const [reason, setReason] = useState('');
    const [mentorId, setMentorId] = useState('');
    const [mentors, setMentors] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notice, setNotice] = useState(null);
    const [myLeaves, setMyLeaves] = useState([]);
    const [isLoadingLeaves, setIsLoadingLeaves] = useState(false);

    // Fetch mentors in student's department
    useEffect(() => {
        const fetchMentors = async () => {
            try {
                const token = localStorage.getItem('fxec_token');
                const res = await fetch('/api/leave/mentors', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.mentors) {
                    setMentors(data.mentors);
                    if (data.mentors.length > 0) {
                        setMentorId(data.mentors[0].id);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch mentors:', err);
            }
        };
        fetchMentors();
    }, []);

    // Fetch my leave applications
    const fetchMyLeaves = async () => {
        setIsLoadingLeaves(true);
        try {
            const token = localStorage.getItem('fxec_token');
            const res = await fetch('/api/leave/my-leaves', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.leaves) {
                setMyLeaves(data.leaves);
            }
        } catch (err) {
            console.error('Failed to load my leaves:', err);
        } finally {
            setIsLoadingLeaves(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'my_leaves') {
            fetchMyLeaves();
        }
    }, [activeTab]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!eventName.trim()) {
            setNotice({ type: 'error', text: 'Please enter the event or competition name.' });
            return;
        }
        if (!category.trim()) {
            setNotice({ type: 'error', text: 'Please enter the event category (e.g. Hackathon, Symposium, Workshop).' });
            return;
        }
        if (!reason.trim()) {
            setNotice({ type: 'error', text: 'Please provide the purpose or justification for your absence.' });
            return;
        }

        setIsSubmitting(true);
        setNotice(null);

        try {
            const token = localStorage.getItem('fxec_token');
            const res = await fetch('/api/leave/apply', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    type: leaveType,
                    eventName: eventName.trim(),
                    category: category.trim(),
                    venue: venue.trim() || (leaveType === 'internal' ? 'FXEC Campus / Department Lab' : 'External Institution'),
                    fromDate,
                    toDate,
                    isAllDay,
                    fromPeriod,
                    toPeriod,
                    reason: reason.trim(),
                    mentorId: mentorId ? parseInt(mentorId) : null
                })
            });

            const data = await res.json();
            if (res.ok) {
                setNotice({ type: 'success', text: data.message || 'Leave application submitted to mentor successfully.' });
                setEventName('');
                setCategory('');
                setReason('');
                setVenue('');
                setTimeout(() => {
                    setActiveTab('my_leaves');
                }, 1200);
            } else {
                setNotice({ type: 'error', text: data.error || 'Failed to submit application.' });
            }
        } catch (err) {
            console.error('Submit leave error:', err);
            setNotice({ type: 'error', text: 'Server connection error. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved':
                return (
                    <span className="canary-status-badge status-approved">
                        <CheckCircle2 size={12} strokeWidth={2.4} />
                        HOD Approved (OD Credited)
                    </span>
                );
            case 'pending_hod':
                return (
                    <span className="canary-status-badge status-endorsed">
                        <Clock size={12} strokeWidth={2.4} />
                        Mentor Endorsed • Awaiting HOD
                    </span>
                );
            case 'rejected':
                return (
                    <span className="canary-status-badge status-rejected">
                        <XCircle size={12} strokeWidth={2.4} />
                        Rejected
                    </span>
                );
            default:
                return (
                    <span className="canary-status-badge status-pending">
                        <Clock size={12} strokeWidth={2.4} />
                        Awaiting Mentor
                    </span>
                );
        }
    };

    return (
        <div className="canary-portal-layout">
            
            {/* 1. Portal Navigation Header Bar */}
            <div className="portal-header-bar">
                <div className="portal-header-left">
                    {onBackToHome && (
                        <button
                            type="button"
                            onClick={onBackToHome}
                            className="portal-back-btn"
                            title="Back to Dashboard"
                        >
                            <ArrowLeft size={15} strokeWidth={2.4} />
                            <span>Dashboard</span>
                        </button>
                    )}
                    <div className="portal-title-block">
                        <h1 className="portal-main-title">Leave & OD Portal</h1>
                        <span className="portal-sub-title">Official Student Absence & On-Duty Requisition</span>
                    </div>
                </div>

                {/* Segmented Mode Switcher */}
                <div className="portal-nav-pills">
                    <button
                        type="button"
                        onClick={() => setActiveTab('apply')}
                        className={`portal-nav-pill ${activeTab === 'apply' ? 'active' : ''}`}
                    >
                        Apply Requisition
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('my_leaves')}
                        className={`portal-nav-pill ${activeTab === 'my_leaves' ? 'active' : ''}`}
                    >
                        My Applications ({myLeaves.length})
                    </button>
                </div>
            </div>

            {/* Notification Toast Alert */}
            {notice && (
                <div className={`portal-alert ${notice.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                    {notice.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    <span>{notice.text}</span>
                </div>
            )}

            {/* 2. REQUISITION FORM VIEW */}
            {activeTab === 'apply' && (
                <div className="canary-form-card">
                    
                    {/* Form Context Sub-Header */}
                    <div className="form-card-header">
                        <div className="form-card-header-info">
                            <span className="form-legend">New Application</span>
                            <span className="form-hint">Forwarded to your Mentor, then sanctioned by HOD.</span>
                        </div>

                        {/* Scope Selector: Clean Segmented Pill Switch (Replaces giant survey boxes) */}
                        <div className="scope-segmented-control">
                            <button
                                type="button"
                                onClick={() => setLeaveType('internal')}
                                className={`scope-segment-btn ${leaveType === 'internal' ? 'active' : ''}`}
                            >
                                <Building size={14} strokeWidth={2.2} />
                                <span>Internal Campus</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setLeaveType('external')}
                                className={`scope-segment-btn ${leaveType === 'external' ? 'active' : ''}`}
                            >
                                <MapPin size={14} strokeWidth={2.2} />
                                <span>Off-Campus OD</span>
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="portal-form-body">
                        
                        {/* Section 1: Event Details */}
                        <div className="form-section">
                            <div className="section-label">1. Activity & Mentor Selection</div>
                            <div className="form-grid-2">
                                <div className="form-field">
                                    <label className="field-lbl">Event / Competition Name *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Smart India Hackathon / IEEE Tech Fest"
                                        value={eventName}
                                        onChange={(e) => setEventName(e.target.value)}
                                        className="portal-input"
                                        required
                                    />
                                </div>
                                <div className="form-field">
                                    <label className="field-lbl">Event Category *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Hackathon, Symposium, Paper Presentation"
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="portal-input"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-grid-2" style={{ marginTop: '10px' }}>
                                <div className="form-field">
                                    <label className="field-lbl">Venue / Hosting Institution</label>
                                    <input
                                        type="text"
                                        placeholder={leaveType === 'internal' ? 'FXEC Campus / Department Lab' : 'Host College / Institution Name & City'}
                                        value={venue}
                                        onChange={(e) => setVenue(e.target.value)}
                                        className="portal-input"
                                    />
                                </div>
                                <div className="form-field">
                                    <label className="field-lbl">Assigned Faculty Mentor *</label>
                                    <select
                                        value={mentorId}
                                        onChange={(e) => setMentorId(e.target.value)}
                                        className="portal-input"
                                        required
                                    >
                                        <option value="">Select your Department Faculty Mentor...</option>
                                        {mentors.map(m => (
                                            <option key={m.id} value={m.id}>
                                                {m.name} — {m.designation || 'Faculty'} ({m.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Date & Attendance Schedule */}
                        <div className="form-section">
                            <div className="section-label">2. Date & Period Duration</div>
                            <div className="form-grid-2">
                                <div className="form-field">
                                    <label className="field-lbl">From Date *</label>
                                    <input
                                        type="date"
                                        value={fromDate}
                                        onChange={(e) => setFromDate(e.target.value)}
                                        className="portal-input"
                                        required
                                    />
                                </div>
                                <div className="form-field">
                                    <label className="field-lbl">To Date *</label>
                                    <input
                                        type="date"
                                        value={toDate}
                                        onChange={(e) => setToDate(e.target.value)}
                                        className="portal-input"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Duration Coverage Strip */}
                            <div className="coverage-strip">
                                <label className="coverage-checkbox-lbl">
                                    <input
                                        type="checkbox"
                                        checked={isAllDay}
                                        onChange={(e) => setIsAllDay(e.target.checked)}
                                        className="coverage-checkbox"
                                    />
                                    <span className="coverage-text">Full Day Exemption (All 7 Periods)</span>
                                </label>

                                {!isAllDay && (
                                    <div className="period-range-row">
                                        <div className="period-select-wrap">
                                            <span className="period-sub-lbl">From</span>
                                            <select 
                                                value={fromPeriod} 
                                                onChange={(e) => setFromPeriod(Number(e.target.value))}
                                                className="portal-select-inline"
                                            >
                                                {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>Period {n}</option>)}
                                            </select>
                                        </div>
                                        <div className="period-select-wrap">
                                            <span className="period-sub-lbl">To</span>
                                            <select 
                                                value={toPeriod} 
                                                onChange={(e) => setToPeriod(Number(e.target.value))}
                                                className="portal-select-inline"
                                            >
                                                {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>Period {n}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Section 3: Purpose & Reason */}
                        <div className="form-section">
                            <div className="section-label">3. Academic Justification</div>
                            <div className="form-field">
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    rows={3}
                                    placeholder="State your role in the event, project deliverable, or circumstances..."
                                    className="portal-textarea"
                                    required
                                />
                            </div>
                        </div>

                        {/* Bottom Actions Row */}
                        <div className="form-action-bar">
                            <span className="form-footer-note">
                                Verified by Mentor, sanctioned by HOD with automatic On-Duty attendance credit.
                            </span>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="portal-submit-btn"
                            >
                                <Send size={15} strokeWidth={2.4} />
                                <span>{isSubmitting ? 'Submitting...' : 'Submit Requisition'}</span>
                            </button>
                        </div>

                    </form>
                </div>
            )}

            {/* 3. MY APPLICATIONS VIEW */}
            {activeTab === 'my_leaves' && (
                <div className="canary-form-card">
                    <div className="form-card-header">
                        <div>
                            <span className="form-legend">Submitted Requisitions</span>
                            <span className="form-hint">Status timeline for your academic leave & on-duty requests.</span>
                        </div>
                        <button
                            type="button"
                            onClick={fetchMyLeaves}
                            className="portal-refresh-btn"
                            title="Refresh Records"
                        >
                            <RefreshCw size={13} strokeWidth={2.4} />
                            <span>Refresh</span>
                        </button>
                    </div>

                    {isLoadingLeaves ? (
                        <div className="portal-loading-state">
                            Loading official records...
                        </div>
                    ) : myLeaves.length === 0 ? (
                        <div className="portal-empty-state">
                            <div className="empty-icon-wrap">
                                <FileText size={24} />
                            </div>
                            <div className="empty-title">No Applications Submitted</div>
                            <div className="empty-desc">
                                Tap "Apply Requisition" to submit a leave or On-Duty request.
                            </div>
                        </div>
                    ) : (
                        <div className="submissions-feed">
                            {myLeaves.map(app => (
                                <div key={app.id} className="submission-card">
                                    <div className="submission-header-row">
                                        <div className="submission-title-group">
                                            <div className="submission-event-name">{app.event_name}</div>
                                            <div className="submission-tags-row">
                                                <span className={`scope-tag ${app.type === 'internal' ? 'internal' : 'external'}`}>
                                                    {app.type === 'internal' ? 'Campus' : 'Off-Campus'}
                                                </span>
                                                <span className="submission-cat-tag">{app.category}</span>
                                                <span className="submission-venue-tag">{app.venue || 'FXEC Campus'}</span>
                                            </div>
                                        </div>
                                        {getStatusBadge(app.status)}
                                    </div>

                                    {/* Details Ribbon */}
                                    <div className="submission-details-ribbon">
                                        <div><strong>Dates:</strong> {app.from_date?.slice(0, 10)} to {app.to_date?.slice(0, 10)}</div>
                                        <div><strong>Coverage:</strong> {app.is_all_day ? 'Full Day (P1-P7)' : `Periods ${app.from_period} - ${app.to_period}`}</div>
                                        <div><strong>Mentor:</strong> {app.mentor_name || 'Designated Faculty'}</div>
                                    </div>

                                    <div className="submission-reason-text">
                                        <strong>Justification:</strong> {app.reason}
                                    </div>

                                    {(app.mentor_remarks || app.hod_remarks) && (
                                        <div className="submission-remarks-box">
                                            {app.mentor_remarks && (
                                                <div><strong>Mentor Note:</strong> {app.mentor_remarks}</div>
                                            )}
                                            {app.hod_remarks && (
                                                <div><strong>HOD Sanction:</strong> {app.hod_remarks}</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
