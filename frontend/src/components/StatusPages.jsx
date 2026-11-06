import React from 'react';
import { WifiOff, ShieldAlert, FileQuestion, ServerCrash, RefreshCw, Home, ShieldCheck } from 'lucide-react';

// ==========================================
// 1. NETWORK OFFLINE SCREEN
// ==========================================
export const OfflineStatusPage = ({ onRetry }) => {
    return (
        <div className="status-page-wrapper">
            <div className="status-card-box">
                <div className="status-icon-circle offline">
                    <WifiOff size={42} strokeWidth={2.2} />
                </div>
                <div className="status-badge offline-badge">No Internet Connection</div>
                <h2 className="status-heading">Check Your Network</h2>
                <p className="status-desc">
                    You appear to be offline or mobile data / Wi-Fi is disabled. 
                    Please enable mobile data or connect to college Wi-Fi to sync live attendance records and submit OTPs.
                </p>
                <div className="status-action-group">
                    <button 
                        type="button" 
                        className="status-btn primary"
                        onClick={() => {
                            if (onRetry) onRetry();
                            else window.location.reload();
                        }}
                    >
                        <RefreshCw size={16} />
                        <span>Try Again</span>
                    </button>
                </div>
                <div className="status-footer-note">
                    Auto-reconnects as soon as connection is restored.
                </div>
            </div>
        </div>
    );
};

// ==========================================
// 2. 404 NOT FOUND SCREEN
// ==========================================
export const NotFoundPage = ({ onGoHome }) => {
    return (
        <div className="status-page-wrapper">
            <div className="status-card-box">
                <div className="status-icon-circle not-found">
                    <FileQuestion size={42} strokeWidth={2.2} />
                </div>
                <div className="status-code-tag">ERROR 404</div>
                <h2 className="status-heading">Page Not Found</h2>
                <p className="status-desc">
                    The requested portal route or page does not exist or has been moved. 
                    Please return to your designated dashboard portal.
                </p>
                <div className="status-action-group">
                    <button 
                        type="button" 
                        className="status-btn primary"
                        onClick={() => {
                            if (onGoHome) onGoHome();
                            else {
                                window.history.pushState(null, '', '/');
                                window.location.href = '/';
                            }
                        }}
                    >
                        <Home size={16} />
                        <span>Return to Home</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// 3. 403 ACCESS FORBIDDEN / DEVICE MISMATCH
// ==========================================
export const ForbiddenPage = ({ reason, onAction, actionText = "Back to Login" }) => {
    return (
        <div className="status-page-wrapper">
            <div className="status-card-box">
                <div className="status-icon-circle forbidden">
                    <ShieldAlert size={42} strokeWidth={2.2} />
                </div>
                <div className="status-code-tag forbidden-tag">ACCESS 403 • RESTRICTED</div>
                <h2 className="status-heading">Access Blocked</h2>
                <p className="status-desc">
                    {reason || "Your current device, proxy or role permissions do not authorize access to this resource. Anti-Proxy device binding is actively enforced."}
                </p>
                <div className="status-security-pill">
                    <ShieldCheck size={14} color="#10B981" />
                    <span>Hardware Anti-Proxy Guard Active</span>
                </div>
                <div className="status-action-group">
                    <button 
                        type="button" 
                        className="status-btn primary"
                        onClick={() => {
                            if (onAction) onAction();
                            else {
                                localStorage.removeItem('fxec_token');
                                localStorage.removeItem('fxec_user');
                                window.location.href = '/';
                            }
                        }}
                    >
                        <span>{actionText}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// 4. 502 / 500 SERVER / GATEWAY DOWN SCREEN
// ==========================================
export const ServerErrorPage = ({ errorCode = "502", onRetry }) => {
    return (
        <div className="status-page-wrapper">
            <div className="status-card-box">
                <div className="status-icon-circle server-down">
                    <ServerCrash size={42} strokeWidth={2.2} />
                </div>
                <div className="status-code-tag server-tag">GATEWAY {errorCode}</div>
                <h2 className="status-heading">College Server Unreachable</h2>
                <p className="status-desc">
                    The backend attendance cluster or database gateway is temporarily restarting or experiencing heavy traffic load. 
                    Please wait a few seconds and try refreshing.
                </p>
                <div className="status-action-group">
                    <button 
                        type="button" 
                        className="status-btn primary"
                        onClick={() => {
                            if (onRetry) onRetry();
                            else window.location.reload();
                        }}
                    >
                        <RefreshCw size={16} />
                        <span>Refresh Server Connection</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

