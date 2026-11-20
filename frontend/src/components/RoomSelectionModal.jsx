import React, { useState, useMemo } from 'react';
import { Building2, Layers, DoorOpen, ChevronRight, Search, Check } from 'lucide-react';
import { Modal, IconTile, Empty, ICON_STROKE } from './kit';

export const RoomSelectionModal = ({ isOpen, onClose, hierarchy, onSelectRoom, currentRoomId }) => {
    const [step, setStep] = useState(1); // 1 building, 2 floor, 3 room
    const [selectedB, setSelectedB] = useState(null);
    const [selectedF, setSelectedF] = useState(null);
    const [query, setQuery] = useState('');

    const allRooms = useMemo(() => {
        const rooms = [];
        for (const b of hierarchy || []) {
            for (const f of b.floors || []) {
                for (const r of f.rooms || []) {
                    rooms.push({ ...r, buildingId: b.id, buildingName: b.name, buildingCode: b.code, floorId: f.id, floorName: f.name });
                }
            }
        }
        return rooms;
    }, [hierarchy]);

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        return allRooms.filter((r) =>
            [r.room_number, r.name, r.department, r.buildingName, r.buildingCode].some((v) => v && String(v).toLowerCase().includes(q))
        ).slice(0, 80);
    }, [allRooms, query]);

    const reset = () => { setQuery(''); setStep(1); };
    const close = () => { reset(); onClose(); };
    const choose = (bId, fId, rId) => { onSelectRoom(bId, fId, rId); close(); };

    const RoomRow = ({ r, bId, fId, sub }) => (
        <button type="button" className={`pick-item ${Number(currentRoomId) === r.id ? 'is-selected' : ''}`} onClick={() => choose(bId, fId, r.id)}>
            <IconTile icon={DoorOpen} size={40} />
            <div className="u-grow">
                <div className="pick-name">Room {r.room_number}</div>
                <div className="pick-sub u-truncate">{sub}</div>
            </div>
            {Number(currentRoomId) === r.id
                ? <span className="ui-chip ui-chip--present"><Check size={13} />Current</span>
                : <ChevronRight size={18} color="var(--ink-3)" />}
        </button>
    );

    return (
        <Modal open={isOpen} onClose={close} title="Choose classroom" subtitle="Search a room number, or browse by building" icon={DoorOpen}>
            <div className="search-bar">
                <Search size={18} />
                <input
                    className="ui-input"
                    type="text"
                    placeholder="Room number, lab name or block"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                />
            </div>

            {query.trim() ? (
                results.length === 0 ? (
                    <Empty icon={Search} title="No rooms found">Try a room number such as 207, or part of a lab name.</Empty>
                ) : (
                    <div className="pick-list">
                        {results.map((r) => (
                            <RoomRow key={r.id} r={r} bId={r.buildingId} fId={r.floorId} sub={`${r.name}, ${r.buildingCode || r.buildingName}, ${r.floorName}`} />
                        ))}
                    </div>
                )
            ) : (
                <>
                    <div className="crumbs">
                        <button type="button" className={`crumb ${step === 1 ? 'is-active' : ''}`} onClick={() => setStep(1)}>
                            <Building2 size={15} strokeWidth={ICON_STROKE} />{selectedB ? (selectedB.code || selectedB.name) : 'Building'}
                        </button>
                        <ChevronRight size={14} className="crumb-sep" />
                        <button type="button" className={`crumb ${step === 2 ? 'is-active' : ''}`} onClick={() => selectedB && setStep(2)} disabled={!selectedB}>
                            <Layers size={15} strokeWidth={ICON_STROKE} />{selectedF ? selectedF.name : 'Floor'}
                        </button>
                        <ChevronRight size={14} className="crumb-sep" />
                        <button type="button" className={`crumb ${step === 3 ? 'is-active' : ''}`} disabled={!selectedF}>
                            <DoorOpen size={15} strokeWidth={ICON_STROKE} />Room
                        </button>
                    </div>

                    <div className="pick-list">
                        {step === 1 && (hierarchy || []).map((b) => (
                            <button key={b.id} type="button" className={`pick-item ${selectedB?.id === b.id ? 'is-selected' : ''}`}
                                onClick={() => { setSelectedB(b); setSelectedF(null); setStep(2); }}>
                                <IconTile icon={Building2} size={40} />
                                <div className="u-grow">
                                    <div className="pick-name">{b.name}</div>
                                    <div className="pick-sub">{b.description || `${b.floors?.length || 0} floors`}</div>
                                </div>
                                <ChevronRight size={18} color="var(--ink-3)" />
                            </button>
                        ))}

                        {step === 2 && (selectedB?.floors || []).map((f) => (
                            <button key={f.id} type="button" className={`pick-item ${selectedF?.id === f.id ? 'is-selected' : ''}`}
                                onClick={() => { setSelectedF(f); setStep(3); }}>
                                <IconTile icon={Layers} tone="pistachio" size={40} />
                                <div className="u-grow">
                                    <div className="pick-name">{f.name}</div>
                                    <div className="pick-sub">{f.rooms?.length || 0} rooms and labs</div>
                                </div>
                                <ChevronRight size={18} color="var(--ink-3)" />
                            </button>
                        ))}

                        {step === 3 && (selectedF?.rooms || []).map((r) => (
                            <RoomRow key={r.id} r={r} bId={selectedB.id} fId={selectedF.id} sub={`${r.name}, ${r.department} department`} />
                        ))}
                    </div>
                </>
            )}
        </Modal>
    );
};
