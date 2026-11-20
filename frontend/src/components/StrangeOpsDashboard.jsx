import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    ShieldCheck, Lock, Users, UserPlus, Search, Pencil, Trash2, LogOut, MessageSquare,
    Eye, EyeOff, UserX, UserCheck, ArrowLeft
} from 'lucide-react';
import { Modal, Confirm, Notice, Empty, Stat, SectionHead, Segmented, Spinner, IconTile } from './kit';
import { useNotice } from '../hooks';

const TOKEN_KEY = 'fxec_itops_token';
const ROLES = [
    ['staff', 'Faculty'], ['hod', 'HOD'], ['principal', 'Principal'], ['pt', 'Sports director'], ['student', 'Student']
];
const roleLabel = (r) => (ROLES.find(([v]) => v === r) || [r, r])[1];

const readToken = () => { try { return sessionStorage.getItem(TOKEN_KEY); } catch (e) { return null; } };

const emptyForm = { id: null, name: '', email: '', role: 'staff', department: 'IT', designation: 'ASSISTANT PROFESSOR', phone: '', is_active: 1 };

export const StrangeOpsDashboard = ({ onLogout }) => {
    const [token, setToken] = useState(readToken);
    const [passInput, setPassInput] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [authError, setAuthError] = useState(null);
    const [authBusy, setAuthBusy] = useState(false);

    const [tab, setTab] = useState('users');
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(false);

    const [q, setQ] = useState('');
    const [role, setRole] = useState('all');
    const [dept, setDept] = useState('all');
    const [status, setStatus] = useState('active');

    const [notice, showNotice] = useNotice();
    const [formOpen, setFormOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [confirm, setConfirm] = useState(null);
    const [busy, setBusy] = useState(false);

    const lock = useCallback(() => {
        try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) { /* ignore */ }
        setToken(null);
        setPassInput('');
    }, []);

    const api = useCallback(async (url, options = {}) => {
        const res = await fetch(url, {
            ...options,
            headers: { 'Content-Type': 'application/json', 'x-it-ops-token': token, ...(options.headers || {}) }
        });
        if (res.status === 401) { lock(); throw new Error('Session expired'); }
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, data };
    }, [token, lock]);

    const authenticate = async (e) => {
        e.preventDefault();
        setAuthError(null);
        setAuthBusy(true);
        try {
            const res = await fetch('/api/it-ops/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pass: passInput })
            });
            const data = await res.json();
            if (res.ok && data.token) {
                try { sessionStorage.setItem(TOKEN_KEY, data.token); } catch (err) { /* ignore */ }
                setToken(data.token);
                setPassInput('');
            } else {
                setAuthError(data.error || 'Incorrect passphrase');
            }
        } catch (err) {
            setAuthError('Could not reach the server');
        } finally {
            setAuthBusy(false);
        }
    };

    const loadDirectory = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({ q, role, department: dept, status });
            const [u, s] = await Promise.all([api(`/api/it-ops/users?${params}`), api('/api/it-ops/stats')]);
            setUsers(u.data.users || []);
            setStats(s.data);
        } catch (e) { /* locked or offline */ } finally { setLoading(false); }
    }, [token, q, role, dept, status, api]);

    const loadFeedback = useCallback(async () => {
        if (!token) return;
        try {
            const f = await api('/api/feedback/all');
            setFeedbacks(f.data.feedbacks || []);
        } catch (e) { /* locked or offline */ }
    }, [token, api]);

    useEffect(() => {
        const t = setTimeout(loadDirectory, 250);
        return () => clearTimeout(t);
    }, [loadDirectory]);
    useEffect(() => { if (tab === 'feedback') loadFeedback(); }, [tab, loadFeedback]);

    const departments = useMemo(() => (stats?.departments || []).map((d) => d.department).filter(Boolean), [stats]);

    const openCreate = () => { setForm(emptyForm); setFormOpen(true); };
    const openEdit = (u) => {
        setForm({ id: u.id, name: u.name, email: u.email, role: u.role, department: u.department || '', designation: u.designation || '', phone: u.phone || '', is_active: u.is_active ? 1 : 0 });
        setFormOpen(true);
    };

    const save = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            const creating = !form.id;
            const body = { ...form };
            const { ok, data } = await api(creating ? '/api/it-ops/users' : `/api/it-ops/users/${form.id}`, { method: creating ? 'POST' : 'PUT', body: JSON.stringify(body) });
            if (ok && data.success) {
                setFormOpen(false);
                loadDirectory();
                showNotice({ type: 'success', text: data.message || (creating ? 'User created' : 'User updated') });
            } else {
                showNotice({ type: 'error', text: data.error || 'Could not save the user' });
            }
        } catch (err) { /* session handled */ } finally { setBusy(false); }
    };

    const toggleActive = async (u) => {
        try {
            const { ok, data } = await api(`/api/it-ops/users/${u.id}`, { method: 'PUT', body: JSON.stringify({ is_active: u.is_active ? 0 : 1 }) });
            if (ok) { showNotice({ type: 'success', text: u.is_active ? `${u.name} deactivated` : `${u.name} activated` }); loadDirectory(); }
            else showNotice({ type: 'error', text: data.error || 'Could not update the user' });
        } catch (e) { /* session handled */ }
    };

    const askDelete = (u) => setConfirm({
        title: 'Delete this user?', body: `${u.name} (${u.email}) and all of their attendance and device records are removed permanently. Deactivating is usually safer.`, label: 'Delete permanently', tone: 'danger',
        run: async () => {
            setBusy(true);
            try {
                const { ok, data } = await api(`/api/it-ops/users/${u.id}`, { method: 'DELETE' });
                showNotice({ type: ok ? 'success' : 'error', text: data.message || data.error });
                loadDirectory();
            } catch (e) { /* session handled */ } finally { setBusy(false); setConfirm(null); }
        }
    });

    const setFeedbackStatus = async (id, value) => {
        try {
            const { ok } = await api(`/api/feedback/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: value }) });
            if (ok) loadFeedback();
        } catch (e) { /* session handled */ }
    };

    // ------------------------------------------------------------------ gate
    if (!token) {
        return (
            <div className="status-page">
                <div className="status-card ui-card" style={{ maxWidth: 420 }}>
                    <div className="status-icon"><ShieldCheck size={32} strokeWidth={1.8} /></div>
                    <h1>IT Operations</h1>
                    <p>Restricted console for managing accounts. Enter the operations passphrase to continue.</p>
                    {authError && <div className="ui-alert ui-alert--danger" role="alert" style={{ marginBottom: 16, textAlign: 'left' }}><span>{authError}</span></div>}
                    <form onSubmit={authenticate} className="u-col" style={{ gap: 14, textAlign: 'left' }}>
                        <div className="ui-field">
                            <label className="ui-label" htmlFor="ops-pass">Passphrase</label>
                            <div className="ui-input-wrap">
                                <Lock size={18} />
                                <input id="ops-pass" className="ui-input" type={showPass ? 'text' : 'password'} value={passInput} onChange={(e) => setPassInput(e.target.value)} autoFocus autoComplete="off" style={{ paddingRight: 48 }} />
                                <button type="button" className="input-toggle" onClick={() => setShowPass((s) => !s)} aria-label={showPass ? 'Hide' : 'Show'}>
                                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                        <button type="submit" className="ui-btn ui-btn--primary ui-btn--block" disabled={authBusy || !passInput}>{authBusy ? 'Checking' : 'Unlock console'}</button>
                        <button type="button" className="ui-btn ui-btn--ghost ui-btn--block" onClick={() => onLogout && onLogout()}><ArrowLeft size={16} />Back to the portal</button>
                    </form>
                </div>
            </div>
        );
    }

    // --------------------------------------------------------------- console
    return (
        <div className="ops-shell">
            <header className="ops-top">
                <div className="u-row" style={{ gap: 12 }}>
                    <IconTile icon={ShieldCheck} size={42} />
                    <div><div className="sb-name">IT Operations</div><div className="sb-sub">Accounts and support</div></div>
                </div>
                <button type="button" className="ui-btn ui-btn--sm" onClick={() => { lock(); onLogout && onLogout(); }}><LogOut size={16} />Lock console</button>
            </header>

            <main className="ops-main">
                <div className="stat-grid">
                    <Stat icon={Users} label="Faculty" value={stats?.stats?.staffCount ?? '-'} />
                    <Stat icon={UserCheck} tone="pistachio" label="HODs" value={stats?.stats?.hodCount ?? '-'} />
                    <Stat icon={Users} label="Students" value={stats?.stats?.studentCount ?? '-'} />
                    <Stat icon={UserX} tone={stats?.stats?.inactiveCount > 0 ? 'warn' : 'neutral'} label="Inactive accounts" value={stats?.stats?.inactiveCount ?? '-'} />
                </div>

                <Notice notice={notice} />

                <div className="u-row u-between" style={{ flexWrap: 'wrap', gap: 14 }}>
                    <Segmented label="Console" value={tab} onChange={setTab} options={[{ value: 'users', label: 'Accounts' }, { value: 'feedback', label: 'Feedback' }]} />
                    {tab === 'users' && <button type="button" className="ui-btn ui-btn--primary" onClick={openCreate}><UserPlus size={18} />Add user</button>}
                </div>

                {tab === 'users' ? (
                    <section className="ui-card">
                        <SectionHead icon={Users} title="Accounts" sub={`${users.length} shown`} />
                        <div className="toolbar">
                            <div className="search-bar"><Search size={18} /><input className="ui-input" placeholder="Search name, email or designation" value={q} onChange={(e) => setQ(e.target.value)} /></div>
                            <div className="toolbar-actions">
                                <select className="ui-select" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role" style={{ width: 'auto' }}>
                                    <option value="all">All roles</option>{ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                </select>
                                <select className="ui-select" value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Department" style={{ width: 'auto' }}>
                                    <option value="all">All departments</option>{departments.map((d) => <option key={d}>{d}</option>)}
                                </select>
                                <select className="ui-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status" style={{ width: 'auto' }}>
                                    <option value="active">Active</option><option value="inactive">Inactive</option><option value="all">Any status</option>
                                </select>
                            </div>
                        </div>

                        {loading && users.length === 0 ? <Spinner label="Loading accounts" /> : users.length === 0 ? (
                            <Empty icon={Users} title="No accounts match">Change the filters or add a user.</Empty>
                        ) : (
                            <div className="ui-table-wrap table-scroll" style={{ maxHeight: 640 }}>
                                <table className="ui-table">
                                    <thead><tr><th>Name</th><th>Role</th><th>Department</th><th>Status</th><th /></tr></thead>
                                    <tbody>
                                        {users.map((u) => (
                                            <tr key={u.id}>
                                                <td><div className="cell-strong">{u.name}</div><div className="cell-sub">{u.email}</div></td>
                                                <td><span className="ui-chip">{roleLabel(u.role)}</span>{u.designation ? <div className="cell-sub" style={{ marginTop: 4 }}>{u.designation}</div> : null}</td>
                                                <td>{u.department}</td>
                                                <td>{u.is_active ? <span className="ui-chip ui-chip--present">Active</span> : <span className="ui-chip ui-chip--neutral">Inactive</span>}</td>
                                                <td>
                                                    <div className="u-row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                                                        <button type="button" className="ui-icon-btn" style={{ width: 36, height: 36, borderRadius: 11 }} title="Edit" aria-label={`Edit ${u.name}`} onClick={() => openEdit(u)}><Pencil size={16} /></button>
                                                        <button type="button" className="ui-icon-btn" style={{ width: 36, height: 36, borderRadius: 11 }} title={u.is_active ? 'Deactivate' : 'Activate'} aria-label={u.is_active ? `Deactivate ${u.name}` : `Activate ${u.name}`} onClick={() => toggleActive(u)}>{u.is_active ? <UserX size={16} /> : <UserCheck size={16} />}</button>
                                                        <button type="button" className="ui-icon-btn" style={{ width: 36, height: 36, borderRadius: 11, color: 'var(--danger)' }} title="Delete" aria-label={`Delete ${u.name}`} onClick={() => askDelete(u)}><Trash2 size={16} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                ) : (
                    <section className="ui-card">
                        <SectionHead icon={MessageSquare} title="Feedback and issue reports" sub="Latest 200 submissions" />
                        {feedbacks.length === 0 ? <Empty icon={MessageSquare} title="No feedback yet">Reports from users appear here.</Empty> : (
                            <div className="ui-list">
                                {feedbacks.map((f) => (
                                    <div key={f.id} className="ui-card ui-card--sm" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        <div className="u-row u-between" style={{ flexWrap: 'wrap', gap: 10 }}>
                                            <div>
                                                <span className="cell-strong">{f.user_name || 'Unknown'}</span>
                                                <span className="cell-sub">  {f.user_role}, {f.category}, {f.rating}/5</span>
                                            </div>
                                            <select className="ui-select" style={{ width: 'auto', minHeight: 38 }} value={f.status} onChange={(e) => setFeedbackStatus(f.id, e.target.value)} aria-label="Status">
                                                <option value="open">Open</option><option value="investigating">Investigating</option><option value="resolved">Resolved</option>
                                            </select>
                                        </div>
                                        <div style={{ lineHeight: 1.55 }}>{f.message}</div>
                                        <div className="cell-sub">{f.user_email}, {f.device_info}, {new Date(f.created_at).toLocaleString('en-IN')}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}
            </main>

            <Modal open={formOpen} onClose={() => setFormOpen(false)} title={form.id ? 'Edit user' : 'Add user'} icon={form.id ? Pencil : UserPlus}
                footer={(<><button type="button" className="ui-btn" onClick={() => setFormOpen(false)}>Cancel</button><button type="submit" form="user-form" className="ui-btn ui-btn--primary" disabled={busy}>{busy ? 'Saving' : 'Save'}</button></>)}>
                <form id="user-form" onSubmit={save} className="u-col" style={{ gap: 14 }}>
                    <div className="ui-field"><label className="ui-label" htmlFor="u-name">Full name</label><input id="u-name" className="ui-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                    <div className="ui-field"><label className="ui-label" htmlFor="u-email">College email</label><input id="u-email" type="email" className="ui-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
                    <div className="split split--even" style={{ gap: 14 }}>
                        <div className="ui-field"><label className="ui-label" htmlFor="u-role">Role</label><select id="u-role" className="ui-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                        <div className="ui-field"><label className="ui-label" htmlFor="u-dept">Department</label><input id="u-dept" className="ui-input" list="dept-list" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /><datalist id="dept-list">{departments.map((d) => <option key={d} value={d} />)}</datalist></div>
                    </div>
                    <div className="split split--even" style={{ gap: 14 }}>
                        <div className="ui-field"><label className="ui-label" htmlFor="u-des">Designation</label><input id="u-des" className="ui-input" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></div>
                        <div className="ui-field"><label className="ui-label" htmlFor="u-phone">Phone</label><input id="u-phone" className="ui-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                    </div>
                </form>
            </Modal>

            <Confirm open={!!confirm} title={confirm?.title} confirmLabel={confirm?.label} tone={confirm?.tone} busy={busy} onConfirm={() => confirm?.run()} onCancel={() => setConfirm(null)}>
                {confirm?.body}
            </Confirm>
        </div>
    );
};


