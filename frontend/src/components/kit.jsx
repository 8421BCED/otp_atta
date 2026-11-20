import React, { useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';

// Icons share one stroke weight everywhere so the set reads as a single family.
export const ICON_STROKE = 1.85;

// A raised square that holds an icon. tone: denim | pistachio | warn | danger | neutral
export const IconTile = ({ icon: Icon, tone = 'denim', size = 44 }) => (
    <span className={`icon-tile icon-tile--${tone}`} style={{ width: size, height: size, borderRadius: Math.round(size * 0.32) }}>
        <Icon size={Math.round(size * 0.46)} strokeWidth={ICON_STROKE} />
    </span>
);

export const Modal = ({ open, onClose, title, subtitle, icon, tone = 'denim', size = 'md', footer, children }) => {
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => e.key === 'Escape' && onClose && onClose();
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="ui-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose && onClose()}>
            <div className={`ui-modal ui-modal--${size}`} role="dialog" aria-modal="true" aria-label={title}>
                <div className="modal-head">
                    {icon && <IconTile icon={icon} tone={tone} size={44} />}
                    <div className="u-grow">
                        <div className="modal-title">{title}</div>
                        {subtitle && <div className="modal-sub">{subtitle}</div>}
                    </div>
                    <button type="button" className="ui-icon-btn" onClick={onClose} aria-label="Close">
                        <X size={18} strokeWidth={ICON_STROKE} />
                    </button>
                </div>
                <div className="modal-body">{children}</div>
                {footer && <div className="modal-foot">{footer}</div>}
            </div>
        </div>
    );
};

export const Empty = ({ icon: Icon, title, children, action }) => (
    <div className="empty">
        {Icon && <span className="empty-icon"><Icon size={26} strokeWidth={ICON_STROKE} /></span>}
        <div className="empty-title">{title}</div>
        {children && <p className="empty-text">{children}</p>}
        {action}
    </div>
);

export const Stat = ({ icon, tone = 'denim', label, value, hint }) => (
    <div className="ui-card ui-card--sm stat-card">
        {icon && <IconTile icon={icon} tone={tone} size={42} />}
        <div className="u-grow">
            <div className="ui-stat-label">{label}</div>
            <div className="ui-stat-value">{value}</div>
            {hint && <div className="u-small u-faint" style={{ marginTop: 4 }}>{hint}</div>}
        </div>
    </div>
);

export const SectionHead = ({ icon, tone, title, sub, right }) => (
    <div className="ui-card-head">
        <div className="u-row" style={{ gap: 12 }}>
            {icon && <IconTile icon={icon} tone={tone} size={40} />}
            <div>
                <div className="ui-card-title">{title}</div>
                {sub && <div className="ui-card-sub">{sub}</div>}
            </div>
        </div>
        {right}
    </div>
);

export const Segmented = ({ options, value, onChange, label }) => (
    <div className="ui-segmented" role="tablist" aria-label={label}>
        {options.map((o) => (
            <button
                key={o.value}
                type="button"
                role="tab"
                aria-selected={value === o.value}
                className={value === o.value ? 'is-active' : ''}
                onClick={() => onChange(o.value)}
            >
                {o.label}
                {typeof o.count === 'number' && <span className="seg-count">{o.count}</span>}
            </button>
        ))}
    </div>
);

export const Spinner = ({ label = 'Loading' }) => (
    <div className="spinner-row" role="status"><span className="spinner" /><span>{label}</span></div>
);

export const Confirm = ({ open, title, children, confirmLabel = 'Confirm', tone = 'primary', busy = false, onConfirm, onCancel }) => (
    <Modal
        open={open}
        onClose={onCancel}
        size="sm"
        title={title}
        icon={AlertTriangle}
        tone={tone === 'danger' ? 'danger' : 'denim'}
        footer={(
            <>
                <button type="button" className="ui-btn" onClick={onCancel}>Cancel</button>
                <button type="button" className={`ui-btn ${tone === 'danger' ? 'ui-btn--danger' : 'ui-btn--primary'}`} onClick={onConfirm} disabled={busy}>
                    {busy ? 'Working' : confirmLabel}
                </button>
            </>
        )}
    >
        <p className="u-muted" style={{ lineHeight: 1.55 }}>{children}</p>
    </Modal>
);

export const Notice = ({ notice }) => (notice ? (
    <div className={`ui-alert ui-alert--${notice.type === 'error' ? 'danger' : notice.type === 'warn' ? 'warn' : 'success'}`} role="status">
        <span>{notice.text}</span>
    </div>
) : null);

export const timeOf = (value, fallback = 'Now') => {
    if (!value) return fallback;
    return new Date(value).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' });
};
