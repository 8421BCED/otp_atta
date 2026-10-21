import React, { useState } from 'react';
import { Building, Layers, DoorOpen, Check, ChevronRight, X, ArrowLeft } from 'lucide-react';

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

    const handleRoomSelect = (room) => {
        onSelectRoom(selectedB.id, selectedF.id, room.id);
        onClose();
        setStep(1);
    };

    const handleReset = () => {
        setStep(1);
        setSelectedB(null);
        setSelectedF(null);
    };

    return (
        <div className="aero-modal-backdrop" onClick={onClose}>
            <div className="aero-modal-card fa-glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px', width: '92%' }}>
                
                {/* Header */}
                <div className="aero-modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="aero-icon-bubble">
                            <DoorOpen size={20} color="#136CFC" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--dark-blue)' }}>Select Classroom / Lab Location</h2>
                            <p style={{ fontSize: '0.74rem', color: 'var(--text-sub)' }}>
                                Step-by-step room routing for active period attendance
                            </p>
                        </div>
                    </div>
                    <button type="button" className="aero-close-btn" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Breadcrumb Steps */}
                <div className="aero-breadcrumb-bar">
                    <button 
                        type="button" 
                        className={`crumb-pill ${step === 1 ? 'active' : step > 1 ? 'done' : ''}`}
                        onClick={() => setStep(1)}
                    >
                        <Building size={14} />
                        <span>1. Building: {selectedB ? selectedB.code || selectedB.name.slice(0, 15) : 'Select'}</span>
                    </button>
                    <ChevronRight size={14} color="rgba(255,255,255,0.4)" />
                    <button 
                        type="button" 
                        className={`crumb-pill ${step === 2 ? 'active' : step > 2 ? 'done' : ''}`}
                        onClick={() => selectedB && setStep(2)}
                        disabled={!selectedB}
                    >
                        <Layers size={14} />
                        <span>2. Floor: {selectedF ? selectedF.name : 'Select'}</span>
                    </button>
                    <ChevronRight size={14} color="rgba(255,255,255,0.4)" />
                    <button 
                        type="button" 
                        className={`crumb-pill ${step === 3 ? 'active' : ''}`}
                        disabled={!selectedF}
                    >
                        <DoorOpen size={14} />
                        <span>3. Room</span>
                    </button>
                </div>

                {/* Step 1: Select Building */}
                {step === 1 && (
                    <div className="aero-picker-step-view">
                        <div className="step-title-row">
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#136CFC' }}>Step 1: Choose Your Building</span>
                            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Tap to proceed</span>
                        </div>
                        <div className="aero-card-options-grid">
                            {hierarchy?.map(b => (
                                <button
                                    key={b.id}
                                    type="button"
                                    className={`aero-option-tile ${selectedB?.id === b.id ? 'active' : ''}`}
                                    onClick={() => handleBuildingSelect(b)}
                                >
                                    <div className="tile-icon-wrap">
                                        <Building size={22} color="#136CFC" />
                                    </div>
                                    <div className="tile-details">
                                        <div className="tile-name">{b.name}</div>
                                        <div className="tile-sub">{b.description || `${b.floors?.length || 0} Floors Available`}</div>
                                    </div>
                                    <ChevronRight size={16} className="tile-arrow" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 2: Select Floor */}
                {step === 2 && (
                    <div className="aero-picker-step-view">
                        <div className="step-title-row">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button type="button" className="aero-back-btn" onClick={() => setStep(1)}>
                                    <ArrowLeft size={16} />
                                </button>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#136CFC' }}>
                                    Step 2: Choose Floor in {selectedB?.name}
                                </span>
                            </div>
                        </div>
                        <div className="aero-card-options-grid">
                            {availableFloors.map(f => (
                                <button
                                    key={f.id}
                                    type="button"
                                    className={`aero-option-tile ${selectedF?.id === f.id ? 'active' : ''}`}
                                    onClick={() => handleFloorSelect(f)}
                                >
                                    <div className="tile-icon-wrap">
                                        <Layers size={22} color="#C3F84A" />
                                    </div>
                                    <div className="tile-details">
                                        <div className="tile-name">{f.name}</div>
                                        <div className="tile-sub">{f.rooms?.length || 0} Rooms / Laboratories</div>
                                    </div>
                                    <ChevronRight size={16} className="tile-arrow" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 3: Select Room */}
                {step === 3 && (
                    <div className="aero-picker-step-view">
                        <div className="step-title-row">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button type="button" className="aero-back-btn" onClick={() => setStep(2)}>
                                    <ArrowLeft size={16} />
                                </button>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#136CFC' }}>
                                    Step 3: Select Room ({selectedF?.name})
                                </span>
                            </div>
                        </div>
                        <div className="aero-card-options-grid">
                            {availableRooms.map(r => (
                                <button
                                    key={r.id}
                                    type="button"
                                    className={`aero-option-tile ${currentRoomId === r.id ? 'active' : ''}`}
                                    onClick={() => handleRoomSelect(r)}
                                >
                                    <div className="tile-icon-wrap">
                                        <DoorOpen size={22} color="#136CFC" />
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
        </div>
    );
};
