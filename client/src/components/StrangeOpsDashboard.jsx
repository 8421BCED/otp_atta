import React, { useState, useEffect } from 'react';
import { 
    Shield, 
    Key, 
    Lock, 
    Unlock, 
    Users, 
    UserPlus, 
    Search, 
    Filter, 
    Edit3, 
    Trash2, 
    RotateCcw, 
    CheckCircle2, 
    AlertCircle, 
    Building2, 
    Briefcase, 
    Mail, 
    RefreshCw,
    X,
    Eye,
    EyeOff
} from 'lucide-react';

const MASTER_PASS = 'ItOperations@12345';

export const StrangeOpsDashboard = ({ onLogout }) => {
    // Authentication State
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        return sessionStorage.getItem('fxec_strange_auth') === MASTER_PASS;
    });
    const [passInput, setPassInput] = useState('');
    const [authError, setAuthError] = useState(null);
    const [showPass, setShowPass] = useState(false);

    // Data State
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRole, setSelectedRole] = useState('all');
    const [selectedDept, setSelectedDept] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('active');

    // Notification State
    const [feedback, setFeedback] = useState(null);

    // Modal State (Add or Edit)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
    const [formData, setFormData] = useState({
        id: null,
        name: '',
        email: '',
        role: 'staff',
        department: 'IT',
        designation: 'ASSISTANT PROFESSOR',
        phone: '',
        password: '',
        is_active: 1
    });

    const handleAuthenticate = async (e) => {
        e.preventDefault();
        setAuthError(null);

        if (passInput.trim() === MASTER_PASS) {
            sessionStorage.setItem('fxec_strange_auth', MASTER_PASS);
            setIsAuthenticated(true);
            setPassInput('');
        } else {
            setAuthError('Access Denied: Invalid IT Operations Master Passphrase.');
        }
    };

    const handleLockConsole = () => {
        sessionStorage.removeItem('fxec_strange_auth');
        setIsAuthenticated(false);
        setPassInput('');
        if (onLogout) {
            onLogout();
        }
    };

    // Load Stats and User Directory
    const loadDirectory = async () => {
        if (!isAuthenticated) return;
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                key: MASTER_PASS,
                q: searchQuery,
                role: selectedRole,
                department: selectedDept,
                status: selectedStatus
            });

            const [resUsers, resStats] = await Promise.all([
                fetch(`/api/it-ops/users?${params.toString()}`, {
                    headers: { 'x-it-ops-key': MASTER_PASS }
                }),
                fetch('/api/it-ops/stats', {
                    headers: { 'x-it-ops-key': MASTER_PASS }
                })
            ]);

            const dataUsers = await resUsers.json();
            const dataStats = await resStats.json();

            setUsers(dataUsers.users || []);
            setStats(dataStats.stats || null);
        } catch (err) {
            console.error('Failed to load IT Ops directory:', err);
            setFeedback({ type: 'error', text: 'Failed to connect to IT Operations backend.' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadDirectory();
    }, [isAuthenticated, searchQuery, selectedRole, selectedDept, selectedStatus]);

    const showMessage = (type, text) => {
        setFeedback({ type, text });
        setTimeout(() => setFeedback(null), 4000);
    };

    // Open Modal for Create
    const handleOpenCreateModal = () => {
        setModalMode('create');
        setFormData({
            id: null,
            name: '',
            email: '',
            role: 'staff',
            department: 'IT',
            designation: 'ASSISTANT PROFESSOR',
            phone: '',
            password: 'Fxec@123',
            is_active: 1
        });
        setIsModalOpen(true);
    };

    // Open Modal for Edit
    const handleOpenEditModal = (user) => {
        setModalMode('edit');
        setFormData({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
            designation: user.designation || '',
            phone: user.phone || '',
            password: '',
            is_active: user.is_active ? 1 : 0
        });
        setIsModalOpen(true);
    };

    // Submit Add or Edit Form
    const handleSaveUser = async (e) => {
        e.preventDefault();
        try {
            if (modalMode === 'create') {
                const res = await fetch('/api/it-ops/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-it-ops-key': MASTER_PASS
                    },
                    body: JSON.stringify(formData)
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    showMessage('success', data.message || 'Staff created successfully!');
                    setIsModalOpen(false);
                    loadDirectory();
                } else {
                    showMessage('error', data.error || 'Failed to create staff.');
                }
            } else {
                const res = await fetch(`/api/it-ops/users/${formData.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-it-ops-key': MASTER_PASS
                    },
                    body: JSON.stringify(formData)
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    showMessage('success', `Faculty profile for "${formData.name}" updated successfully!`);
                    setIsModalOpen(false);
                    loadDirectory();
                } else {
                    showMessage('error', data.error || 'Failed to update user.');
                }
            }
        } catch (err) {
            console.error('Error saving user:', err);
            showMessage('error', 'Network error occurred while saving.');
        }
    };

    // Reset Password to Default Fxec@123
    const handleResetPassword = async (user) => {
        if (!window.confirm(`Reset password to default ("Fxec@123") for ${user.name} (${user.email})?`)) {
            return;
        }

        try {
            const res = await fetch(`/api/it-ops/users/${user.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-it-ops-key': MASTER_PASS
                },
                body: JSON.stringify({ resetPassword: true })
            });
            const data = await res.json();
            if (res.ok) {
                showMessage('success', `Password for ${user.name} reset to default: "Fxec@123"`);
            } else {
                showMessage('error', data.error || 'Failed to reset password.');
            }
        } catch (err) {
            showMessage('error', 'Network error during password reset.');
        }
    };

    // Delete / Purge User
    const handleDeleteUser = async (user) => {
        if (!window.confirm(`⚠️ PERMANENT ACTION: Delete faculty member "${user.name}" (${user.email})? This removes their account, active OTPs, and device locks.`)) {
            return;
        }

        try {
            const res = await fetch(`/api/it-ops/users/${user.id}`, {
                method: 'DELETE',
                headers: { 'x-it-ops-key': MASTER_PASS }
            });
            const data = await res.json();
            if (res.ok) {
                showMessage('success', data.message || `Deleted ${user.name}`);
                loadDirectory();
            } else {
                showMessage('error', data.error || 'Failed to delete user.');
            }
        } catch (err) {
            showMessage('error', 'Network error during deletion.');
        }
    };

    // ----------------------------------------------------
    // Screen 1: Master Passphrase Auth Prompt
    // ----------------------------------------------------
    if (!isAuthenticated) {
        return (
            <div style={{
                minHeight: '80vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
            }}>
                <div className="fa-glass-card" style={{
                    maxWidth: '460px',
                    width: '100%',
                    padding: '36px 30px',
                    textAlign: 'center',
                    border: '1px solid rgba(19, 108, 252, 0.25)',
                    boxShadow: '0 16px 40px rgba(19, 108, 252, 0.12)'
                }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '20px',
                        background: 'linear-gradient(135deg, #136CFC 0%, #152641 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 18px',
                        boxShadow: '0 8px 20px rgba(19, 108, 252, 0.35)'
                    }}>
                        <Shield size={32} color="#C3F84A" />
                    </div>

                    <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--dark-blue)', marginBottom: '6px' }}>
                        IT Operations Terminal
                    </h1>
                    <p style={{ fontSize: '0.80rem', color: 'var(--text-sub)', marginBottom: '24px' }}>
                        Restricted Access: Live Faculty, HOD & Principal Directory Management
                    </p>

                    <form onSubmit={handleAuthenticate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ position: 'relative', textAlign: 'left' }}>
                            <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--dark-blue)', marginBottom: '4px', display: 'block' }}>
                                IT Master Passphrase
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input 
                                    type={showPass ? 'text' : 'password'}
                                    className="fx-select"
                                    style={{ width: '100%', paddingRight: '42px', fontSize: '0.92rem', letterSpacing: '0.04em' }}
                                    placeholder="Enter ItOperations@..."
                                    value={passInput}
                                    onChange={(e) => setPassInput(e.target.value)}
                                    autoFocus
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    style={{
                                        position: 'absolute',
                                        right: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'var(--text-sub)'
                                    }}
                                >
                                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {authError && (
                            <div className="aero-alert-error" style={{ fontSize: '0.78rem' }}>
                                <AlertCircle size={15} />
                                <span>{authError}</span>
                            </div>
                        )}

                        <button 
                            type="submit" 
                            className="aero-gloss-btn"
                            style={{ width: '100%', padding: '12px', marginTop: '6px' }}
                        >
                            <Lock size={15} style={{ marginRight: '6px', verticalAlign: '-1px' }} />
                            <span>Unlock IT Console</span>
                        </button>
                    </form>

                    {onLogout && (
                        <div style={{ marginTop: '16px' }}>
                            <button
                                type="button"
                                onClick={onLogout}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--blue)',
                                    fontSize: '0.80rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    textDecoration: 'underline'
                                }}
                            >
                                ← Exit to Student Attendance Portal
                            </button>
                        </div>
                    )}

                    <div style={{ marginTop: '20px', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        FXEC Autonomous • Campus IT Infrastructure Operations
                    </div>
                </div>
            </div>
        );
    }

    // ----------------------------------------------------
    // Screen 2: IT Operations Control Console
    // ----------------------------------------------------
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', width: '100%', paddingBottom: '40px' }}>
            
            {/* Header Ribbon */}
            <div className="fa-glass-card" style={{ padding: '18px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div className="aero-badge-circle" style={{ background: 'var(--dark-blue)', color: '#C3F84A' }}>
                            <Shield size={20} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--dark-blue)', margin: 0 }}>
                                    IT Operations Faculty Directory
                                </h1>
                                <span className="aero-pill cyan" style={{ fontSize: '0.70rem', textTransform: 'uppercase' }}>
                                    Level 1 Root
                                </span>
                            </div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-sub)', marginTop: '2px' }}>
                                Real-time CRUD for Staff, HOD & Principal Accounts • Password Resets & Department Transfers
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button 
                            type="button" 
                            className="aero-glass-btn"
                            onClick={loadDirectory}
                            title="Refresh User Data"
                            style={{ padding: '8px 14px', fontSize: '0.78rem' }}
                        >
                            <RefreshCw size={14} className={isLoading ? 'spin-icon' : ''} />
                            <span>Refresh</span>
                        </button>
                        
                        <button 
                            type="button" 
                            className="aero-gloss-btn"
                            onClick={handleOpenCreateModal}
                            style={{ padding: '8px 18px', fontSize: '0.80rem' }}
                        >
                            <UserPlus size={15} style={{ marginRight: '6px' }} />
                            <span>+ Add New Faculty / Staff</span>
                        </button>

                        <button 
                            type="button" 
                            className="fx-btn-danger"
                            onClick={handleLockConsole}
                            style={{ padding: '8px 14px', fontSize: '0.78rem' }}
                            title="Lock IT Operations Console"
                        >
                            <Lock size={14} style={{ marginRight: '4px' }} />
                            <span>Lock Terminal</span>
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

            {/* Stat Counters Ribbon */}
            <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <div className="fx-card" style={{ padding: '16px 20px' }}>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-sub)', textTransform: 'uppercase' }}>Teaching Staff</div>
                    <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--blue)' }}>
                        {stats?.staffCount || 0}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Active Professors & Instructors</div>
                </div>

                <div className="fx-card" style={{ padding: '16px 20px' }}>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-sub)', textTransform: 'uppercase' }}>Department HODs</div>
                    <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--dark-blue)' }}>
                        {stats?.hodCount || 0}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Heads of Departments</div>
                </div>

                <div className="fx-card" style={{ padding: '16px 20px' }}>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-sub)', textTransform: 'uppercase' }}>Principal & Admin</div>
                    <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#9333EA' }}>
                        {stats?.principalCount || 1}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Chief Executive Authority</div>
                </div>

                <div className="fx-card" style={{ padding: '16px 20px' }}>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-sub)', textTransform: 'uppercase' }}>Sports & PT Staff</div>
                    <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#F59E0B' }}>
                        {stats?.ptCount || 1}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Physical Education Directors</div>
                </div>

                <div className="fx-card" style={{ padding: '16px 20px' }}>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-sub)', textTransform: 'uppercase' }}>Left College / Inactive</div>
                    <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#DC2626' }}>
                        {stats?.inactiveCount || 0}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Deactivated Accounts</div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="fx-card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    
                    {/* Search Input */}
                    <div style={{ flex: '1 1 260px', position: 'relative' }}>
                        <Search size={16} color="var(--blue)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input 
                            type="text"
                            className="fx-select"
                            style={{ width: '100%', paddingLeft: '36px' }}
                            placeholder="Search by name, email, or designation (e.g. Aruna Devi, PT)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Role Filter */}
                    <div style={{ minWidth: '140px' }}>
                        <select 
                            className="fx-select" 
                            style={{ width: '100%' }}
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                        >
                            <option value="all">All Roles</option>
                            <option value="staff">Staff Only</option>
                            <option value="hod">HODs Only</option>
                            <option value="principal">Principal Only</option>
                            <option value="pt">PT / Sports Staff</option>
                            <option value="student">Students</option>
                        </select>
                    </div>

                    {/* Department Filter */}
                    <div style={{ minWidth: '150px' }}>
                        <select 
                            className="fx-select" 
                            style={{ width: '100%' }}
                            value={selectedDept}
                            onChange={(e) => setSelectedDept(e.target.value)}
                        >
                            <option value="all">All Departments</option>
                            <option value="IT">IT (Information Tech)</option>
                            <option value="CSE">CSE (Computer Science)</option>
                            <option value="AI-DS">AI-DS (Artificial Intel)</option>
                            <option value="ECE">ECE (Electronics & Comm)</option>
                            <option value="EEE">EEE (Electrical & Electronics)</option>
                            <option value="MECH">MECH (Mechanical)</option>
                            <option value="CIVIL">CIVIL Engineering</option>
                            <option value="CSBS">CSBS (Business Systems)</option>
                            <option value="MBA">MBA</option>
                            <option value="MCA">MCA</option>
                            <option value="Sports & Physical Education">Sports & Physical Education</option>
                            <option value="ADMIN">ADMIN / Executive</option>
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div style={{ minWidth: '130px' }}>
                        <select 
                            className="fx-select" 
                            style={{ width: '100%' }}
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                        >
                            <option value="active">Active Faculty</option>
                            <option value="inactive">Left College / Inactive</option>
                            <option value="all">All Records</option>
                        </select>
                    </div>

                    <span style={{ fontSize: '0.78rem', color: 'var(--text-sub)', marginLeft: 'auto' }}>
                        Showing <strong>{users.length}</strong> accounts
                    </span>
                </div>
            </div>

            {/* Master User Table */}
            <div className="fx-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div className="fx-table-container">
                    <table className="fx-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Faculty Name & Designation</th>
                                <th>College Email</th>
                                <th>Role</th>
                                <th>Department</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'center' }}>IT Operations Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length > 0 ? (
                                users.map((u) => {
                                    const isPrincipal = u.role === 'principal';
                                    const isHOD = u.role === 'hod';
                                    const isPT = u.role === 'pt';
                                    const isActive = !!u.is_active;

                                    return (
                                        <tr key={u.id} style={{ opacity: isActive ? 1 : 0.65 }}>
                                            <td style={{ fontFamily: 'monospace', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                                                #{u.id}
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 800, color: 'var(--dark-blue)', fontSize: '0.88rem' }}>
                                                    {u.name}
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>
                                                    {u.designation || (isHOD ? 'Head of Department' : isPrincipal ? 'Principal' : isPT ? 'Director of Physical Education' : 'Faculty Member')}
                                                </div>
                                            </td>
                                            <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--blue)' }}>
                                                {u.email}
                                            </td>
                                            <td>
                                                <span className={`aero-pill ${isPrincipal ? 'cyan' : isHOD ? 'green' : isPT ? 'yellow' : ''}`} style={{
                                                    fontSize: '0.70rem',
                                                    textTransform: 'uppercase',
                                                    fontWeight: 700,
                                                    background: isPrincipal ? '#F3E8FF' : isHOD ? 'var(--light-blue)' : isPT ? '#FEF3C7' : '#F1F5F9',
                                                    color: isPrincipal ? '#9333EA' : isHOD ? 'var(--blue)' : isPT ? '#D97706' : 'var(--dark-blue)'
                                                }}>
                                                    {isPT ? 'PT / SPORTS' : u.role}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="aero-status-tag" style={{
                                                    background: 'rgba(19, 108, 252, 0.08)',
                                                    color: 'var(--blue)',
                                                    border: '1px solid rgba(19, 108, 252, 0.2)',
                                                    fontWeight: 700
                                                }}>
                                                    {u.department || 'IT'}
                                                </span>
                                            </td>
                                            <td>
                                                {isActive ? (
                                                    <span style={{ fontSize: '0.74rem', color: '#16A34A', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#16A34A' }}></span>
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span style={{ fontSize: '0.74rem', color: '#DC2626', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#DC2626' }}></span>
                                                        Left College
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'inline-flex', gap: '6px' }}>
                                                    
                                                    {/* Edit Button */}
                                                    <button 
                                                        type="button"
                                                        className="fx-btn-outline"
                                                        style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                                                        onClick={() => handleOpenEditModal(u)}
                                                        title="Edit faculty details, change department or role"
                                                    >
                                                        <Edit3 size={13} style={{ marginRight: '3px', verticalAlign: '-1px' }} />
                                                        Edit
                                                    </button>

                                                    {/* Reset Password Button */}
                                                    <button 
                                                        type="button"
                                                        className="aero-glass-btn"
                                                        style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                                                        onClick={() => handleResetPassword(u)}
                                                        title="Reset password to default Fxec@123"
                                                    >
                                                        <RotateCcw size={13} style={{ marginRight: '3px', verticalAlign: '-1px' }} />
                                                        Reset Pass
                                                    </button>

                                                    {/* Delete / Left College Button */}
                                                    <button 
                                                        type="button"
                                                        className="fx-btn-danger"
                                                        style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                                                        onClick={() => handleDeleteUser(u)}
                                                        title="Delete or remove faculty member who left college"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>

                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-dim)' }}>
                                        No faculty or staff found matching the selected filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ---------------------------------------------------- */}
            {/* Modal: Create / Edit Faculty Account */}
            {/* ---------------------------------------------------- */}
            {isModalOpen && (
                <div className="aero-modal-backdrop" onClick={() => setIsModalOpen(false)}>
                    <div className="aero-modal-card fa-glass-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', width: '92%' }}>
                        
                        <div className="aero-modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div className="aero-icon-bubble">
                                    <Briefcase size={20} color="#136CFC" />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--dark-blue)', margin: 0 }}>
                                        {modalMode === 'create' ? 'Register New Faculty / Staff' : `Edit Faculty: ${formData.name}`}
                                    </h2>
                                    <p style={{ fontSize: '0.74rem', color: 'var(--text-sub)', margin: 0 }}>
                                        {modalMode === 'create' ? 'Add new professor or instructor to college roster' : 'Update department transfer, role promotion, or active status'}
                                    </p>
                                </div>
                            </div>
                            <button type="button" className="aero-close-btn" onClick={() => setIsModalOpen(false)}>
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
                            
                            <div>
                                <label className="picker-label">Full Name</label>
                                <input 
                                    type="text" 
                                    className="fx-select" 
                                    style={{ width: '100%', marginTop: '4px' }}
                                    placeholder="e.g. Dr. Aruna Devi M"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="picker-label">College Email Address</label>
                                <input 
                                    type="email" 
                                    className="fx-select" 
                                    style={{ width: '100%', marginTop: '4px' }}
                                    placeholder="e.g. arunadevim@francisxavier.ac.in"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label className="picker-label">Institutional Role</label>
                                    <select 
                                        className="fx-select"
                                        style={{ width: '100%', marginTop: '4px' }}
                                        value={formData.role}
                                        onChange={(e) => {
                                            const role = e.target.value;
                                            const dept = role === 'pt' ? 'Sports & Physical Education' : formData.department;
                                            const desig = role === 'pt' ? 'DIRECTOR OF PHYSICAL EDUCATION' : formData.designation;
                                            setFormData({ ...formData, role, department: dept, designation: desig });
                                        }}
                                    >
                                        <option value="staff">Staff / Faculty</option>
                                        <option value="hod">HOD (Head of Department)</option>
                                        <option value="principal">Principal</option>
                                        <option value="pt">PT (Physical Training / Sports Director)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="picker-label">Department</label>
                                    <select 
                                        className="fx-select"
                                        style={{ width: '100%', marginTop: '4px' }}
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    >
                                        <option value="IT">IT</option>
                                        <option value="CSE">CSE</option>
                                        <option value="AI-DS">AI-DS</option>
                                        <option value="ECE">ECE</option>
                                        <option value="EEE">EEE</option>
                                        <option value="MECH">MECH</option>
                                        <option value="CIVIL">CIVIL</option>
                                        <option value="CSBS">CSBS</option>
                                        <option value="MBA">MBA</option>
                                        <option value="MCA">MCA</option>
                                        <option value="Sports & Physical Education">Sports & Physical Education</option>
                                        <option value="ADMIN">ADMIN</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="picker-label">Academic Designation</label>
                                <input 
                                    type="text" 
                                    className="fx-select" 
                                    style={{ width: '100%', marginTop: '4px' }}
                                    placeholder="e.g. ASSISTANT PROFESSOR / ASSOCIATE PROFESSOR / HOD"
                                    value={formData.designation}
                                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                />
                            </div>

                            {modalMode === 'create' && (
                                <div>
                                    <label className="picker-label">Account Initial Password</label>
                                    <input 
                                        type="text" 
                                        className="fx-select" 
                                        style={{ width: '100%', marginTop: '4px' }}
                                        placeholder="Defaults to Fxec@123"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                                        Default password if left blank is "Fxec@123"
                                    </span>
                                </div>
                            )}

                            {modalMode === 'edit' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'var(--light-blue)', borderRadius: '8px' }}>
                                    <input 
                                        type="checkbox"
                                        id="activeCheck"
                                        checked={!!formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="activeCheck" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--dark-blue)', cursor: 'pointer' }}>
                                        Active College Faculty (Uncheck if staff left the college)
                                    </label>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                                <button 
                                    type="button" 
                                    className="fx-btn-outline"
                                    style={{ flex: 1, padding: '10px' }}
                                    onClick={() => setIsModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="aero-gloss-btn"
                                    style={{ flex: 2, padding: '10px' }}
                                >
                                    {modalMode === 'create' ? 'Register Faculty' : 'Save Changes'}
                                </button>
                            </div>

                        </form>

                    </div>
                </div>
            )}

        </div>
    );
};
