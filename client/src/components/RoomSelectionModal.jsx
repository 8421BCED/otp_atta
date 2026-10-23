import React, { useState, useMemo } from 'react';
import { Building, Layers, DoorOpen, Check, ChevronRight, X, ArrowLeft, Search } from 'lucide-react';

export const RoomSelectionModal = ({ 
    isOpen, 
    onClose, 
    hierarchy, 
    onSelectRoom, 
    currentRoomId 
}) => {
    const [step, setStep] = useState(1); // 1: Building, 2: Floor, 3: Room
    const [selectedB, setSelectedB] = useState(null);
    const [selectedF, setSelectedF] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Flatten all rooms across all buildings & floors for instant search
    const allRoomsList = useMemo(() => {
        if (!hierarchy) return [];
        const rooms = [];
        for (const b of hierarchy) {
            for (const f of (b.floors || [])) {
                for (const r of (f.rooms || [])) {
                    rooms.push({
                        ...r,
                        buildingId: b.id,
                        buildingName: b.name,
                        buildingCode: b.code,
                        floorId: f.id,
                        floorName: f.name
                    });
                }
            }
        }
        return rooms;
    }, [hierarchy]);

    // Filtered rooms when user searches
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.trim().toLowerCase();
        return allRoomsList.filter(r => 
            r.room_number?.toLowerCase().includes(q) ||
            r.name?.toLowerCase().includes(q) ||
            r.department?.toLowerCase().includes(q) ||
            r.buildingName?.toLowerCase().includes(q) ||
            r.buildingCode?.toLowerCase().includes(q)
        );
    }, [allRoomsList, searchQuery]);

    if (!isOpen) return null;

    const availableFloors = selectedB?.floors || [];
    const availableRooms = selectedF?.rooms || [];

    const handleBuildingSelect = (building) => {
        setSelectedB(building);
        setStep(2);
    };

    const handleFloorSelect = (floor) => {
        setSelectedF(floor);
        setStep(3);
    };

    const handleRoomSelect = (bId, fId, rId) => {
        onSelectRoom(bId, fId, rId);
        onClose();
        setStep(1);
        setSearchQuery('');
    };

    const handleClose = () => {
        setSearchQuery('');
        setStep(1);
        onClose();
    };

    return (
        <div className="aero-modal-backdrop" onClick={handleClose}>
            <div 
                className="aero-modal-card fa-glass-card room-picker-compact-card" 
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="aero-modal-header" style={{ padding: '14px 18px 10px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="aero-icon-bubble" style={{ width: '34px', height: '34px' }}>
                            <DoorOpen size={18} color="#136CFC" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--dark-blue)', margin: 0 }}>
                                Select Classroom / Lab Location
                            </h2>
                            <p style={{ fontSize: '0.72rem', color: 'var(--text-sub)', margin: '2px 0 0 0' }}>
                                Search room number directly or browse buildings
                            </p>
                        </div>
                    </div>
                    <button type="button" className="aero-close-btn" onClick={handleClose}>
                        <X size={16} />
                    </button>
                </div>

                {/* Instant Search Bar */}
                <div className="room-modal-search-box">
                    <Search size={15} color="var(--blue)" className="search-box-icon" />
                    <input 
                        type="text"
                        className="room-modal-search-input"
                        placeholder="Search any room (e.g. 207, AK 102, Lab, Mech)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                    {searchQuery && (
                        <button 
                            type="button" 
                            className="search-clear-btn"
                            onClick={() => setSearchQuery('')}
                            title="Clear search"
                        >
                            <X size={13} />
                        </button>
                    )}
                </div>

                {/* SEARCH RESULTS VIEW (If user types in search bar) */}
                {searchQuery.trim() ? (
                    <div className="aero-picker-step-view" style={{ padding: '10px 18px 16px 18px', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--blue)' }}>
                                Search Results ({searchResults.length} rooms found):
                            </span>
                            <button 
                                type="button" 
                                style={{ background: 'none', border: 'none', color: 'var(--text-sub)', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
                                onClick={() => setSearchQuery('')}
                            >
                                Back to browsing
                            </button>
                        </div>

                        <div className="aero-card-options-grid compact-scroll-list">
                            {searchResults.length === 0 ? (
                                <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-sub)', fontSize: '0.82rem' }}>
                                    No rooms found matching "{searchQuery}". Try a room number like "207" or "AK".
                                </div>
                            ) : (
                                searchResults.map(r => (
                                    <button
                                        key={r.id}
                                        type="button"
                                        className={`aero-option-tile compact-tile ${currentRoomId === r.id ? 'active' : ''}`}
                                        onClick={() => handleRoomSelect(r.buildingId, r.floorId, r.id)}
                                    >
                                        <div className="tile-icon-wrap" style={{ width: '30px', height: '30px', marginRight: '10px' }}>
                                            <DoorOpen size={16} color="#136CFC" />
                                        </div>
                                        <div className="tile-details">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span className="tile-name">{r.room_number}</span>
                                                <span className="room-building-pill">{r.buildingCode} • {r.floorName}</span>
                                            </div>
                                            <div className="tile-sub">{r.name}</div>
                                        </div>
                                        <div className="tile-select-badge">
                                            {currentRoomId === r.id ? 'Selected' : 'Confirm'}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                ) : (
                    /* STEP-BY-STEP BROWSING VIEW */
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                        {/* Compact Breadcrumbs */}
                        <div className="aero-breadcrumb-bar" style={{ margin: '0 18px 10px 18px', padding: '6px 10px' }}>
                            <button 
                                type="button" 
                                className={`crumb-pill ${step === 1 ? 'active' : step > 1 ? 'done' : ''}`}
                                onClick={() => setStep(1)}
                            >
                                <Building size={13} />
                                <span>1. Building: {selectedB ? selectedB.code || selectedB.name.slice(0, 10) : 'Select'}</span>
                            </button>
                            <ChevronRight size={13} color="rgba(255,255,255,0.4)" />
                            <button 
                                type="button" 
                                className={`crumb-pill ${step === 2 ? 'active' : step > 2 ? 'done' : ''}`}
                                onClick={() => selectedB && setStep(2)}
                                disabled={!selectedB}
                            >
                                <Layers size={13} />
                                <span>2. Floor: {selectedF ? selectedF.name : 'Select'}</span>
                            </button>
                            <ChevronRight size={13} color="rgba(255,255,255,0.4)" />
                            <button 
                                type="button" 
                                className={`crumb-pill ${step === 3 ? 'active' : ''}`}
                                disabled={!selectedF}
                            >
                                <DoorOpen size={13} />
                                <span>3. Room</span>
                            </button>
                        </div>

                        {/* Step 1: Select Building */}
                        {step === 1 && (
                            <div className="aero-picker-step-view" style={{ padding: '0 18px 16px 18px', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                <div className="step-title-row" style={{ marginBottom: '6px' }}>
                                    <span style={{ fontSize: '0.80rem', fontWeight: 700, color: '#136CFC' }}>Step 1: Choose Building</span>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>Tap to proceed</span>
                                </div>
                                <div className="aero-card-options-grid compact-scroll-list">
                                    {hierarchy?.map(b => (
                                        <button
                                            key={b.id}
                                            type="button"
                                            className={`aero-option-tile compact-tile ${selectedB?.id === b.id ? 'active' : ''}`}
                                            onClick={() => handleBuildingSelect(b)}
                                        >
                                            <div className="tile-icon-wrap" style={{ width: '32px', height: '32px' }}>
                                                <Building size={18} color="#136CFC" />
                                            </div>
                                            <div className="tile-details">
                                                <div className="tile-name">{b.name}</div>
                                                <div className="tile-sub">{b.description || `${b.floors?.length || 0} Floors Available`}</div>
                                            </div>
                                            <ChevronRight size={15} className="tile-arrow" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Step 2: Select Floor */}
                        {step === 2 && (
                            <div className="aero-picker-step-view" style={{ padding: '0 18px 16px 18px', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                <div className="step-title-row" style={{ marginBottom: '6px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <button type="button" className="aero-back-btn" onClick={() => setStep(1)}>
                                            <ArrowLeft size={14} />
                                        </button>
                                        <span style={{ fontSize: '0.80rem', fontWeight: 700, color: '#136CFC' }}>
                                            Step 2: Choose Floor in {selectedB?.code || selectedB?.name}
                                        </span>
                                    </div>
                                </div>
                                <div className="aero-card-options-grid compact-scroll-list">
                                    {availableFloors.map(f => (
                                        <button
                                            key={f.id}
                                            type="button"
                                            className={`aero-option-tile compact-tile ${selectedF?.id === f.id ? 'active' : ''}`}
                                            onClick={() => handleFloorSelect(f)}
                                        >
                                            <div className="tile-icon-wrap" style={{ width: '32px', height: '32px' }}>
                                                <Layers size={18} color="#16A34A" />
                                            </div>
                                            <div className="tile-details">
                                                <div className="tile-name">{f.name}</div>
                                                <div className="tile-sub">{f.rooms?.length || 0} Rooms / Laboratories</div>
                                            </div>
                                            <ChevronRight size={15} className="tile-arrow" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Step 3: Select Room */}
                        {step === 3 && (
                            <div className="aero-picker-step-view" style={{ padding: '0 18px 16px 18px', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                <div className="step-title-row" style={{ marginBottom: '6px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <button type="button" className="aero-back-btn" onClick={() => setStep(2)}>
                                            <ArrowLeft size={14} />
                                        </button>
                                        <span style={{ fontSize: '0.80rem', fontWeight: 700, color: '#136CFC' }}>
                                            Step 3: Select Room ({selectedF?.name})
                                        </span>
                                    </div>
                                </div>
                                <div className="aero-card-options-grid compact-scroll-list">
                                    {availableRooms.map(r => (
                                        <button
                                            key={r.id}
                                            type="button"
                                            className={`aero-option-tile compact-tile ${currentRoomId === r.id ? 'active' : ''}`}
                                            onClick={() => handleRoomSelect(selectedB.id, selectedF.id, r.id)}
                                        >
                                            <div className="tile-icon-wrap" style={{ width: '32px', height: '32px' }}>
                                                <DoorOpen size={18} color="#136CFC" />
                                            </div>
                                            <div className="tile-details">
                                                <div className="tile-name">Room {r.room_number}</div>
                                                <div className="tile-sub">{r.name} • {r.department} Dept</div>
                                            </div>
                                            <div className="tile-select-badge">
                                                {currentRoomId === r.id ? 'Selected' : 'Confirm'}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
