import React, { useState } from 'react';
import { 
    MessageSquarePlus, 
    ArrowLeft, 
    Send, 
    CheckCircle2, 
    AlertCircle, 
    ShieldCheck, 
    Laptop, 
    Sparkles,
    FileText
} from 'lucide-react';

export const FeedbackPage = ({ currentUser, deviceInfo, onBackToHome }) => {
    const [category, setCategory] = useState('Bug / Technical Issue');
    const [priority, setPriority] = useState('Normal');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successNotice, setSuccessNotice] = useState(null);
    const [errorNotice, setErrorNotice] = useState(null);

    const devName = deviceInfo?.deviceName || `${deviceInfo?.platform || 'Device'} (${deviceInfo?.screenResolution || 'Browser'})`;
    const devFingerprint = deviceInfo?.deviceId || 'Active Hardware Session';

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!subject.trim()) {
            setErrorNotice('Please provide a subject or brief summary.');
            return;
        }
        if (!message.trim()) {
            setErrorNotice('Please describe the issue or feedback in detail.');
            return;
        }

        setIsSubmitting(true);
        setErrorNotice(null);

        try {
            const payload = {
                user_id: currentUser?.id || null,
                user_name: currentUser?.name || 'Authorized Scholar',
                user_email: currentUser?.email || 'student@francisxavier.ac.in',
                user_role: currentUser?.role || 'student',
                category: `${category} [${priority}]`,
                message: `Subject: ${subject.trim()}\n\nDetails: ${message.trim()}\n\nDevice: ${devName} (${devFingerprint})`,
                rating: priority === 'Critical' ? 1 : 5,
                device_info: devName
            };

            const res = await fetch('/api/feedback/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok) {
                setSuccessNotice('Your feedback and telemetry report have been submitted directly to the FXEC IT Operations console.');
                setSubject('');
                setMessage('');
            } else {
                setErrorNotice(data.error || 'Failed to submit feedback. Please try again.');
            }
        } catch (err) {
            console.error('Feedback submit error:', err);
            setErrorNotice('Network connection error. Could not reach IT Operations server.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="feedback-page-wrapper" style={{ width: '100%', maxWidth: '880px', margin: '0 auto', padding: '16px 16px 80px' }}>
            
            {/* Top Navigation & Back Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                <button
                    type="button"
                    onClick={onBackToHome}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        borderRadius: '12px',
                        background: '#E6F1FA',
                        border: '1.5px solid #CBDCEB',
                        color: '#1D2B3C',
                        fontSize: '0.84rem',
                        fontWeight: 750,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                    }}
                >
                    <ArrowLeft size={16} strokeWidth={2.4} />
                    <span>Back to Dashboard</span>
                </button>

                <div style={{ fontSize: '0.78rem', color: '#526579', fontWeight: 600 }}>
                    FXEC IT Support Desk
                </div>
            </div>

            {/* Main Feedback Card */}
            <div 
                style={{
                    background: '#E6F1FA',
                    border: '1.5px solid #CBDCEB',
                    borderRadius: '24px',
                    padding: '24px 28px',
                    boxShadow: '0 4px 24px -4px rgba(60, 100, 140, 0.08), 0 1px 3px rgba(60, 100, 140, 0.04)'
                }}
            >
                {/* Card Title & Institutional Context */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingBottom: '18px', borderBottom: '1px solid #CBDCEB' }}>
                    <div 
                        style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '14px',
                            background: '#D3E5F5',
                            color: '#2E5F93',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}
                    >
                        <MessageSquarePlus size={22} strokeWidth={2.2} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.25rem', fontWeight: 850, color: '#1D2B3C', margin: 0, letterSpacing: '-0.02em' }}>
                            Submit Feedback & Issue Report
                        </h1>
                        <div style={{ fontSize: '0.78rem', color: '#526579', marginTop: '2px', fontWeight: 600 }}>
                            Direct ticket dispatch to Francis Xavier Engineering College IT Operations.
                        </div>
                    </div>
                </div>

                {/* Success Notice State */}
                {successNotice ? (
                    <div style={{ padding: '36px 16px', textAlign: 'center' }}>
                        <div 
                            style={{ 
                                width: '56px', 
                                height: '56px', 
                                borderRadius: '50%', 
                                background: '#EEF1CF', 
                                border: '2px solid #DDE4A0',
                                color: '#6E7A20', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                margin: '0 auto 16px' 
                            }}
                        >
                            <CheckCircle2 size={28} strokeWidth={2.5} />
                        </div>
                        <h2 style={{ fontSize: '1.15rem', fontWeight: 850, color: '#1D2B3C', margin: '0 0 8px' }}>
                            Ticket Dispatched Successfully
                        </h2>
                        <p style={{ fontSize: '0.86rem', color: '#526579', maxWidth: '480px', margin: '0 auto 24px', lineHeight: 1.5 }}>
                            {successNotice}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                            <button
                                type="button"
                                onClick={() => setSuccessNotice(null)}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '12px',
                                    background: '#E6F1FA',
                                    border: '1.5px solid #CBDCEB',
                                    color: '#1D2B3C',
                                    fontWeight: 750,
                                    fontSize: '0.84rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Submit Another Report
                            </button>
                            <button
                                type="button"
                                onClick={onBackToHome}
                                style={{
                                    padding: '10px 24px',
                                    borderRadius: '12px',
                                    background: '#1D2B3C',
                                    border: '1.5px solid #1D2B3C',
                                    color: '#FFFFFF',
                                    fontWeight: 750,
                                    fontSize: '0.84rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Return to Dashboard
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        
                        {errorNotice && (
                            <div 
                                style={{
                                    background: '#F6DEDC',
                                    border: '1.5px solid #E8C3C0',
                                    borderRadius: '14px',
                                    padding: '12px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    color: '#C25B56',
                                    fontSize: '0.84rem',
                                    fontWeight: 700
                                }}
                            >
                                <AlertCircle size={18} flexShrink={0} />
                                <span>{errorNotice}</span>
                            </div>
                        )}

                        {/* Category & Priority Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 800, color: '#1D2B3C', marginBottom: '6px' }}>
                                    Feedback Category *
                                </label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    style={{
                                        width: '100%',
                                        height: '44px',
                                        padding: '0 14px',
                                        borderRadius: '12px',
                                        border: '1.5px solid #CBDCEB',
                                        background: '#E6F1FA',
                                        fontSize: '0.86rem',
                                        fontWeight: 650,
                                        color: '#1D2B3C',
                                        outline: 'none',
                                        fontFamily: 'inherit'
                                    }}
                                >
                                    <option value="Bug / Technical Issue">Bug / Technical Issue</option>
                                    <option value="Classroom OTP Verification">Classroom OTP Verification</option>
                                    <option value="Attendance Discrepancy">Attendance Record Discrepancy</option>
                                    <option value="Leave & OD Processing">Leave & OD Processing</option>
                                    <option value="Device Binding & Hardware Lock">Device Binding & Hardware Lock</option>
                                    <option value="UI & Feature Suggestion">UI & Feature Suggestion</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 800, color: '#1D2B3C', marginBottom: '6px' }}>
                                    Severity / Impact Level *
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                    {['Normal', 'High', 'Critical'].map((lvl) => (
                                        <button
                                            key={lvl}
                                            type="button"
                                            onClick={() => setPriority(lvl)}
                                            style={{
                                                height: '44px',
                                                borderRadius: '12px',
                                                border: priority === lvl 
                                                    ? '2px solid #2E5F93' 
                                                    : '1.5px solid #CBDCEB',
                                                background: priority === lvl ? '#D3E5F5' : '#E6F1FA',
                                                color: priority === lvl ? '#2E5F93' : '#526579',
                                                fontWeight: 800,
                                                fontSize: '0.82rem',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            {lvl}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Subject */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 800, color: '#1D2B3C', marginBottom: '6px' }}>
                                Issue Summary / Subject *
                            </label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="e.g. Period 2 OTP failed to verify on Room 204"
                                style={{
                                    width: '100%',
                                    height: '44px',
                                    padding: '0 14px',
                                    borderRadius: '12px',
                                    border: '1.5px solid #CBDCEB',
                                    background: '#E6F1FA',
                                    fontSize: '0.86rem',
                                    fontWeight: 650,
                                    color: '#1D2B3C',
                                    outline: 'none',
                                    fontFamily: 'inherit'
                                }}
                                required
                            />
                        </div>

                        {/* Detailed Description */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 800, color: '#1D2B3C', marginBottom: '6px' }}>
                                Detailed Description *
                            </label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                rows={5}
                                placeholder="Please provide specific details: what classroom you were in, the period number, what happened, and any error messages displayed..."
                                style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    borderRadius: '14px',
                                    border: '1.5px solid #CBDCEB',
                                    background: '#E6F1FA',
                                    fontSize: '0.86rem',
                                    lineHeight: 1.5,
                                    color: '#1D2B3C',
                                    outline: 'none',
                                    fontFamily: 'inherit',
                                    resize: 'vertical'
                                }}
                                required
                            />
                        </div>

                        {/* Automated Hardware Telemetry Box */}
                        <div 
                            style={{
                                background: '#E6F1FA',
                                border: '1px solid #CBDCEB',
                                borderRadius: '16px',
                                padding: '12px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '10px'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <ShieldCheck size={18} color="#6E7A20" />
                                <div>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1D2B3C' }}>
                                        Automated Hardware Diagnostic Included
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: '#526579', fontFamily: 'var(--font-mono)' }}>
                                        {devName}
                                    </div>
                                </div>
                            </div>
                            <span 
                                style={{
                                    fontSize: '0.70rem',
                                    fontWeight: 750,
                                    background: '#EEF1CF',
                                    color: '#6E7A20',
                                    border: '1px solid #DDE4A0',
                                    padding: '3px 8px',
                                    borderRadius: '8px'
                                }}
                            >
                                Attached to Ticket
                            </span>
                        </div>

                        {/* Submit Actions */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '6px' }}>
                            <button
                                type="button"
                                onClick={onBackToHome}
                                style={{
                                    padding: '12px 20px',
                                    borderRadius: '12px',
                                    background: '#E6F1FA',
                                    border: '1.5px solid #CBDCEB',
                                    color: '#526579',
                                    fontWeight: 750,
                                    fontSize: '0.86rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '12px 28px',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(160deg, #6AA6E0 0%, #3F7FC4 100%)',
                                    border: 0,
                                    boxShadow: '5px 5px 13px rgba(63, 127, 196, .38), -4px -4px 10px rgba(255,255,255,.95)',
                                    color: '#FFFFFF',
                                    fontWeight: 800,
                                    fontSize: '0.86rem',
                                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                    opacity: isSubmitting ? 0.75 : 1
                                }}
                            >
                                <Send size={15} strokeWidth={2.4} />
                                <span>{isSubmitting ? 'Dispatching Ticket...' : 'Submit to IT Operations'}</span>
                            </button>
                        </div>

                    </form>
                )}

            </div>

        </div>
    );
};

