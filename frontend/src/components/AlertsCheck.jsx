import React, { useCallback, useEffect, useState } from 'react';
import { BellRing, Check, X, RefreshCw } from 'lucide-react';
import { Modal } from './kit';
import { getDiagnostics, showLocalTest, sendTestPush } from '../push';

const Row = ({ ok, label, value }) => (
    <div className="u-row u-between" style={{ padding: '9px 0', borderTop: '1px solid var(--line)', gap: 12 }}>
        <span className="u-row" style={{ gap: 10 }}>
            {ok === true && <Check size={16} color="var(--pistachio-600)" />}
            {ok === false && <X size={16} color="var(--danger)" />}
            {ok === null && <span style={{ width: 16 }} />}
            <span style={{ fontWeight: 600 }}>{label}</span>
        </span>
        <span className="u-small u-muted" style={{ textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
    </div>
);

const ago = (iso) => {
    const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return `${s} seconds ago`;
    if (s < 3600) return `${Math.round(s / 60)} minutes ago`;
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

export const AlertsCheck = ({ open, onClose }) => {
    const [d, setD] = useState(null);
    const [msg, setMsg] = useState(null);
    const [busy, setBusy] = useState(false);

    const refresh = useCallback(async () => setD(await getDiagnostics()), []);
    useEffect(() => { if (open) { setMsg(null); refresh(); } }, [open, refresh]);

    const local = async () => {
        setBusy(true);
        try { await showLocalTest(); setMsg('Sent from this phone. Did a notification appear? If yes, the phone can show alerts.'); } catch (e) { setMsg(`This phone refused to show it: ${e.message}`); }
        setBusy(false);
    };

    const server = async () => {
        setBusy(true);
        setMsg('Asking the server to send an alert through Google...');
        const before = d && d.lastPush ? d.lastPush.at : null;
        try {
            const r = await sendTestPush();
            await new Promise((res) => setTimeout(res, 5000));
            const fresh = await getDiagnostics();
            setD(fresh);
            const arrived = fresh.lastPush && fresh.lastPush.at !== before;
            if (!r.success) setMsg(r.message || 'The server could not send it.');
            else if (arrived && fresh.lastPush.shown) setMsg('It arrived and was shown. Alerts work on this phone.');
            else if (arrived) setMsg(`It arrived but the phone would not show it: ${fresh.lastPush.error || 'unknown reason'}.`);
            else setMsg('Google accepted it, but it has not reached this phone yet. Check the battery setting below, then try again.');
        } catch (e) { setMsg('Could not run the test.'); }
        setBusy(false);
    };

    let verdict = null;
    if (d) {
        if (d.permission !== 'granted') verdict = 'Notifications are not allowed for this site. Allow them in the browser or phone settings.';
        else if (!d.pushHost) verdict = 'This phone is not subscribed. Close this and turn alerts on again.';
        else if (d.serverDevices === 0) verdict = 'The server does not know this phone. Turn alerts off and on again.';
        else if (!d.lastPush) verdict = 'Everything is set up. No alert has reached this phone yet. Run the server test.';
        else if (!d.lastPush.shown) verdict = 'An alert reached the phone but could not be shown. Run the local test.';
        else verdict = `Working. The last alert reached this phone ${ago(d.lastPush.at)}.`;
    }

    return (
        <Modal open={open} onClose={onClose} size="md" icon={BellRing} title="Check my alerts" subtitle="Finds out why an alert might not appear"
            footer={<button type="button" className="ui-btn" onClick={onClose}>Close</button>}>
            {!d ? <div className="u-muted">Checking</div> : (
                <>
                    <div className={`ui-alert ${verdict.startsWith('Working') ? 'ui-alert--success' : 'ui-alert--warn'}`} style={{ marginBottom: 14 }}><span>{verdict}</span></div>
                    <Row ok={d.secure} label="Secure connection (https)" value={d.secure ? 'Yes' : 'No: alerts cannot work'} />
                    <Row ok={d.permission === 'granted'} label="Notification permission" value={d.permission} />
                    <Row ok={!!d.swScript} label="Background service" value={d.swScript ? `${d.swScript} (${d.swState})` : 'Not running'} />
                    <Row ok={!!d.pushHost} label="This phone is subscribed" value={d.pushHost || 'No'} />
                    <Row ok={d.serverDevices > 0} label="Server knows this phone" value={d.serverDevices === null ? 'Unknown' : `${d.serverDevices} device${d.serverDevices === 1 ? '' : 's'}`} />
                    <Row ok={d.lastPush ? d.lastPush.shown : null} label="Last alert received" value={d.lastPush ? `${ago(d.lastPush.at)}${d.lastPush.shown ? '' : ' (not shown)'}` : 'None yet'} />
                    <Row ok={null} label="Installed as an app" value={d.installed ? 'Yes' : 'No, running in the browser'} />

                    <div className="u-row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
                        <button type="button" className="ui-btn ui-btn--sm" onClick={local} disabled={busy}>Show a test here</button>
                        <button type="button" className="ui-btn ui-btn--sm ui-btn--primary" onClick={server} disabled={busy}>Send a test from the server</button>
                        <button type="button" className="ui-btn ui-btn--sm ui-btn--ghost" onClick={refresh} disabled={busy}><RefreshCw size={15} />Refresh</button>
                    </div>
                    {msg && <div className="u-small" style={{ marginTop: 12, lineHeight: 1.5 }}>{msg}</div>}

                    <div className="u-small u-muted" style={{ marginTop: 16, lineHeight: 1.55 }}>
                        <strong>If an alert is accepted but never appears:</strong> on the phone open Settings, Apps, Chrome (or AttendOTP),
                        Battery, and choose <strong>Unrestricted</strong>. Also check that Do Not Disturb is off and that the site's
                        notifications are not set to silent. Some phone makers pause sleeping apps until you open them.
                    </div>
                </>
            )}
        </Modal>
    );
};
