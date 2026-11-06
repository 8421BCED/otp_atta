import React, { useState } from 'react';
import { MessageSquarePlus, X, Send, CheckCircle2, AlertCircle, Star } from 'lucide-react';

export const FeedbackModal = ({ isOpen, onClose, currentUser, deviceInfo }) => {
    const [category, setCategory] = useState('Issue / Bug Report');
    const [message, setMessage] = useState('');
    const [rating, setRating] = useState(5);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message.trim()) {
            setErrorMessage('Please describe your feedback or the issue you encountered.');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            const devName = deviceInfo?.deviceName || `${deviceInfo?.platform || 'Device'} (${deviceInfo?.screenResolution || 'Browser'})`;
            const payload = {
                user_id: currentUser?.id || null,
                user_name: currentUser?.name || 'Anonymous User',
                user_email: currentUser?.email || 'unauthenticated@francisxavier.ac.in',
                user_role: currentUser?.role || 'student',
                category,
                message: message.trim(),
                rating,
                device_info: devName
            };

            const res = await fetch('/api/feedback/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok) {
                setSuccessMessage('Thank you! Your feedback has been sent directly to the IT Administrator.');
                setMessage('');
                setTimeout(() => {
                    setSuccessMessage(null);
                    onClose();
                }, 2000);
            } else {
                setErrorMessage(data.error || 'Failed to submit feedback. Please try again.');
            }
        } catch (err) {
            setErrorMessage('Network connection error. Could not send feedback.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fx-modal-backdrop" onClick={onClose}>
            <div className="fx-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue)' }}>
                            <MessageSquarePlus size={20} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--dark-blue)', margin: 0 }}>
                                Send App Feedback
                            </h3>
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-sub)' }}>
                                Report a bug or share your experience
                            </span>
                        </div>
                    </div>
                    <button 
                        type="button" 
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: '4px' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {successMessage ? (
                    <div className="aero-alert-success" style={{ margin: '20px 0', padding: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <CheckCircle2 size={20} color="#16A34A" />
                        <span style={{ fontSize: '0.86rem' }}>{successMessage}</span>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {errorMessage && (
                            <div className="aero-alert-error" style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <AlertCircle size={16} />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        <div>
                            <label className="picker-label" style={{ marginBottom: '6px', display: 'block' }}>Feedback Category</label>
                            <select 
                                className="fx-select"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                style={{ width: '100%' }}
                            >
                                <option value="Issue / Bug Report">Issue / Bug Report</option>
                                <option value="Device Lock Issue">Device Lockout / Binding Problem</option>
                                <option value="OTP Verification">OTP Verification Difficulty</option>
                                <option value="Feature Suggestion">Feature Suggestion</option>
                                <option value="General Experience">General App Experience</option>
                            </select>
                        </div>

                        <div>
                            <label className="picker-label" style={{ marginBottom: '6px', display: 'block' }}>Rating</label>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                {[1, 2, 3, 4, 5].map((num) => (
                                    <button
                                        key={num}
                                        type="button"
                                        onClick={() => setRating(num)}
                                        style={{
                                            flex: 1,
                                            height: '38px',
                                            borderRadius: '8px',
                                            border: rating >= num ? '1.5px solid #F59E0B' : '1px solid var(--border-subtle)',
                                            background: rating >= num ? '#FFFBEB' : '#FFFFFF',
                                            color: rating >= num ? '#D97706' : 'var(--text-dim)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <Star size={16} fill={rating >= num ? '#F59E0B' : 'none'} />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="picker-label" style={{ marginBottom: '6px', display: 'block' }}>What issue are you facing?</label>
                            <textarea
                                className="fx-select"
                                style={{ width: '100%', minHeight: '90px', padding: '10px', fontSize: '0.86rem', resize: 'vertical' }}
                                placeholder="Describe the issue or feedback in detail..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                required
                            />
                        </div>

                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                            Reporting as: <strong>{currentUser?.name || 'Guest'}</strong> ({currentUser?.email || 'Not Signed In'}) • Device ID included automatically.
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                            <button
                                type="button"
                                className="fx-btn-outline"
                                onClick={onClose}
                                style={{ flex: 1 }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="aero-gloss-btn"
                                disabled={isSubmitting}
                                style={{ flex: 2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                                <Send size={15} />
                                <span>{isSubmitting ? 'Submitting...' : 'Send to IT Admin'}</span>
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

