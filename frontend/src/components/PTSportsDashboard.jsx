import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, Users, CalendarClock, Plus, Search, Trash2, X, Medal, ChevronRight, MapPin } from 'lucide-react';
import { Modal, Confirm, Notice, Empty, Stat, SectionHead, IconTile, Spinner } from './kit';
import { usePolling, useNotice } from '../hooks';

const todayStr = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
const SPORTS = ['Cricket', 'Football', 'Volleyball', 'Basketball', 'Kabaddi', 'Athletics', 'Badminton', 'Table Tennis', 'Chess', 'General Sports'];
const DEPARTMENTS = ['all', 'IT', 'CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AI&DS', 'MCA', 'MBA'];

export const PTSportsDashboard = () => {
    const [stats, setStats] = useState(null);
    const [passes, setPasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notice, showNotice] = useNotice();
    const [confirm, setConfirm] = useState(null);
    const [busy, setBusy] = useState(false);

    const [detail, setDetail] = useState(null); // { pass, students }

    const blank = { name: '', sport: 'Cricket', venue: 'FXEC Sports Ground', from: todayStr(), to: todayStr(), allDay: true, fromP: 1, toP: 7, reason: '' };
    const [createOpen, setCreateOpen] = useState(false);
    const [form, setForm] = useState(blank);
    const [squad, setSquad] = useState([]);
    const [sq, setSq] = useState('');
    const [sDept, setSDept] = useState('all');
    const [found, setFound] = useState([]);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try {
            const [st, ps] = await Promise.all([
                fetch('/api/sports/stats').then((r) => r.json()),
                fetch('/api/sports/passes').then((r) => r.json())
            ]);
            setStats(st);
            setPasses(ps.passes || []);
        } catch (e) { console.error('Failed to load sports data:', e); } finally { setLoading(false); }
    }, []);
    usePolling(load, 20000);

    useEffect(() => {
        if (!createOpen) return undefined;
        const t = setTimeout(async () => {
            try {
                const res = await fetch(`/api/sports/students-search?q=${encodeURIComponent(sq)}&department=${encodeURIComponent(sDept)}`);
                const data = await res.json();
                setFound(data.students || []);
            } catch (e) { /* keep previous */ }
        }, 250);
        return () => clearTimeout(t);
    }, [createOpen, sq, sDept]);

    const openDetail = async (p) => {
        try {
            const res = await fetch(`/api/sports/passes/${p.id}`);
            const data = await res.json();
            if (res.ok) setDetail(data);
        } catch (e) { showNotice({ type: 'error', text: 'Could not load the pass' }); }
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return showNotice({ type: 'error', text: 'Give the event a name.' });
        if (squad.length === 0) return showNotice({ type: 'error', text: 'Add at least one athlete.' });
        setSaving(true);
        try {
            const res = await fetch('/api/sports/passes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event_name: form.name.trim(), sport_category: form.sport, venue: form.venue.trim(),
                    from_date: form.from, to_date: form.to, is_all_day: form.allDay,
                    from_period: form.allDay ? 1 : Number(form.fromP), to_period: form.allDay ? 7 : Number(form.toP),
                    reason: form.reason.trim(), student_ids: squad.map((s) => ({ id: s.id, notes: '' }))
                })
            });
            const data = await res.json();
            if (res.ok) {
                showNotice({ type: 'success', text: data.message });
                setCreateOpen(false); setForm(blank); setSquad([]); setSq('');
                load();
            } else {
                showNotice({ type: 'error', text: data.error || 'Could not issue the pass' });
            }
        } catch (err) {
            showNotice({ type: 'error', text: 'Server connection error' });
        } finally { setSaving(false); }
    };

    const askRevoke = (p) => setConfirm({
        title: 'Revoke this pass?', body: `"${p.event_name}" ends now and its On-Duty credit is removed for ${p.student_count} athlete${p.student_count === 1 ? '' : 's'}.`,
        run: async () => {
            setBusy(true);
            try {
                const res = await fetch(`/api/sports/passes/${p.id}`, { method: 'DELETE' });
                const data = await res.json();
                showNotice({ type: res.ok ? 'success' : 'error', text: data.message || data.error });
                setDetail(null);
                load();
            } catch (e) { showNotice({ type: 'error', text: 'Server connection error' }); } finally { setBusy(false); setConfirm(null); }
        }
    });

    const today = todayStr();
    const state = (p) => (p.to_date < today ? ['neutral', 'Ended'] : p.from_date > today ? ['od', 'Upcoming'] : ['present', 'Active']);
    const candidates = found.filter((s) => !squad.some((x) => x.id === s.id));

    return (
        <div className="stack">
            <Notice notice={notice} />

            <div className="stat-grid">
                <Stat icon={Trophy} tone="pistachio" label="Active passes" value={stats?.activePassesCount ?? '-'} />
                <Stat icon={Users} label="Athletes on duty today" value={stats?.activeStudentsCount ?? '-'} />
                <Stat icon={CalendarClock} tone="warn" label="Upcoming events" value={stats?.upcomingEventsCount ?? '-'} />
                <Stat icon={Medal} tone="neutral" label="All time passes" value={stats?.totalPassesCount ?? '-'} />
            </div>

            <section className="ui-card">
                <SectionHead icon={Trophy} tone="pistachio" title="Sports On-Duty passes" sub="Athletes on a pass get On-Duty credit and skip the room code"
                    right={<button type="button" className="ui-btn ui-btn--primary" onClick={() => setCreateOpen(true)}><Plus size={18} />Issue pass</button>} />
                {loading ? <Spinner label="Loading passes" /> : passes.length === 0 ? (
                    <Empty icon={Trophy} title="No passes yet">Issue a pass when a team travels or trains during class hours.</Empty>
                ) : (
                    <div className="ui-table-wrap table-scroll" style={{ maxHeight: 560 }}>
                        <table className="ui-table">
                            <thead><tr><th>Event</th><th>Dates</th><th>Athletes</th><th>Status</th><th /></tr></thead>
                            <tbody>
                                {passes.map((p) => {
                                    const [tone, label] = state(p);
                                    return (
                                        <tr key={p.id} className="row-click" onClick={() => openDetail(p)}>
                                            <td><div className="cell-strong">{p.event_name}</div><div className="cell-sub">{p.sport_category}, {p.venue}</div></td>
                                            <td className="mono">{p.from_date}{p.to_date !== p.from_date ? ` to ${p.to_date}` : ''}</td>
                                            <td><span className="ui-chip">{p.student_count}</span></td>
                                            <td><span className={`ui-chip ui-chip--${tone}`}>{label}</span></td>
                                            <td style={{ textAlign: 'right' }}><ChevronRight size={18} color="var(--ink-3)" /></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Pass detail */}
            <Modal open={!!detail} onClose={() => setDetail(null)} size="md" icon={Trophy} tone="pistachio" title={detail?.pass.event_name}
                subtitle={detail ? `${detail.pass.sport_category}, ${detail.pass.venue}` : ''}
                footer={detail && (<><button type="button" className="ui-btn" onClick={() => setDetail(null)}>Close</button><button type="button" className="ui-btn ui-btn--danger" onClick={() => askRevoke({ ...detail.pass, student_count: detail.students.length })}><Trash2 size={16} />Revoke pass</button></>)}>
                {detail && (
                    <div className="u-col" style={{ gap: 14 }}>
                        <div className="u-row" style={{ flexWrap: 'wrap', gap: 8 }}>
                            <span className="ui-chip"><CalendarClock size={13} />{detail.pass.from_date} to {detail.pass.to_date}</span>
                            <span className="ui-chip ui-chip--neutral">{detail.pass.is_all_day ? 'All periods' : `Periods ${detail.pass.from_period} to ${detail.pass.to_period}`}</span>
                            <span className="ui-chip ui-chip--neutral"><MapPin size={13} />{detail.pass.venue}</span>
                        </div>
                        <div className="ui-table-wrap table-scroll" style={{ maxHeight: 340 }}>
                            <table className="ui-table">
                                <thead><tr><th>Athlete</th><th>Department</th></tr></thead>
                                <tbody>
                                    {detail.students.map((s) => (
                                        <tr key={s.id}><td><div className="cell-strong">{s.name}</div><div className="cell-sub">{s.roll_number || s.email}</div></td><td>{s.department}{s.year_of_study ? `, ${s.year_of_study}` : ''}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Create */}
            <Modal open={createOpen} onClose={() => setCreateOpen(false)} size="lg" icon={Plus} tone="pistachio" title="Issue sports pass" subtitle="Pick the event, the dates and the squad"
                footer={(<><button type="button" className="ui-btn" onClick={() => setCreateOpen(false)}>Cancel</button><button type="submit" form="pass-form" className="ui-btn ui-btn--primary" disabled={saving}>{saving ? 'Issuing' : `Issue pass${squad.length ? ` (${squad.length})` : ''}`}</button></>)}>
                <form id="pass-form" onSubmit={submit} className="u-col" style={{ gap: 16 }}>
                    <Notice notice={notice} />
                    <div className="split split--even" style={{ gap: 14 }}>
                        <div className="ui-field"><label className="ui-label" htmlFor="p-name">Event name</label><input id="p-name" className="ui-input" placeholder="e.g. Zonal football tournament" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                        <div className="ui-field"><label className="ui-label" htmlFor="p-sport">Sport</label><select id="p-sport" className="ui-select" value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })}>{SPORTS.map((s) => <option key={s}>{s}</option>)}</select></div>
                        <div className="ui-field"><label className="ui-label" htmlFor="p-venue">Venue</label><input id="p-venue" className="ui-input" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></div>
                        <div className="ui-field"><label className="ui-label" htmlFor="p-scope">Scope</label><select id="p-scope" className="ui-select" value={form.allDay ? 'all' : 'part'} onChange={(e) => setForm({ ...form, allDay: e.target.value === 'all' })}><option value="all">Full day, all periods</option><option value="part">Specific periods</option></select></div>
                        <div className="ui-field"><label className="ui-label" htmlFor="p-from">From</label><input id="p-from" type="date" className="ui-input" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value, to: e.target.value > form.to ? e.target.value : form.to })} required /></div>
                        <div className="ui-field"><label className="ui-label" htmlFor="p-to">To</label><input id="p-to" type="date" className="ui-input" min={form.from} value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} required /></div>
                        {!form.allDay && (
                            <>
                                <div className="ui-field"><label className="ui-label" htmlFor="p-fp">From period</label><select id="p-fp" className="ui-select" value={form.fromP} onChange={(e) => setForm({ ...form, fromP: e.target.value })}>{[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>Period {n}</option>)}</select></div>
                                <div className="ui-field"><label className="ui-label" htmlFor="p-tp">To period</label><select id="p-tp" className="ui-select" value={form.toP} onChange={(e) => setForm({ ...form, toP: e.target.value })}>{[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>Period {n}</option>)}</select></div>
                            </>
                        )}
                    </div>
                    <div className="ui-field"><label className="ui-label" htmlFor="p-reason">Note (optional)</label><input id="p-reason" className="ui-input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>

                    <div className="ui-field">
                        <div className="ui-label">Squad ({squad.length})</div>
                        {squad.length > 0 && (
                            <div className="u-row" style={{ flexWrap: 'wrap', gap: 8 }}>
                                {squad.map((s) => (
                                    <button key={s.id} type="button" className="ui-chip ui-chip--solid" style={{ border: 0, cursor: 'pointer', height: 30 }} onClick={() => setSquad((p) => p.filter((x) => x.id !== s.id))}>
                                        {s.name}<X size={13} />
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="toolbar" style={{ marginTop: 8, marginBottom: 8 }}>
                            <div className="search-bar"><Search size={18} /><input className="ui-input" placeholder="Search by name, email or roll number" value={sq} onChange={(e) => setSq(e.target.value)} /></div>
                            <select className="ui-select" style={{ width: 'auto' }} value={sDept} onChange={(e) => setSDept(e.target.value)} aria-label="Department">{DEPARTMENTS.map((d) => <option key={d} value={d}>{d === 'all' ? 'All departments' : d}</option>)}</select>
                        </div>
                        <div className="pick-list" style={{ maxHeight: 230 }}>
                            {candidates.map((s) => (
                                <button key={s.id} type="button" className="pick-item" onClick={() => setSquad((p) => [...p, s])}>
                                    <IconTile icon={Users} size={38} />
                                    <div className="u-grow"><div className="pick-name">{s.name}</div><div className="pick-sub">{s.department}{s.year_of_study ? `, ${s.year_of_study}` : ''}, {s.roll_number || s.email}</div></div>
                                    <Plus size={18} color="var(--denim-500)" />
                                </button>
                            ))}
                            {candidates.length === 0 && <div className="u-muted u-small" style={{ padding: 8 }}>No students to add. Try another search.</div>}
                        </div>
                    </div>
                </form>
            </Modal>

            <Confirm open={!!confirm} title={confirm?.title} confirmLabel="Revoke pass" tone="danger" busy={busy} onConfirm={() => confirm?.run()} onCancel={() => setConfirm(null)}>
                {confirm?.body}
            </Confirm>
        </div>
    );
};
