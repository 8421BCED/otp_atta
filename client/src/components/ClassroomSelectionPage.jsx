import React, { useState, useMemo } from 'react';
import { Building, DoorOpen, Search, ArrowRight, CheckCircle2, ChevronRight, MapPin } from 'lucide-react';

export const ClassroomSelectionPage = ({ 
    hierarchy, 
    onSelectRoom, 
    currentRoomId,
    onBackToHome
}) => {
    const [selectedBuildingId, setSelectedBuildingId] = useState(null);
    const [selectedFloorId, setSelectedFloorId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');

    // Smooth debounce on search to keep typing at 60fps with zero stutter
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 120);
        return () => clearTimeout(timer);
    }, [searchQuery]);

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

    // Filtered rooms using debounced search
    const searchResults = useMemo(() => {
        if (!debouncedQuery.trim()) return [];
        const q = debouncedQuery.trim().toLowerCase();
        return allRoomsList.filter(r => 
            r.room_number?.toLowerCase().includes(q) ||
            r.name?.toLowerCase().includes(q) ||
            r.department?.toLowerCase().includes(q) ||
            r.buildingName?.toLowerCase().includes(q) ||
            r.buildingCode?.toLowerCase().includes(q)
        );
    }, [allRoomsList, debouncedQuery]);

    const activeBuilding = hierarchy?.find(b => b.id === selectedBuildingId) || hierarchy?.[0];
    const availableFloors = activeBuilding?.floors || [];
    const activeFloor = availableFloors.find(f => f.id === selectedFloorId) || availableFloors[0];
    const availableRooms = activeFloor?.rooms || [];

    const handleRoomPick = (bId, fId, rId) => {
        onSelectRoom(bId, fId, rId);
        onBackToHome && onBackToHome();
    };

    return (
        <div className="classroom-page-container">
            {/* Top Navigation Bar */}
            <div className="classroom-page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="clean-app-icon" style={{ width: '38px', height: '38px', fontSize: '1.1rem' }}>
                        <MapPin size={18} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--dark-blue)', margin: 0 }}>
                            Select Classroom
                        </h1>
                        <p style={{ fontSize: '0.72rem', color: '#64748B', margin: '2px 0 0 0' }}>
                            Pick your current lecture hall or laboratory
                        </p>
                    </div>
                </div>

                {currentRoomId && (
                    <span className="current-room-badge">
                        Current: Room {currentRoomId}
                    </span>
                )}
            </div>

            {/* Instant Search Bar */}
            <div className="clean-input-box" style={{ margin: '14px 0 12px', background: '#FFFFFF' }}>
                <Search size={16} className="clean-input-icon" />
                <input
                    type="text"
                    className="clean-text-input"
                    placeholder="Search room (e.g. 101, Lab, AK 207)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                />
                {searchQuery && (
                    <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        style={{ border: 'none', background: '#E2E8F0', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '0.70rem', color: '#64748B' }}
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* If searching: Show Instant Search Results */}
            {searchQuery ? (
                <div className="classroom-search-results">
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '8px' }}>
                        {searchResults.length} Matching Rooms Found
                    </div>
                    {searchResults.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {searchResults.map((r) => {
                                const isCurrent = String(r.id) === String(currentRoomId);
                                return (
                                    <button
                                        key={r.id}
                                        type="button"
                                        className={`room-select-card ${isCurrent ? 'selected' : ''}`}
                                        onClick={() => handleRoomPick(r.buildingId, r.floorId, r.id)}
                                    >
                                        <div className="room-card-main">
                                            <div className="room-icon-box">
                                                <DoorOpen size={20} />
                                            </div>
                                            <div className="room-text-details">
                                                <div className="room-title-heading">
                                                    Room {r.room_number} <span style={{ color: 'var(--blue)', fontWeight: 600 }}>• {r.name}</span>
                                                </div>
                                                <div className="room-desc-subtitle">
                                                    {r.buildingName} • {r.floorName}
                                                </div>
                                            </div>
                                        </div>
                                        {isCurrent ? (
                                            <span className="room-current-badge">
                                                <CheckCircle2 size={15} /> Selected
                                            </span>
                                        ) : (
                                            <ChevronRight size={18} color="#94A3B8" className="room-arrow-icon" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{ padding: '30px 10px', textAlign: 'center', color: '#94A3B8', fontSize: '0.84rem' }}>
                            No classroom found matching "{searchQuery}"
                        </div>
                    )}
                </div>
            ) : (
                /* Structured Hierarchy Browser: Buildings -> Floors -> Rooms */
                <div className="classroom-hierarchy-browser">
                    {/* Building Horizontal Filter Chips */}
                    <div className="building-chips-row">
                        {(hierarchy || []).map((b) => {
                            const isSelected = (selectedBuildingId === b.id) || (!selectedBuildingId && activeBuilding?.id === b.id);
                            return (
                                <button
                                    key={b.id}
                                    type="button"
                                    className={`building-tab-chip ${isSelected ? 'active' : ''}`}
                                    onClick={() => {
                                        setSelectedBuildingId(b.id);
                                        setSelectedFloorId(null);
                                    }}
                                >
                                    <Building size={14} />
                                    <span>{b.name}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Floor Selector Pills */}
                    {availableFloors.length > 0 && (
                        <div className="floor-pills-row">
                            {availableFloors.map((f) => {
                                const isSelected = (selectedFloorId === f.id) || (!selectedFloorId && activeFloor?.id === f.id);
                                return (
                                    <button
                                        key={f.id}
                                        type="button"
                                        className={`floor-pill-btn ${isSelected ? 'active' : ''}`}
                                        onClick={() => setSelectedFloorId(f.id)}
                                    >
                                        {f.name}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Rooms in Active Floor Grid */}
                    <div className="rooms-grid-container">
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '8px' }}>
                            Rooms on {activeFloor?.name || 'Floor'} ({availableRooms.length})
                        </div>
                        <div className="rooms-cards-grid">
                            {availableRooms.map((r) => {
                                const isCurrent = String(r.id) === String(currentRoomId);
                                return (
                                    <button
                                        key={r.id}
                                        type="button"
                                        className={`room-select-card ${isCurrent ? 'selected' : ''}`}
                                        onClick={() => handleRoomPick(activeBuilding.id, activeFloor.id, r.id)}
                                    >
                                        <div className="room-card-main">
                                            <div className="room-icon-box">
                                                <DoorOpen size={18} />
                                            </div>
                                            <div className="room-text-details">
                                                <div className="room-title-heading">
                                                    Room {r.room_number}
                                                </div>
                                                <div className="room-desc-subtitle" title={r.name}>
                                                    {r.name}
                                                </div>
                                            </div>
                                        </div>
                                        {isCurrent ? (
                                            <span className="room-current-badge">
                                                ✓ Current
                                            </span>
                                        ) : (
                                            <ChevronRight size={16} color="#CBD5E1" className="room-arrow-icon" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
