import React, { useState, useEffect } from 'react';
import { 
    Trophy, 
    Users, 
    Calendar, 
    Clock, 
    MapPin, 
    Plus, 
    Search, 
    Filter, 
    CheckCircle2, 
    AlertCircle, 
    Trash2, 
    X, 
    ChevronRight, 
    ChevronDown, 
    UserPlus, 
    ShieldCheck, 
    Zap,
    RefreshCw,
    Award
} from 'lucide-react';

export const PTSportsDashboard = ({ currentUser }) => {
    // Stats State
    const [stats, setStats] = useState({
        activePassesCount: 0,
        activeStudentsCount: 0,
        upcomingEventsCount: 0,
        totalPassesCount: 0
    });

    // Passes List
    const [passes, setPasses] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedPass, setSelectedPass] = useState(null);
    const [feedback, setFeedback] = useState(null);

    // Modal State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const todayStr = new Date().toISOString().slice(0, 10);
    const [eventName, setEventName] = useState('');
    const [sportCategory, setSportCategory] = useState('Cricket');
    const [venue, setVenue] = useState('FXEC Sports Ground & Arena');
    const [fromDate, setFromDate] = useState(todayStr);
    const [toDate, setToDate] = useState(todayStr);
    const [isAllDay, setIsAllDay] = useState(true);
    const [fromPeriod, setFromPeriod] = useState(1);
    const [toPeriod, setToPeriod] = useState(7);
    const [reason, setReason] = useState('');

    // Student Search & Squad Selection
    const [searchStudentQuery, setSearchStudentQuery] = useState('');
    const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');
    const [searchedStudents, setSearchedStudents] = useState([]);
    const [selectedAthletes, setSelectedAthletes] = useState([]);
    const [isSearchingStudents, setIsSearchingStudents] = useState(false);

    const sportCategories = [
        'Cricket', 'Football', 'Athletics', 'Volleyball', 
        'Basketball', 'Badminton', 'Kabaddi', 'Table Tennis', 
        'Chess', 'Gymnastics', 'Weightlifting', 'General Sports'
    ];

    const departments = ['IT', 'CSE', 'AI-DS', 'ECE', 'EEE', 'MECH', 'CIVIL', 'MBA', 'MCA'];

    // Load Passes & Stats
    const loadDashboardData = async () => {
        setIsLoading(true);
        try {
            const [resStats, resPasses] = await Promise.all([
                fetch('/api/sports/stats'),
                fetch('/api/sports/passes')
            ]);
            const dataStats = await resStats.json();
            const dataPasses = await resPasses.json();

            if (resStats.ok) setStats(dataStats);
            if (resPasses.ok) setPasses(dataPasses.passes || []);
        } catch (err) {
            console.error('Failed to load sports data:', err);
            showFeedback('error', 'Could not load sports portal data. Ensure backend is running.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadDashboardData();
    }, []);

    const showFeedback = (type, text) => {
        setFeedback({ type, text });
        setTimeout(() => setFeedback(null), 5000);
    };

    // Live Student Search
    useEffect(() => {
        if (!isCreateOpen) return;
        const searchStudents = async () => {
            setIsSearchingStudents(true);
            try {
                const params = new URLSearchParams();
                if (searchStudentQuery) params.append('q', searchStudentQuery);
                if (selectedDeptFilter !== 'all') params.append('department', selectedDeptFilter);

                const res = await fetch(`/api/sports/students-search?${params.toString()}`);
                const data = await res.json();
                if (res.ok) {
                    setSearchedStudents(data.students || []);
                }
            } catch (e) {
                console.error('Failed to search students:', e);
            } finally {
                setIsSearchingStudents(false);
            }
        };

        const timer = setTimeout(searchStudents, 250);
        return () => clearTimeout(timer);
    }, [searchStudentQuery, selectedDeptFilter, isCreateOpen]);

    // Add athlete to squad
    const handleAddAthlete = (student) => {
        if (selectedAthletes.some(a => a.id === student.id)) return;
        setSelectedAthletes([...selectedAthletes, { ...student, notes: '' }]);
    };

    // Remove athlete from squad
    const handleRemoveAthlete = (studentId) => {
        setSelectedAthletes(selectedAthletes.filter(a => a.id !== studentId));
    };

    // Update athlete role/note
    const handleUpdateAthleteNote = (studentId, note) => {
        setSelectedAthletes(selectedAthletes.map(a => 
            a.id === studentId ? { ...a, notes: note } : a
        ));
    };

    // Preset Quick Squads
    const handleAddPresetSquad = (presetType) => {
        // Find students from searched list or add matching ones
        const available = searchedStudents.slice(0, presetType === 'football' ? 11 : presetType === 'cricket' ? 11 : 6);
        const newAthletes = [...selectedAthletes];
        for (const st of available) {
            if (!newAthletes.some(a => a.id === st.id)) {
                newAthletes.push({
                    ...st,
                    notes: presetType === 'football' ? 'Football Squad' : presetType === 'cricket' ? 'Cricket Squad' : 'Athletics Team'
                });
            }
        }
        setSelectedAthletes(newAthletes);
    };

    // Handle Create Pass
    const handleCreatePass = async (e) => {
        e.preventDefault();
        if (!eventName.trim()) {
            showFeedback('error', 'Please enter the Sports Event / Tournament name.');
            return;
        }

        if (selectedAthletes.length === 0) {
            showFeedback('error', 'Please select at least 1 student athlete for the Sports OD Pass.');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                event_name: eventName,
                sport_category: sportCategory,
                venue: venue,
                from_date: fromDate,
                to_date: toDate,
                is_all_day: isAllDay,
                from_period: isAllDay ? 1 : parseInt(fromPeriod),
                to_period: isAllDay ? 7 : parseInt(toPeriod),
                reason: reason,
                student_ids: selectedAthletes.map(a => ({ id: a.id, notes: a.notes })),
                created_by: currentUser?.id || 1
            };

            const res = await fetch('/api/sports/passes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok) {
                showFeedback('success', data.message || 'Sports OD Pass issued successfully! Students are now OTP-free.');
                setIsCreateOpen(false);
                resetForm();
                loadDashboardData();
            } else {
                showFeedback('error', data.error || 'Failed to issue Sports OD Pass.');
            }
        } catch (err) {
            console.error('Error submitting sports pass:', err);
            showFeedback('error', 'Network error creating sports pass.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setEventName('');
        setSportCategory('Cricket');
        setVenue('FXEC Sports Ground & Arena');
        setFromDate(todayStr);
        setToDate(todayStr);
        setIsAllDay(true);
        setReason('');
        setSelectedAthletes([]);
        setSearchStudentQuery('');
    };

    // Delete Pass
    const handleDeletePass = async (passId) => {
        if (!window.confirm('Are you sure you want to revoke this Sports OD Pass? Enrolled students will no longer be exempt.')) {
            return;
        }

        try {
            const res = await fetch(`/api/sports/passes/${passId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                showFeedback('success', 'Sports OD Pass revoked successfully.');
                loadDashboardData();
            }
        } catch (e) {
            console.error('Failed to revoke pass:', e);
            showFeedback('error', 'Failed to revoke pass.');
        }
    };

    // View Pass Details & Squad
    const handleViewPass = async (pass) => {
        try {
            const res = await fetch(`/api/sports/passes/${pass.id}`);
            const data = await res.json();
            if (res.ok) {
                setSelectedPass(data);
            }
        } catch (e) {
            console.error('Failed to fetch pass details:', e);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', width: '100%', paddingBottom: '40px' }}>
            
            {/* Top Directorate Ribbon */}
            <div className="fa-glass-card" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div className="aero-badge-circle" style={{ background: '#F59E0B', color: '#FFFFFF', width: '46px', height: '46px' }}>
                            <Trophy size={24} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--dark-blue)', margin: 0 }}>
                                    Directorate of Physical Education & Sports
                                </h1>
                                <span className="aero-pill cyan" style={{ fontSize: '0.70rem', textTransform: 'uppercase' }}>
                                    Sports OD Authority
                                </span>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-sub)', marginTop: '3px' }}>
                                Issue Multi-Day OTP-Free Passes • Student Squad Selection • On-Duty (OD) Attendance Credit
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button 
                            type="button" 
                            className="aero-glass-btn"
                            onClick={loadDashboardData}
                            title="Refresh Sports Passes"
                            style={{ padding: '9px 14px', fontSize: '0.78rem' }}
                        >
                            <RefreshCw size={14} className={isLoading ? 'spin-icon' : ''} />
                            <span>Refresh</span>
                        </button>
                        
                        <button 
                            type="button" 
                            className="aero-gloss-btn"
                            onClick={() => {
                                resetForm();
                                setIsCreateOpen(true);
                            }}
                            style={{ 
                                padding: '9px 20px', 
                                fontSize: '0.82rem', 
                                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                                borderColor: '#B45309'
                            }}
                        >
                            <Plus size={16} style={{ marginRight: '6px' }} />
                            <span>+ Issue Sports Event / OD Pass</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Notification Banner */}
            {feedback && (
                <div className={feedback.type === 'success' ? 'aero-alert-success' : 'aero-alert-error'} style={{ margin: '0' }}>
                    {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span>{feedback.text}</span>
                </div>
            )}

            {/* Stats Metric Ribbon */}
            <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                <div className="fx-card" style={{ padding: '16px 20px', borderLeft: '4px solid #F59E0B' }}>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-sub)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Active Sports Passes
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#D97706', marginTop: '2px' }}>
                        {stats.activePassesCount}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Currently running tournaments</div>
                </div>

                <div className="fx-card" style={{ padding: '16px 20px', borderLeft: '4px solid #16A34A' }}>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-sub)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Athletes on Sports OD
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#16A34A', marginTop: '2px' }}>
                        {stats.activeStudentsCount}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Exempt from 10s OTP & Morning Lockout</div>
                </div>

                <div className="fx-card" style={{ padding: '16px 20px', borderLeft: '4px solid var(--blue)' }}>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-sub)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Upcoming Tournaments
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--blue)', marginTop: '2px' }}>
                        {stats.upcomingEventsCount}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Scheduled future meets</div>
                </div>

                <div className="fx-card" style={{ padding: '16px 20px', borderLeft: '4px solid #9333EA' }}>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-sub)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Total Events Conducted
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#9333EA', marginTop: '2px' }}>
                        {stats.totalPassesCount}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>All-time sports records</div>
                </div>
            </div>

            {/* Passes Directory & Active Squads */}
            <div className="fx-card" style={{ padding: '22px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--dark-blue)', margin: 0 }}>
                            Sports Event Passes & Exempted Athletes Roster
                        </h2>
                        <p style={{ fontSize: '0.76rem', color: 'var(--text-sub)', margin: '3px 0 0 0' }}>
                            Students registered under these passes receive 100% Present attendance without entering OTP
                        </p>
                    </div>
                    <div className="aero-pill green" style={{ fontSize: '0.72rem' }}>
                        {passes.length} Total Passes Recorded
                    </div>
                </div>

                {passes.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', background: '#F8FAFC', borderRadius: '10px', border: '1px dashed #CBD5E1' }}>
                        <Trophy size={36} color="#CBD5E1" style={{ margin: '0 auto 10px auto' }} />
                        <div style={{ fontWeight: 800, color: 'var(--dark-blue)', fontSize: '0.95rem' }}>No Sports OD Passes Issued Yet</div>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-sub)', maxWidth: '420px', margin: '6px auto 14px auto' }}>
                            Click "+ Issue Sports Event / OD Pass" above to select students and exempt them from OTP during upcoming matches or practice.
                        </p>
                        <button 
                            type="button" 
                            className="aero-gloss-btn"
                            onClick={() => setIsCreateOpen(true)}
                            style={{ padding: '8px 16px', fontSize: '0.80rem' }}
                        >
                            + Issue First Pass
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                        {passes.map(p => {
                            const isCurrentlyActive = todayStr >= p.from_date?.slice(0, 10) && todayStr <= p.to_date?.slice(0, 10);
                            return (
                                <div 
                                    key={p.id} 
                                    className="fa-glass-card" 
                                    style={{ 
                                        padding: '16px', 
                                        borderRadius: '10px',
                                        border: isCurrentlyActive ? '1.5px solid #F59E0B' : '1px solid var(--border-card)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        gap: '12px'
                                    }}
                                >
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ 
                                                fontSize: '0.68rem', 
                                                fontWeight: 800, 
                                                background: '#FEF3C7', 
                                                color: '#B45309', 
                                                padding: '2px 8px', 
                                                borderRadius: '4px',
                                                textTransform: 'uppercase'
                                            }}>
                                                {p.sport_category}
                                            </span>
                                            {isCurrentlyActive ? (
                                                <span className="aero-pill green" style={{ fontSize: '0.68rem' }}>
                                                    ● Ongoing Tournament
                                                </span>
                                            ) : todayStr < p.from_date?.slice(0, 10) ? (
                                                <span className="aero-pill cyan" style={{ fontSize: '0.68rem' }}>
                                                    Upcoming
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 700 }}>
                                                    Completed
                                                </span>
                                            )}
                                        </div>

                                        <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--dark-blue)', margin: '0 0 6px 0' }}>
                                            {p.event_name}
                                        </h3>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.76rem', color: 'var(--text-sub)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <MapPin size={13} color="var(--blue)" />
                                                <span>{p.venue}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Calendar size={13} color="var(--blue)" />
                                                <span>{p.from_date?.slice(0, 10)} to {p.to_date?.slice(0, 10)}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Clock size={13} color="var(--blue)" />
                                                <span>{p.is_all_day ? 'Full Day (Periods 1 - 7)' : `Periods ${p.from_period} - ${p.to_period}`}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'space-between',
                                        paddingTop: '10px',
                                        borderTop: '1px solid var(--border-subtle)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 800, color: 'var(--dark-blue)' }}>
                                            <Users size={14} color="#F59E0B" />
                                            <span>{p.student_count || 0} Athletes Enrolled</span>
                                        </div>

                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button 
                                                type="button"
                                                className="aero-glass-btn"
                                                style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                                                onClick={() => handleViewPass(p)}
                                            >
                                                View Squad
                                            </button>
                                            <button 
                                                type="button"
                                                className="fx-btn-danger"
                                                style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                                                onClick={() => handleDeletePass(p.id)}
                                                title="Revoke pass"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* MODAL: Issue New Sports OD Pass (With Student Squad Selector) */}
            {isCreateOpen && (
                <div className="aero-modal-backdrop" onClick={() => setIsCreateOpen(false)}>
                    <div 
                        className="aero-modal-card fa-glass-card" 
                        onClick={e => e.stopPropagation()} 
                        style={{ maxWidth: '820px', width: '95%', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}
                    >
                        <div className="aero-modal-header" style={{ paddingBottom: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div className="aero-badge-circle" style={{ background: '#F59E0B', color: '#FFFFFF' }}>
                                    <Trophy size={20} />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--dark-blue)', margin: 0 }}>
                                        Issue Sports Event / OD Pass
                                    </h2>
                                    <p style={{ fontSize: '0.76rem', color: 'var(--text-sub)', margin: '2px 0 0 0' }}>
                                        Exempt participating sports students from OTP & morning lockouts with official On-Duty credit
                                    </p>
                                </div>
                            </div>
                            <button type="button" className="aero-close-btn" onClick={() => setIsCreateOpen(false)}>
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleCreatePass} style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginTop: '16px' }}>
                            
                            {/* Section 1: Event Details */}
                            <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                                <div style={{ fontSize: '0.80rem', fontWeight: 800, color: 'var(--blue)', textTransform: 'uppercase', marginBottom: '12px' }}>
                                    1. Tournament / Event Details
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                                    <div>
                                        <label className="picker-label">Tournament / Match Title *</label>
                                        <input 
                                            type="text" 
                                            className="fx-select"
                                            style={{ width: '100%', marginTop: '4px' }}
                                            placeholder="e.g. Anna University Zonal Cricket Tournament"
                                            value={eventName}
                                            onChange={(e) => setEventName(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="picker-label">Sport Category</label>
                                        <select 
                                            className="fx-select"
                                            style={{ width: '100%', marginTop: '4px' }}
                                            value={sportCategory}
                                            onChange={(e) => setSportCategory(e.target.value)}
                                        >
                                            {sportCategories.map(sc => (
                                                <option key={sc} value={sc}>{sc}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="picker-label">Venue / Stadium</label>
                                        <input 
                                            type="text" 
                                            className="fx-select"
                                            style={{ width: '100%', marginTop: '4px' }}
                                            placeholder="e.g. Tirunelveli Anna Stadium / FXEC Arena"
                                            value={venue}
                                            onChange={(e) => setVenue(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Date Range and Period Select */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '12px' }}>
                                    <div>
                                        <label className="picker-label">From Date (Start) *</label>
                                        <input 
                                            type="date" 
                                            className="fx-select"
                                            style={{ width: '100%', marginTop: '4px' }}
                                            value={fromDate}
                                            onChange={(e) => {
                                                setFromDate(e.target.value);
                                                if (e.target.value > toDate) setToDate(e.target.value);
                                            }}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="picker-label">To Date (End) *</label>
                                        <input 
                                            type="date" 
                                            className="fx-select"
                                            style={{ width: '100%', marginTop: '4px' }}
                                            value={toDate}
                                            min={fromDate}
                                            onChange={(e) => setToDate(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="picker-label">Attendance Exemption Scope</label>
                                        <select 
                                            className="fx-select"
                                            style={{ width: '100%', marginTop: '4px' }}
                                            value={isAllDay ? 'all' : 'partial'}
                                            onChange={(e) => setIsAllDay(e.target.value === 'all')}
                                        >
                                            <option value="all">Full Day (All 7 Periods)</option>
                                            <option value="partial">Specific Periods (Practice)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Student Squad Selector (Answering the user's specific request) */}
                            <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                                    <div style={{ fontSize: '0.80rem', fontWeight: 800, color: 'var(--blue)', textTransform: 'uppercase' }}>
                                        2. Select Participating Sports Students ({selectedAthletes.length} Selected)
                                    </div>

                                    {/* Quick Squad Presets */}
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button 
                                            type="button" 
                                            className="aero-glass-btn" 
                                            style={{ padding: '3px 8px', fontSize: '0.70rem' }}
                                            onClick={() => handleAddPresetSquad('football')}
                                        >
                                            ⚡ Football XI
                                        </button>
                                        <button 
                                            type="button" 
                                            className="aero-glass-btn" 
                                            style={{ padding: '3px 8px', fontSize: '0.70rem' }}
                                            onClick={() => handleAddPresetSquad('cricket')}
                                        >
                                            ⚡ Cricket XI
                                        </button>
                                        <button 
                                            type="button" 
                                            className="aero-glass-btn" 
                                            style={{ padding: '3px 8px', fontSize: '0.70rem' }}
                                            onClick={() => handleAddPresetSquad('athletics')}
                                        >
                                            ⚡ Athletics Squad
                                        </button>
                                    </div>
                                </div>

                                {/* Instant Student Search & Department Filter */}
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                    <div style={{ flex: '1 1 240px', position: 'relative' }}>
                                        <Search size={15} color="var(--blue)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                                        <input 
                                            type="text" 
                                            className="fx-select"
                                            style={{ width: '100%', paddingLeft: '32px' }}
                                            placeholder="Search students by name or official email (e.g. Daniel, daniela.ug...)..."
                                            value={searchStudentQuery}
                                            onChange={(e) => setSearchStudentQuery(e.target.value)}
                                        />
                                    </div>

                                    <div style={{ width: '150px' }}>
                                        <select 
                                            className="fx-select"
                                            style={{ width: '100%' }}
                                            value={selectedDeptFilter}
                                            onChange={(e) => setSelectedDeptFilter(e.target.value)}
                                        >
                                            <option value="all">All Departments</option>
                                            {departments.map(d => (
                                                <option key={d} value={d}>{d}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Search Results Grid */}
                                <div style={{ maxHeight: '160px', overflowY: 'auto', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '6px' }}>
                                    {isSearchingStudents ? (
                                        <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-sub)' }}>
                                            Searching students...
                                        </div>
                                    ) : searchedStudents.length === 0 ? (
                                        <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-sub)' }}>
                                            No students found matching search.
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '6px' }}>
                                            {searchedStudents.map(st => {
                                                const isAlreadyAdded = selectedAthletes.some(a => a.id === st.id);
                                                return (
                                                    <div 
                                                        key={st.id} 
                                                        style={{ 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            justifyContent: 'space-between',
                                                            padding: '6px 10px',
                                                            background: isAlreadyAdded ? '#F1F5F9' : '#FFFFFF',
                                                            border: '1px solid #E2E8F0',
                                                            borderRadius: '6px'
                                                        }}
                                                    >
                                                        <div>
                                                            <div style={{ fontSize: '0.80rem', fontWeight: 700, color: 'var(--dark-blue)' }}>
                                                                {st.name}
                                                            </div>
                                                            <div style={{ fontSize: '0.68rem', color: 'var(--text-sub)' }}>
                                                                {st.department} • {st.email}
                                                            </div>
                                                        </div>

                                                        {isAlreadyAdded ? (
                                                            <span style={{ fontSize: '0.68rem', color: '#16A34A', fontWeight: 800 }}>
                                                                ✓ In Squad
                                                            </span>
                                                        ) : (
                                                            <button 
                                                                type="button" 
                                                                className="aero-glass-btn"
                                                                style={{ padding: '2px 8px', fontSize: '0.70rem' }}
                                                                onClick={() => handleAddAthlete(st)}
                                                            >
                                                                + Add
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Selected Squad Chips */}
                                <div style={{ marginTop: '12px' }}>
                                    <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--dark-blue)', marginBottom: '6px' }}>
                                        Active Squad Roster ({selectedAthletes.length} Athletes will be exempt from OTP):
                                    </div>
                                    {selectedAthletes.length === 0 ? (
                                        <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontStyle: 'italic' }}>
                                            No athletes selected yet. Click "+ Add" on students above or use quick squad presets.
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                                            {selectedAthletes.map(ath => (
                                                <div 
                                                    key={ath.id}
                                                    style={{ 
                                                        display: 'inline-flex', 
                                                        alignItems: 'center', 
                                                        gap: '8px', 
                                                        background: '#FEF3C7', 
                                                        border: '1px solid #FDE68A',
                                                        borderRadius: '6px',
                                                        padding: '4px 8px',
                                                        fontSize: '0.76rem'
                                                    }}
                                                >
                                                    <span style={{ fontWeight: 800, color: '#B45309' }}>{ath.name}</span>
                                                    <span style={{ fontSize: '0.66rem', color: '#92400E' }}>({ath.department})</span>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Role (e.g. Captain)" 
                                                        value={ath.notes || ''}
                                                        onChange={(e) => handleUpdateAthleteNote(ath.id, e.target.value)}
                                                        style={{ 
                                                            fontSize: '0.66rem', 
                                                            padding: '1px 5px', 
                                                            width: '85px', 
                                                            border: '1px solid #F59E0B', 
                                                            borderRadius: '4px',
                                                            background: '#FFFFFF'
                                                        }}
                                                    />
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleRemoveAthlete(ath.id)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', padding: '0 2px' }}
                                                        title="Remove from squad"
                                                    >
                                                        <X size={13} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Submit Buttons */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                                <button 
                                    type="button" 
                                    className="aero-glass-btn"
                                    onClick={() => setIsCreateOpen(false)}
                                    style={{ padding: '10px 18px', fontSize: '0.80rem' }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="aero-gloss-btn"
                                    disabled={isSubmitting || selectedAthletes.length === 0}
                                    style={{ 
                                        padding: '10px 24px', 
                                        fontSize: '0.82rem',
                                        background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                                        borderColor: '#B45309'
                                    }}
                                >
                                    {isSubmitting ? 'Issuing Pass...' : `🚀 Issue Pass & Exempt ${selectedAthletes.length} Athletes`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: View Pass Squad Details */}
            {selectedPass && (
                <div className="aero-modal-backdrop" onClick={() => setSelectedPass(null)}>
                    <div 
                        className="aero-modal-card fa-glass-card" 
                        onClick={e => e.stopPropagation()} 
                        style={{ maxWidth: '640px', width: '92%', maxHeight: '85vh', overflowY: 'auto', padding: '22px' }}
                    >
                        <div className="aero-modal-header" style={{ paddingBottom: '12px' }}>
                            <div>
                                <span style={{ fontSize: '0.68rem', fontWeight: 800, background: '#FEF3C7', color: '#B45309', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                                    {selectedPass.pass.sport_category}
                                </span>
                                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--dark-blue)', margin: '4px 0 0 0' }}>
                                    {selectedPass.pass.event_name}
                                </h2>
                                <p style={{ fontSize: '0.74rem', color: 'var(--text-sub)', margin: '2px 0 0 0' }}>
                                    Venue: {selectedPass.pass.venue} • {selectedPass.pass.from_date?.slice(0, 10)} to {selectedPass.pass.to_date?.slice(0, 10)}
                                </p>
                            </div>
                            <button type="button" className="aero-close-btn" onClick={() => setSelectedPass(null)}>
                                <X size={16} />
                            </button>
                        </div>

                        <div style={{ marginTop: '14px' }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--blue)', marginBottom: '10px' }}>
                                Enrolled Athletes ({selectedPass.students?.length || 0}):
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {selectedPass.students?.map((st, i) => (
                                    <div 
                                        key={st.id} 
                                        style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'space-between',
                                            padding: '8px 12px',
                                            background: '#F8FAFC',
                                            border: '1px solid #E2E8F0',
                                            borderRadius: '6px'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--blue)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.70rem', fontWeight: 800 }}>
                                                {i + 1}
                                            </span>
                                            <div>
                                                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--dark-blue)' }}>
                                                    {st.name}
                                                </div>
                                                <div style={{ fontSize: '0.70rem', color: 'var(--text-sub)' }}>
                                                    {st.department} • {st.email}
                                                </div>
                                            </div>
                                        </div>
                                        <span className="aero-pill yellow" style={{ fontSize: '0.68rem' }}>
                                            {st.notes || 'On Duty (OD)'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginTop: '18px', textAlign: 'right' }}>
                            <button 
                                type="button" 
                                className="aero-glass-btn" 
                                onClick={() => setSelectedPass(null)}
                                style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PTSportsDashboard;
