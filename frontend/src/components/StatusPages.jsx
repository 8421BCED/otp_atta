import React from 'react';
import { WifiOff, ShieldAlert, FileQuestion, ServerCrash, RefreshCw, Home } from 'lucide-react';

const StatusScreen = ({ icon: Icon, title, body, actionLabel, actionIcon: ActionIcon, onAction, tone }) => (
    <div className="status-page">
        <div className="status-card ui-card">
            <div className="status-icon" style={tone ? { color: tone } : undefined}>
                <Icon size={32} strokeWidth={1.8} />
            </div>
            <h1>{title}</h1>
            <p>{body}</p>
            <button type="button" className="ui-btn ui-btn--primary" onClick={onAction}>
                {ActionIcon && <ActionIcon size={17} />}
                {actionLabel}
            </button>
        </div>
    </div>
);

export const OfflineStatusPage = ({ onRetry }) => (
    <StatusScreen
        icon={WifiOff}
        title="You are offline"
        body="Connect to mobile data or the college Wi-Fi to sync attendance and submit codes. This page reconnects on its own."
        actionLabel="Try again"
        actionIcon={RefreshCw}
        onAction={() => (onRetry ? onRetry() : window.location.reload())}
    />
);

export const NotFoundPage = ({ onGoHome }) => (
    <StatusScreen
        icon={FileQuestion}
        title="Page not found"
        body="That address does not exist or has moved. Head back to your portal."
        actionLabel="Back to home"
        actionIcon={Home}
        onAction={() => (onGoHome ? onGoHome() : (window.location.href = '/'))}
    />
);

export const ForbiddenPage = ({ reason, onAction, actionText = 'Back to sign in' }) => (
    <StatusScreen
        icon={ShieldAlert}
        tone="var(--danger)"
        title="Access blocked"
        body={reason || 'This device or role is not allowed to open this page.'}
        actionLabel={actionText}
        onAction={() => {
            if (onAction) onAction();
            else {
                localStorage.removeItem('fxec_token');
                localStorage.removeItem('fxec_user');
                window.location.href = '/';
            }
        }}
    />
);

export const ServerErrorPage = ({ errorCode = '502', onRetry }) => (
    <StatusScreen
        icon={ServerCrash}
        tone="var(--warn)"
        title={`Server unreachable (${errorCode})`}
        body="The attendance server is restarting or busy. Give it a few seconds and try again."
        actionLabel="Reconnect"
        actionIcon={RefreshCw}
        onAction={() => (onRetry ? onRetry() : window.location.reload())}
    />
);
