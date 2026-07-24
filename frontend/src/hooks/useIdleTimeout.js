import { useEffect, useRef, useCallback } from 'react';

const IDLE_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

/**
 * Calls `onIdle` after `timeoutMs` milliseconds of user inactivity.
 * Resets the timer on any user interaction.
 *
 * @param {Function} onIdle   — called when the idle threshold is reached
 * @param {number}   timeoutMs — idle timeout in ms (default 10 minutes)
 * @param {boolean}  enabled  — only runs when true (e.g. only when authenticated)
 */
const useIdleTimeout = (onIdle, timeoutMs = 10 * 60 * 1000, enabled = true) => {
  const timerRef = useRef(null);
  const onIdleRef = useRef(onIdle);

  // Keep the callback ref fresh without restarting the effect
  useEffect(() => { onIdleRef.current = onIdle; }, [onIdle]);

  const resetTimer = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onIdleRef.current?.();
    }, timeoutMs);
  }, [timeoutMs]);

  useEffect(() => {
    if (!enabled) return;

    // Start the initial timer
    resetTimer();

    // Reset on any user activity
    IDLE_EVENTS.forEach(event => window.addEventListener(event, resetTimer, { passive: true }));

    return () => {
      clearTimeout(timerRef.current);
      IDLE_EVENTS.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [enabled, resetTimer]);
};

export default useIdleTimeout;
