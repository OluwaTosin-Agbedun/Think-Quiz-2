import { useEffect, useState, useCallback } from 'react';
import { Violation } from '../types';

interface CheatingMonitorProps {
  active: boolean;
  onViolation: (violation: Violation) => void;
}

export function useCheatingMonitor({ active, onViolation }: CheatingMonitorProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Handle Visibility Change (Tab Switching)
  useEffect(() => {
    if (!active) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        onViolation({
          type: 'tab-switch',
          timestamp: Date.now(),
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [active, onViolation]);

  // Handle Window Blur (Focus Loss)
  useEffect(() => {
    if (!active) return;

    const handleBlur = () => {
      onViolation({
        type: 'focus-loss',
        timestamp: Date.now(),
      });
    };

    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [active, onViolation]);

  // Handle Fullscreen Exit
  useEffect(() => {
    if (!active) return;

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      
      if (!isCurrentlyFullscreen) {
        onViolation({
          type: 'fullscreen-exit',
          timestamp: Date.now(),
        });
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [active, onViolation]);

  // Disable Interactivity (Right-click, Copy, Paste)
  useEffect(() => {
    if (!active) return;

    const preventDefault = (e: Event) => e.preventDefault();
    
    document.addEventListener('contextmenu', preventDefault);
    document.addEventListener('copy', preventDefault);
    document.addEventListener('paste', preventDefault);

    return () => {
      document.removeEventListener('contextmenu', preventDefault);
      document.removeEventListener('copy', preventDefault);
      document.removeEventListener('paste', preventDefault);
    };
  }, [active]);

  const enterFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {
      console.error('Error attempting to enable full-screen mode:', err);
    }
  }, []);

  return { isFullscreen, enterFullscreen };
}
