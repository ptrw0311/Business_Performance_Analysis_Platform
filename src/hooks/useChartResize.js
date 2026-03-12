import { useState, useEffect, useRef } from 'react';

/**
 * Hook for handling chart resize and browser zoom
 * Monitors container size changes and browser zoom level
 * Forces chart re-render when changes are detected
 *
 * @param {React.RefObject} containerRef - Reference to the chart container element
 * @returns {number} - Unique key for forcing re-render
 */
export function useChartResize(containerRef) {
  const [, forceUpdate] = useState(0);
  const resizeObserverRef = useRef(null);
  const lastScaleRef = useRef(1);

  useEffect(() => {
    if (!containerRef.current) return;

    // Setup ResizeObserver
    const observer = new ResizeObserver(() => {
      forceUpdate(prev => prev + 1);
    });

    observer.observe(containerRef.current);
    resizeObserverRef.current = observer;

    // Setup visualViewport listener for zoom detection
    const handleViewportResize = () => {
      const currentScale = window.visualViewport?.scale || 1;
      if (currentScale !== lastScaleRef.current) {
        lastScaleRef.current = currentScale;
        forceUpdate(prev => prev + 1);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
    }

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportResize);
      }
    };
  }, [containerRef]);

  return Date.now(); // Return a unique key for forcing re-render
}
