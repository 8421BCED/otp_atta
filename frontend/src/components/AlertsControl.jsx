import React, { useEffect, useState, useCallback } from 'react';
import { BellRing, BellOff, X } from 'lucide-react';
import { getPushState, enablePush, disablePush, sendTestPush } from '../push';
import { AlertsCheck } from './AlertsCheck';

// variant "card": a prompt on the student home until alerts are on.
// variant "menu": on, off and test controls inside the account menu.
export const AlertsControl = ({ variant = 'card' }) => {
    const [state, setState] = useState('checking'); // checking | unsupported | blocked | off | on
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(null);
    const [checkOpen, setCheckOpen] = useState(false);
    const [dismissed, setDismissed] = useState(() => {
        try { return sessionStorage.getItem('fxec_alerts_prompt_dismissed') === '1'; } catch (e) { return false; }
    });

    const refresh = useCallback(() => getPushState().then(setState), []);
    useEffect(() => { refresh(); }, [refresh]);

    const turnOn = async () => {
        setBusy(true);
        setMessage(null);
        try {
            await enablePush();
            setState('on');
        } catch (e) {
            setMessage(e.message || 'Could not turn on alerts.');
            refresh();
        } finally {
            setBusy(false);
        }
    };

    const turnOff = async () => { setBusy(true); await disablePush(); setState('off'); setBusy(false); };

    const test = async () => {
        setBusy(true);
        try {
            const r = await sendTestPush();
            setMessage(r.message || (r.success ? 'Test sent' : 'Could not send a test'));
        } catch (e) {
            setMessage('Could not send a test');
        } finally {
            setBusy(false);
        }
    };

    if (state === 'checking') return null;

    if (variant === 'card') {
        if (state === 'on' || dismissed) return null;
        if (state === 'unsupported') return null;
        return (
            <section className="ui-card ui-card--sm alerts-card" role="region" aria-label="Attendance alerts">
                <span className="icon-tile icon-tile--denim" style={{ width: 46, height: 46, borderRadius: 15 }}><BellRing size={21} /></span>
                <div className="u-grow">
                    <div className="pick-name">Get a doorbell when attendance opens</div>
                    <div className="pick-sub">
                        {state === 'blocked'
                            ? 'Alerts are blocked. Allow notifications for this site in your browser settings, then try again.'
                            : 'A notification reaches you even when the app is closed, so you never miss the 9:05 and 1:35 windows.'}
                    </div>
                    {message && <div className="pick-sub" style={{ color: 'var(--danger-ink)', marginTop: 6 }}>{message}</div>}
                </div>
                <button type="button" className="ui-btn ui-btn--primary ui-btn--sm" onClick={turnOn} disabled={busy}>{busy ? 'Turning on' : 'Turn on'}</button>
                <button
                    type="button"
                    className="ui-icon-btn"
                    style={{ width: 34, height: 34, borderRadius: 11 }}
                    aria-label="Not now"
                    onClick={() => { setDismissed(true); try { sessionStorage.setItem('fxec_alerts_prompt_dismissed', '1'); } catch (e) { /* ignore */ } }}
                >
                    <X size={16} />
                </button>
            </section>
        );
    }

    // menu
    return (
        <div className="alerts-menu">
            {state === 'unsupported' && <div className="u-small u-muted" style={{ padding: '4px 4px 10px' }}>Alerts are not available in this browser. On an iPhone, add the app to the home screen first.</div>}
            {state === 'on' && (
                <>
                    <div className="u-row u-small" style={{ padding: '2px 4px 8px', color: 'var(--pistachio-700)', fontWeight: 700 }}><BellRing size={16} />Doorbell alerts are on</div>
                    <div className="u-row" style={{ gap: 8 }}>
                        <button type="button" className="ui-btn ui-btn--sm" onClick={test} disabled={busy}>Send a test</button>
                        <button type="button" className="ui-btn ui-btn--sm ui-btn--ghost" onClick={turnOff} disabled={busy}><BellOff size={15} />Turn off</button>
                    </div>
                </>
            )}
            {(state === 'off' || state === 'blocked') && (
                <button type="button" className="menu-item" onClick={turnOn} disabled={busy}><BellRing size={17} />{busy ? 'Turning on' : 'Turn on doorbell alerts'}</button>
            )}
            {message && <div className="u-small u-muted" style={{ padding: '6px 4px 0' }}>{message}</div>}
            {state !== 'unsupported' && <button type="button" className="menu-item" onClick={() => setCheckOpen(true)}><BellRing size={17} />Check my alerts</button>}
            <AlertsCheck open={checkOpen} onClose={() => setCheckOpen(false)} />
        </div>
    );
};

