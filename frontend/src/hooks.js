import { useCallback, useEffect, useRef, useState } from 'react';
import { isBackingOff } from './api';

// A message that clears itself. show({ type: 'success' | 'error' | 'warn', text }, ms?)
export const useNotice = () => {
    const [notice, setNotice] = useState(null);
    const timer = useRef(null);
    const show = useCallback((n, ms = 5000) => {
        setNotice(n);
        clearTimeout(timer.current);
        if (n && ms) timer.current = setTimeout(() => setNotice(null), ms);
    }, []);
    useEffect(() => () => clearTimeout(timer.current), []);
    return [notice, show];
};

// Runs `fn` now and then every `ms` while the page is visible. Hidden tabs do not
// poll, which keeps server load down when many users leave the app open.
export const usePolling = (fn, ms, enabled = true) => {
    const saved = useRef(fn);
    useEffect(() => { saved.current = fn; }, [fn]);

    useEffect(() => {
        if (!enabled) return undefined;
        let timer = null;

        const tick = () => { if (!document.hidden && !isBackingOff()) saved.current(); };
        const onVisible = () => { if (!document.hidden) saved.current(); };

        saved.current();
        timer = setInterval(tick, ms);
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [ms, enabled]);
};
