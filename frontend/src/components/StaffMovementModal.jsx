import React, { useState, useEffect } from 'react';
import { 
    Calendar as CalendarIcon, 
    X, 
    MapPin, 
    Clock, 
    Building2, 
    Briefcase, 
    Mail, 
    Phone, 
    Navigation,
    UserCheck,
    Layers,
    History
} from 'lucide-react';

export const StaffMovementModal = ({ isOpen, onClose, staffId }) => {
    const [details, setDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [viewTab, setViewTab] = useState('timeline'); // 'timeline' or 'calendar'
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

    useEffect(() => {
        if (!isOpen || !staffId) return;
        const fetchDetails = async () => {
            setIsLoading(true);
            try {
                const token = localStorage.getItem('fxec_token');
                const res = await fetch(`/api/principal/staff-details/${staffId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setDetails(data);
                }
            } catch (err) {
                console.error('Failed to load staff details:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDetails();
    }, [isOpen, staffId]);

    if (!isOpen) return null;

    const staff = details?.staff;
    const currentLocation = details?.currentLocation;
    const todayMovements = details?.todayMovements || [];
    const yesterdayMovements = details?.yesterdayMovements || [];
    const allMovements = details?.allMovements || [];

    // Filter movements by selected date for calendar inspection
    const selectedDateMovements = allMovements.filter(m => {
        const d = new Date(m.timestamp).toISOString().slice(0, 10);
        return d === selectedDate || m.date === selectedDate;
    });

    // Dynamically build October 2026 calendar days
    const octDays = Array.from({ length: 31 }, (_, i) => {
        const d = i + 1;
        const dateStr = `2026-10-${String(d).padStart(2, '0')}`;
        const dayOfWeek = (4 + i) % 7;
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        const dayMoves = allMovements.filter(m => {
            const mDate = new Date(m.timestamp).toISOString().slice(0, 10);
            return mDate === dateStr || m.date === dateStr;
        });

        return {
            day: d,
            dateStr,
            isWeekend,
            moveCount: dayMoves.length,
            hasMoves: dayMoves.length > 0,
            rooms: [...new Set(dayMoves.map(m => m.room_number).filter(Boolean))].join(', ')
        };
    });

    return (
        <div className="aero-modal-backdrop" onClick={onClose}>
            <div 
                className="aero-modal-card fa-glass-card" 
                onClick={e => e.stopPropagation()}
                style={{ maxWidth: '850px', width: '95%', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}
            >
                {/* Modal Header */}
                <div className="aero-modal-header" style={{ paddingBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '12px',
                            background: staff?.role === 'hod' ? 'linear-gradient(135deg, #A9762B 0%, #8B5F22 100%)' : 'linear-gradient(135deg, #5798D7 0%, #2E5F93 100%)',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '1.2rem',
                            boxShadow: '0 4px 12px rgba(87, 152, 215, 0.25)'
                        }}>
                            {staff?.name ? staff.name.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h2 style={{ fontSize: '1.18rem', fontWeight: 800, color: 'var(--dark-blue)', margin: 0 }}>
                                    {staff?.name || 'Staff Member'}
                                </h2>
                                <span style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 800,
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    textTransform: 'uppercase',
                                    background: staff?.role === 'hod' ? '#F6E9CB' : '#D3E5F5',
                                    color: staff?.role === 'hod' ? '#A9762B' : '#2E5F93'
                                }}>
                                    {staff?.role === 'hod' ? 'HOD' : 'FACULTY'}
                                </span>
                            </div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-sub)', marginTop: '2px' }}>
                                {staff?.designation || 'Staff'} • {staff?.department} Department {staff?.staff_code ? `• Code: ${staff.staff_code}` : ''}
                            </div>
                        </div>
                    </div>

                    <button type="button" className="aero-close-btn" onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>

                {isLoading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-sub)' }}>
                        Loading movement & location history...
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>

                        {/* Top Live Presence Banner */}
                        <div style={{
                            background: currentLocation ? '#EEF1CF' : '#E6F1FA',
                            border: currentLocation ? '1.5px solid #CBD577' : '1px solid #CBDCEB',
                            borderRadius: '12px',
                            padding: '14px 18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '12px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    background: currentLocation ? '#EEF1CF' : '#CBDCEB',
                                    color: currentLocation ? '#7F8B26' : '#526579',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <MapPin size={20} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800, color: currentLocation ? '#5F6A1B' : 'var(--text-sub)' }}>
                                        {currentLocation ? '● Current Verified Location' : 'Live Presence'}
                                    </div>
                                    <div style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--dark-blue)' }}>
                                        {currentLocation ? `Room ${currentLocation.room_number} – ${currentLocation.room_name}` : 'Not checked into any classroom today'}
                                    </div>
                                    {currentLocation && (
                                        <div style={{ fontSize: '0.74rem', color: 'var(--text-sub)', marginTop: '2px' }}>
                                            {currentLocation.building_name} ({currentLocation.floor_name}) • Active OTP Session
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    type="button"
                                    className={`role-btn ${viewTab === 'timeline' ? 'active' : ''}`}
                                    style={{ padding: '6px 14px', fontSize: '0.76rem' }}
                                    onClick={() => setViewTab('timeline')}
                                >
                                    <History size={13} style={{ display: 'inline', marginRight: '4px' }} />
                                    Today & Yesterday
                                </button>
                                <button
                                    type="button"
                                    className={`role-btn ${viewTab === 'calendar' ? 'active' : ''}`}
                                    style={{ padding: '6px 14px', fontSize: '0.76rem' }}
                                    onClick={() => setViewTab('calendar')}
                                >
                                    <CalendarIcon size={13} style={{ display: 'inline', marginRight: '4px' }} />
                                    Monthly Calendar
                                </button>
                            </div>
                        </div>

                        {/* View Tab 1: Today & Yesterday Timeline */}
                        {viewTab === 'timeline' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                                
                                {/* Today Timeline */}
                                <div className="fx-card" style={{ background: '#E6F1FA', padding: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <div style={{ fontWeight: 800, color: 'var(--dark-blue)', fontSize: '0.90rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Clock size={16} color="var(--blue)" />
                                            <span>Today's Movements</span>
                                        </div>
                                        <span className="aero-pill cyan" style={{ fontSize: '0.68rem' }}>
                                            {todayMovements.length} Classroom Sessions
                                        </span>
                                    </div>

                                    {todayMovements.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {todayMovements.map((m, idx) => (
                                                <div key={idx} style={{
                                                    background: '#E6F1FA',
                                                    border: '1px solid #CBDCEB',
                                                    borderRadius: '8px',
                                                    padding: '10px 12px',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}>
                                                    <div>
                                                        <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--dark-blue)' }}>
                                                            Room {m.room_number} – {m.room_name}
                                                        </div>
                                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>
                                                            {m.building_name} ({m.floor_name})
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--blue)' }}>
                                                            {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                        <span style={{ fontSize: '0.66rem', color: '#7F8B26', fontWeight: 800 }}>● Active</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.80rem' }}>
                                            No classroom movements recorded for today yet.
                                        </div>
                                    )}
                                </div>

                                {/* Yesterday Timeline (Answering the user's explicit request: see where they were yesterday) */}
                                <div className="fx-card" style={{ background: '#E6F1FA', padding: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <div style={{ fontWeight: 800, color: 'var(--dark-blue)', fontSize: '0.90rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <CalendarIcon size={16} color="#A9762B" />
                                            <span>Where They Were Yesterday</span>
                                        </div>
                                        <span className="aero-pill purple" style={{ fontSize: '0.68rem' }}>
                                            {yesterdayMovements.length} Locations
                                        </span>
                                    </div>

                                    {yesterdayMovements.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {yesterdayMovements.map((m, idx) => (
                                                <div key={idx} style={{
                                                    background: '#F6E9CB',
                                                    border: '1px solid #EEDDA8',
                                                    borderRadius: '8px',
                                                    padding: '10px 12px',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}>
                                                    <div>
                                                        <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#8B5F22' }}>
                                                            Room {m.room_number} – {m.room_name}
                                                        </div>
                                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>
                                                            {m.building_name} ({m.floor_name})
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#A9762B' }}>
                                                            {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                        <span style={{ fontSize: '0.66rem', color: '#8B5F22', fontWeight: 700 }}>Yesterday</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.80rem' }}>
                                            No recorded movements for yesterday.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* View Tab 2: Monthly Calendar Grid */}
                        {viewTab === 'calendar' && (
                            <div className="fx-card" style={{ background: '#E6F1FA', padding: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                                    <div style={{ fontWeight: 800, color: 'var(--dark-blue)', fontSize: '0.95rem' }}>
                                        October 2026 Movement & Classroom Calendar
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>
                                        Click any day to view where this staff member taught / moved
                                    </div>
                                </div>

                                {/* Day Headers */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', textAlign: 'center', marginBottom: '6px' }}>
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                                        <div key={i} style={{ fontSize: '0.70rem', fontWeight: 800, color: i === 0 || i === 6 ? '#C25B56' : 'var(--text-sub)', textTransform: 'uppercase' }}>
                                            {d}
                                        </div>
                                    ))}
                                </div>

                                {/* Calendar Days (Oct 1 2026 starts on Thursday = index 4) */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                                    {/* Empty cells before Thu */}
                                    {[0, 1, 2, 3].map(e => (
                                        <div key={`empty-${e}`} style={{ minHeight: '60px', opacity: 0.2 }} />
                                    ))}

                                    {octDays.map(item => {
                                        const isSelected = selectedDate === item.dateStr;
                                        return (
                                            <div
                                                key={item.day}
                                                onClick={() => setSelectedDate(item.dateStr)}
                                                style={{
                                                    minHeight: '62px',
                                                    padding: '6px',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    border: isSelected ? '2px solid var(--blue)' : '1px solid #CBDCEB',
                                                    background: isSelected ? '#D3E5F5' : (item.hasMoves ? '#EEF1CF' : (item.isWeekend ? '#E6F1FA' : '#FFFFFF')),
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    justifyContent: 'space-between'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.76rem', fontWeight: 800, color: item.isWeekend ? '#8497AB' : 'var(--dark-blue)' }}>
                                                        {item.day}
                                                    </span>
                                                    {item.hasMoves && (
                                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7F8B26' }} />
                                                    )}
                                                </div>

                                                {item.hasMoves ? (
                                                    <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#5F6A1B', lineHeight: 1.1 }}>
                                                        {item.moveCount} Moves<br />
                                                        <span style={{ color: '#2E5F93' }}>{item.rooms}</span>
                                                    </div>
                                                ) : (
                                                    <div style={{ fontSize: '0.60rem', color: '#8497AB' }}>
                                                        {item.isWeekend ? 'Off' : 'No Data'}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Selected Day Details */}
                                <div style={{ marginTop: '16px', background: '#E6F1FA', padding: '12px 14px', borderRadius: '8px', border: '1px solid #CBDCEB' }}>
                                    <div style={{ fontWeight: 800, color: 'var(--dark-blue)', fontSize: '0.84rem', marginBottom: '8px' }}>
                                        Movements on {selectedDate}:
                                    </div>
                                    {selectedDateMovements.length > 0 ? (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {selectedDateMovements.map((m, i) => (
                                                <div key={i} style={{ background: '#E6F1FA', border: '1px solid #BCD0E2', padding: '6px 10px', borderRadius: '6px', fontSize: '0.74rem' }}>
                                                    <b style={{ color: 'var(--blue)' }}>Room {m.room_number}</b> ({m.building_name}) • {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                                            No movement records on this date.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Contact & Profile Footnote */}
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--text-sub)', padding: '10px 14px', background: '#E6F1FA', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Mail size={13} color="var(--blue)" />
                                <span>{staff?.email}</span>
                            </div>
                            {staff?.phone && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Phone size={13} color="var(--blue)" />
                                    <span>{staff.phone}</span>
                                </div>
                            )}
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
};
