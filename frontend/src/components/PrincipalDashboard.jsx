import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    Users, GraduationCap, DoorOpen, UserCheck, Building2, Layers, Plus, Trash2, Search, CalendarPlus, ChevronRight, MapPin, Clock
} from 'lucide-react';
import { StaffMovementModal } from './StaffMovementModal';
import { Confirm, Notice, Empty, Stat, SectionHead, Segmented, IconTile, Spinner } from './kit';
import { usePolling, useNotice } from '../hooks';

const CLOCK_PRESETS = [
    ['', 'Live clock'], ['09:02:00', '09:02, Period 1 on time'], ['09:15:00', '09:15, Period 1 late'], ['10:00:00', '10:00, Period 2'],
    ['11:15:00', '11:15, Period 3'], ['12:00:00', '12:00, Period 4'], ['13:45:00', '13:45, Period 5'], ['14:30:00', '14:30, Period 6'], ['15:45:00', '15:45, Period 7']
];

const post = async (url, body) => {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
};

export const PrincipalDashboard = ({ hierarchy = [], simulatedTime, setSimulatedTime, simulationEnabled, section = 'home' }) => {
    const [overview, setOverview] = useState(null);
    const [campus, setCampus] = useState(hierarchy);
    const [notice, showNotice] = useNotice();
    const [confirm, setConfirm] = useState(null);
    const [busy, setBusy] = useState(false);

    // Staff directory
    const [staff, setStaff] = useState([]);
    const [staffLoading, setStaffLoading] = useState(false);
    const [sq, setSq] = useState('');
    const [sDept, setSDept] = useState('all');
    const [sRole, setSRole] = useState('all');
    const [inspectedStaffId, setInspectedStaffId] = useState(null);
    const deptNames = useRef(new Set());

    // Campus forms
    const [campusTab, setCampusTab] = useState('rooms');
    const [bForm, setBForm] = useState({ name: '', code: '', description: '' });
    const [fForm, setFForm] = useState({ building: '', number: '', name: '' });
    const [rForm, setRForm] = useState({ building: '', floor: '', number: '', name: '', department: 'IT', capacity: 60 });

    // Holiday
    const [hol, setHol] = useState({ title: '', date: '', timed: false, start: '09:00', end: '12:30' });

    const loadOverview = useCallback(async () => {
        try {
            const [o, h] = await Promise.all([
                fetch('/api/principal/overview').then((r) => r.json()),
                fetch('/api/locations/hierarchy').then((r) => r.json())
            ]);
            setOverview(o);
            if (h.hierarchy) setCampus(h.hierarchy);
        } catch (e) { console.error('Failed to load overview:', e); }
    }, []);
    usePolling(loadOverview, 20000, section === 'home' || section === 'campus');

    const loadStaff = useCallback(async () => {
        setStaffLoading(true);
        try {
            const res = await fetch(`/api/principal/staffs?q=${encodeURIComponent(sq)}&department=${encodeURIComponent(sDept)}&role=${sRole}`);
            if (res.ok) {
                const data = await res.json();
                const list = data.staffs || [];
                setStaff(list);
                if (sDept === 'all') list.forEach((s) => s.department && deptNames.current.add(s.department));
            }
        } catch (e) { console.error('Failed to load staff:', e); } finally { setStaffLoading(false); }
    }, [sq, sDept, sRole]);

    useEffect(() => {
        if (section !== 'staff') return undefined;
        const t = setTimeout(loadStaff, 250);
        return () => clearTimeout(t);
    }, [section, loadStaff]);

    const floorsFor = (buildingId) => campus.find((b) => b.id === Number(buildingId))?.floors || [];

    const submit = async (url, body, okText, reset) => {
        const { ok, data } = await post(url, body);
        showNotice({ type: ok ? 'success' : 'error', text: ok ? okText : (data.error || 'Could not save') });
        if (ok) { reset && reset(); loadOverview(); }
    };

    const del = (title, bodyText, url) => setConfirm({
        title, body: bodyText, label: 'Delete', tone: 'danger',
        run: async () => {
            setBusy(true);
            try {
                const res = await fetch(url, { method: 'DELETE' });
                const data = await res.json().catch(() => ({}));
                showNotice({ type: res.ok ? 'success' : 'error', text: res.ok ? 'Removed' : (data.error || 'Could not delete') });
                loadOverview();
            } catch (e) { showNotice({ type: 'error', text: 'Server connection error' }); } finally { setBusy(false); setConfirm(null); }
        }
    });

    const declareHoliday = async (e) => {
        e.preventDefault();
        if (!hol.title || !hol.date) return;
        const { ok, data } = await post('/api/holidays/declare', {
            title: hol.title, holiday_date: hol.date, scope: 'college', is_timed: hol.timed ? 1 : 0,
            start_time: hol.timed ? `${hol.start}:00` : null, end_time: hol.timed ? `${hol.end}:00` : null
        });
        showNotice({ type: ok ? 'success' : 'error', text: data.message || data.error || 'Could not save' });
        if (ok) setHol((h) => ({ ...h, title: '', date: '' }));
    };

    const s = overview?.summary;
    const depts = useMemo(() => [...deptNames.current].sort(), [staff]);

    // ---------------------------------------------------------------- views
    const home = (
        <div className="stack">
            <div className="stat-grid">
                <Stat icon={GraduationCap} label="Students" value={s?.totalStudents ?? '-'} />
                <Stat icon={UserCheck} tone="pistachio" label="Present today" value={s?.totalPresent ?? '-'} hint={`${s?.overallAttendanceRate ?? 0}% college wide`} />
                <Stat icon={Users} label="Faculty and HODs" value={s?.totalStaff ?? '-'} />
                <Stat icon={DoorOpen} label="Rooms" value={s?.totalRooms ?? '-'} />
            </div>

            {simulationEnabled && (
                <section className="ui-card">
                    <SectionHead icon={Clock} tone="warn" title="Test clock" sub="Testing only. Changes what every screen treats as the current time."
                        right={<span className={`ui-chip ${simulatedTime ? 'ui-chip--od' : 'ui-chip--present'}`}>{simulatedTime ? `${simulatedTime.slice(0, 5)} simulated` : 'Live time'}</span>} />
                    <div className="u-row" style={{ flexWrap: 'wrap', gap: 8 }}>
                        {CLOCK_PRESETS.map(([v, l]) => (
                            <button key={v} type="button" className={`ui-btn ui-btn--sm ${(simulatedTime || '') === v ? 'ui-btn--primary' : ''}`}
                                onClick={() => { setSimulatedTime(v || null); try { v ? localStorage.setItem('fxec_simulated_time', v) : localStorage.removeItem('fxec_simulated_time'); } catch (e) { /* ignore */ } }}>
                                {l}
                            </button>
                        ))}
                    </div>
                </section>
            )}

            <div className="split split--even">
                <section className="ui-card">
                    <SectionHead icon={GraduationCap} title="Departments today" sub="Present out of enrolled" />
                    {overview?.deptStats?.length ? (
                        <div className="ui-table-wrap">
                            <table className="ui-table">
                                <thead><tr><th>Department</th><th>Enrolled</th><th>Present</th><th>Rate</th></tr></thead>
                                <tbody>
                                    {overview.deptStats.map((d) => {
                                        const rate = d.total_students ? Math.round((d.present_today / d.total_students) * 100) : 0;
                                        return (
                                            <tr key={d.department}>
                                                <td className="cell-strong">{d.department}</td>
                                                <td>{d.total_students}</td>
                                                <td>{d.present_today}</td>
                                                <td><span className={`ui-chip ${rate >= 75 ? 'ui-chip--present' : rate >= 40 ? 'ui-chip--od' : 'ui-chip--neutral'}`}>{rate}%</span></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : <Spinner label="Loading departments" />}
                </section>

                <section className="ui-card">
                    <SectionHead icon={Building2} title="Buildings now" sub="Students present by building" />
                    {overview?.buildingOccupancy?.length ? (
                        <div className="pick-list" style={{ maxHeight: 340 }}>
                            {overview.buildingOccupancy.map((b) => (
                                <div key={b.building_id} className="pick-item" style={{ cursor: 'default' }}>
                                    <IconTile icon={Building2} size={40} />
                                    <div className="u-grow"><div className="pick-name">{b.building_name}</div><div className="pick-sub">{b.room_count} rooms</div></div>
                                    <span className="ui-chip ui-chip--present">{b.students_present}</span>
                                </div>
                            ))}
                        </div>
                    ) : <Spinner label="Loading buildings" />}
                </section>
            </div>
        </div>
    );

    const staffView = (
        <section className="ui-card">
            <SectionHead icon={Users} title="Staff directory" sub="Open a person to see where they have been" />
            <div className="toolbar">
                <div className="search-bar"><Search size={18} /><input className="ui-input" placeholder="Search name, email or staff code" value={sq} onChange={(e) => setSq(e.target.value)} /></div>
                <div className="toolbar-actions">
                    <select className="ui-select" style={{ width: 'auto' }} value={sDept} onChange={(e) => setSDept(e.target.value)} aria-label="Department">
                        <option value="all">All departments</option>{depts.map((d) => <option key={d}>{d}</option>)}
                    </select>
                    <select className="ui-select" style={{ width: 'auto' }} value={sRole} onChange={(e) => setSRole(e.target.value)} aria-label="Role">
                        <option value="all">All roles</option><option value="hod">HODs</option><option value="staff">Faculty</option>
                    </select>
                </div>
            </div>
            {staffLoading && staff.length === 0 ? <Spinner label="Loading staff" /> : staff.length === 0 ? (
                <Empty icon={Users} title="No staff found">Try a different search.</Empty>
            ) : (
                <div className="ui-table-wrap table-scroll" style={{ maxHeight: 640 }}>
                    <table className="ui-table">
                        <thead><tr><th>Name</th><th>Role</th><th>Right now</th><th /></tr></thead>
                        <tbody>
                            {staff.map((p) => (
                                <tr key={p.id} className="row-click" onClick={() => setInspectedStaffId(p.id)}>
                                    <td><div className="cell-strong">{p.name}</div><div className="cell-sub">{p.email}</div></td>
                                    <td><span className={`ui-chip ${p.role === 'hod' ? 'ui-chip--solid' : ''}`}>{p.role === 'hod' ? 'HOD' : 'Faculty'}</span><div className="cell-sub" style={{ marginTop: 4 }}>{p.department}{p.designation ? `, ${p.designation}` : ''}</div></td>
                                    <td>{p.current_room_number
                                        ? <><div className="cell-strong"><MapPin size={13} style={{ verticalAlign: '-2px' }} /> Room {p.current_room_number}</div><div className="cell-sub">{p.current_building_name}</div></>
                                        : <span className="u-faint">Not in class</span>}</td>
                                    <td style={{ textAlign: 'right' }}><ChevronRight size={18} color="var(--ink-3)" /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );

    const campusView = (
        <div className="stack">
            <Notice notice={notice} />
            <Segmented label="Campus" value={campusTab} onChange={setCampusTab}
                options={[{ value: 'rooms', label: 'Add room' }, { value: 'floor', label: 'Add floor' }, { value: 'building', label: 'Add building' }, { value: 'manage', label: 'Manage' }]} />

            {campusTab === 'building' && (
                <section className="ui-card">
                    <SectionHead icon={Building2} title="Add a building" />
                    <form className="u-col" style={{ gap: 14, maxWidth: 520 }} onSubmit={(e) => { e.preventDefault(); submit('/api/locations/buildings', bForm, `Building ${bForm.name} added`, () => setBForm({ name: '', code: '', description: '' })); }}>
                        <div className="ui-field"><label className="ui-label" htmlFor="b-name">Name</label><input id="b-name" className="ui-input" value={bForm.name} onChange={(e) => setBForm({ ...bForm, name: e.target.value })} required /></div>
                        <div className="ui-field"><label className="ui-label" htmlFor="b-code">Short code</label><input id="b-code" className="ui-input" value={bForm.code} onChange={(e) => setBForm({ ...bForm, code: e.target.value })} required /></div>
                        <div className="ui-field"><label className="ui-label" htmlFor="b-desc">Description</label><input id="b-desc" className="ui-input" value={bForm.description} onChange={(e) => setBForm({ ...bForm, description: e.target.value })} /></div>
                        <button type="submit" className="ui-btn ui-btn--primary"><Plus size={18} />Add building</button>
                    </form>
                </section>
            )}

            {campusTab === 'floor' && (
                <section className="ui-card">
                    <SectionHead icon={Layers} title="Add a floor" />
                    <form className="u-col" style={{ gap: 14, maxWidth: 520 }} onSubmit={(e) => { e.preventDefault(); submit('/api/locations/floors', { building_id: Number(fForm.building), floor_number: Number(fForm.number), name: fForm.name }, `Floor ${fForm.name} added`, () => setFForm({ ...fForm, number: '', name: '' })); }}>
                        <div className="ui-field"><label className="ui-label" htmlFor="f-b">Building</label><select id="f-b" className="ui-select" value={fForm.building} onChange={(e) => setFForm({ ...fForm, building: e.target.value })} required><option value="">Choose</option>{campus.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                        <div className="ui-field"><label className="ui-label" htmlFor="f-n">Floor number</label><input id="f-n" type="number" className="ui-input" value={fForm.number} onChange={(e) => setFForm({ ...fForm, number: e.target.value })} required /></div>
                        <div className="ui-field"><label className="ui-label" htmlFor="f-name">Name</label><input id="f-name" className="ui-input" placeholder="e.g. First Floor" value={fForm.name} onChange={(e) => setFForm({ ...fForm, name: e.target.value })} required /></div>
                        <button type="submit" className="ui-btn ui-btn--primary"><Plus size={18} />Add floor</button>
                    </form>
                </section>
            )}

            {campusTab === 'rooms' && (
                <section className="ui-card">
                    <SectionHead icon={DoorOpen} title="Add a room or lab" />
                    <form className="u-col" style={{ gap: 14, maxWidth: 520 }} onSubmit={(e) => { e.preventDefault(); submit('/api/locations/rooms', { building_id: Number(rForm.building), floor_id: Number(rForm.floor), room_number: rForm.number, name: rForm.name, department: rForm.department, capacity: Number(rForm.capacity) }, `Room ${rForm.number} added`, () => setRForm({ ...rForm, number: '', name: '' })); }}>
                        <div className="ui-field"><label className="ui-label" htmlFor="r-b">Building</label><select id="r-b" className="ui-select" value={rForm.building} onChange={(e) => setRForm({ ...rForm, building: e.target.value, floor: '' })} required><option value="">Choose</option>{campus.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                        <div className="ui-field"><label className="ui-label" htmlFor="r-f">Floor</label><select id="r-f" className="ui-select" value={rForm.floor} onChange={(e) => setRForm({ ...rForm, floor: e.target.value })} required disabled={!rForm.building}><option value="">Choose</option>{floorsFor(rForm.building).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
                        <div className="split split--even" style={{ gap: 14 }}>
                            <div className="ui-field"><label className="ui-label" htmlFor="r-n">Room number</label><input id="r-n" className="ui-input" value={rForm.number} onChange={(e) => setRForm({ ...rForm, number: e.target.value })} required /></div>
                            <div className="ui-field"><label className="ui-label" htmlFor="r-c">Capacity</label><input id="r-c" type="number" className="ui-input" value={rForm.capacity} onChange={(e) => setRForm({ ...rForm, capacity: e.target.value })} /></div>
                        </div>
                        <div className="ui-field"><label className="ui-label" htmlFor="r-name">Name</label><input id="r-name" className="ui-input" placeholder="e.g. Programming Lab 2" value={rForm.name} onChange={(e) => setRForm({ ...rForm, name: e.target.value })} required /></div>
                        <div className="ui-field"><label className="ui-label" htmlFor="r-d">Department</label><input id="r-d" className="ui-input" value={rForm.department} onChange={(e) => setRForm({ ...rForm, department: e.target.value })} /></div>
                        <button type="submit" className="ui-btn ui-btn--primary"><Plus size={18} />Add room</button>
                    </form>
                </section>
            )}

            {campusTab === 'manage' && (
                <section className="ui-card">
                    <SectionHead icon={Building2} title="Campus structure" sub="Remove rooms or whole buildings. This cannot be undone." />
                    <div className="u-col" style={{ gap: 18 }}>
                        {campus.map((b) => (
                            <div key={b.id} className="ui-card ui-card--flat">
                                <div className="u-row u-between" style={{ marginBottom: 10 }}>
                                    <div><div className="cell-strong">{b.name}</div><div className="cell-sub">{b.code}, {(b.floors || []).reduce((n, f) => n + (f.rooms?.length || 0), 0)} rooms</div></div>
                                    <button type="button" className="ui-btn ui-btn--danger ui-btn--sm" onClick={() => del('Delete building?', `${b.name} and every floor and room inside it are removed.`, `/api/locations/buildings/${b.id}`)}><Trash2 size={15} />Delete building</button>
                                </div>
                                {(b.floors || []).map((f) => (
                                    <div key={f.id} style={{ marginTop: 10 }}>
                                        <div className="ui-eyebrow" style={{ marginBottom: 6 }}>{f.name}</div>
                                        <div className="u-row" style={{ flexWrap: 'wrap', gap: 8 }}>
                                            {(f.rooms || []).map((r) => (
                                                <button key={r.id} type="button" className="ui-chip" style={{ border: 0, cursor: 'pointer', height: 32 }} title={`Delete room ${r.room_number}`}
                                                    onClick={() => del('Delete room?', `Room ${r.room_number} (${r.name}) is removed from the campus.`, `/api/locations/rooms/${r.id}`)}>
                                                    {r.room_number}<Trash2 size={12} />
                                                </button>
                                            ))}
                                            {(f.rooms || []).length === 0 && <span className="u-faint u-small">No rooms</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );

    const holidaysView = (
        <div className="stack">
            <Notice notice={notice} />
            <section className="ui-card" style={{ maxWidth: 640 }}>
                <SectionHead icon={CalendarPlus} title="College holiday" sub="Applies to every department" />
                <form onSubmit={declareHoliday} className="u-col" style={{ gap: 14 }}>
                    <Segmented label="Type" value={hol.timed ? 'timed' : 'full'} onChange={(v) => setHol((h) => ({ ...h, timed: v === 'timed' }))} options={[{ value: 'full', label: 'Full day' }, { value: 'timed', label: 'Timed event' }]} />
                    <div className="ui-field"><label className="ui-label" htmlFor="h-t">Title</label><input id="h-t" className="ui-input" placeholder="e.g. Founder's Day" value={hol.title} onChange={(e) => setHol({ ...hol, title: e.target.value })} required /></div>
                    <div className="ui-field"><label className="ui-label" htmlFor="h-d">Date</label><input id="h-d" type="date" className="ui-input" value={hol.date} onChange={(e) => setHol({ ...hol, date: e.target.value })} required /></div>
                    {hol.timed && (
                        <div className="split split--even" style={{ gap: 14 }}>
                            <div className="ui-field"><label className="ui-label" htmlFor="h-s">From</label><input id="h-s" type="time" className="ui-input" value={hol.start} onChange={(e) => setHol({ ...hol, start: e.target.value })} /></div>
                            <div className="ui-field"><label className="ui-label" htmlFor="h-e">To</label><input id="h-e" type="time" className="ui-input" value={hol.end} onChange={(e) => setHol({ ...hol, end: e.target.value })} /></div>
                        </div>
                    )}
                    <button type="submit" className="ui-btn ui-btn--primary"><CalendarPlus size={18} />Declare holiday</button>
                </form>
            </section>
        </div>
    );

    return (
        <>
            {section === 'staff' ? staffView : section === 'campus' ? campusView : section === 'holidays' ? holidaysView : home}
            <StaffMovementModal isOpen={!!inspectedStaffId} onClose={() => setInspectedStaffId(null)} staffId={inspectedStaffId} />
            <Confirm open={!!confirm} title={confirm?.title} confirmLabel={confirm?.label} tone={confirm?.tone} busy={busy} onConfirm={() => confirm?.run()} onCancel={() => setConfirm(null)}>
                {confirm?.body}
            </Confirm>
        </>
    );
};
