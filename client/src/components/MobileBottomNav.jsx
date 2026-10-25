import React from 'react';
import { Home, Calendar, MapPin, Clock, LogOut } from 'lucide-react';

export const MobileBottomNav = ({ 
    activeTab = 'home', 
    onTabChange, 
    onOpenCalendar, 
    onOpenClassroom,
    onLogout,
    currentUser 
}) => {
    return (
        <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
            {/* 1. Home / Attendance Hub */}
            <button
                type="button"
                className={`mobile-nav-item ${activeTab === 'home' ? 'active' : ''}`}
                onClick={() => onTabChange && onTabChange('home')}
                aria-label="Home Dashboard"
            >
                {activeTab === 'home' && <span className="mobile-nav-indicator" />}
                <div className="mobile-nav-icon-wrap">
                    <Home size={20} />
                </div>
                <span className="mobile-nav-label">Home</span>
            </button>

            {/* 2. Select / Change Classroom */}
            {currentUser?.role === 'student' && (
                <button
                    type="button"
                    className={`mobile-nav-item ${activeTab === 'classroom' ? 'active' : ''}`}
                    onClick={() => {
                        onTabChange && onTabChange('classroom');
                        onOpenClassroom && onOpenClassroom();
                    }}
                    aria-label="Classroom Location"
                >
                    {activeTab === 'classroom' && <span className="mobile-nav-indicator" />}
                    <div className="mobile-nav-icon-wrap">
                        <MapPin size={20} />
                    </div>
                    <span className="mobile-nav-label">Classroom</span>
                </button>
            )}

            {/* 3. Calendar & History */}
            {onOpenCalendar && (
                <button
                    type="button"
                    className={`mobile-nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
                    onClick={() => {
                        onTabChange && onTabChange('calendar');
                        onOpenCalendar();
                    }}
                    aria-label="Attendance Calendar History"
                >
                    {activeTab === 'calendar' && <span className="mobile-nav-indicator" />}
                    <div className="mobile-nav-icon-wrap">
                        <Calendar size={20} />
                    </div>
                    <span className="mobile-nav-label">History</span>
                </button>
            )}

            {/* 4. Sign Out */}
            {onLogout && (
                <button
                    type="button"
                    className="mobile-nav-item"
                    onClick={onLogout}
                    aria-label="Sign Out"
                >
                    <div className="mobile-nav-icon-wrap">
                        <LogOut size={20} color="#EF4444" />
                    </div>
                    <span className="mobile-nav-label" style={{ color: '#EF4444' }}>Sign Out</span>
                </button>
            )}
        </nav>
    );
};
