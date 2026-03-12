import { useState, useEffect, useRef } from 'react';

/**
 * 偵測容器大小變更與瀏覽器縮放，強制圖表重新渲染
 * Nivo 的 ResponsiveWrapper 在瀏覽器縮放後可能無法正確恢復尺寸，
 * 此 hook 透過 ResizeObserver 偵測容器尺寸變化並用 key 強制重新掛載圖表
 *
 * @param {React.RefObject} containerRef - 圖表容器元素的 ref
 * @returns {number} - 當尺寸改變時遞增的 key，用於強制重新渲染
 */
export function useChartResize(containerRef) {
  const [key, setKey] = useState(0);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const debouncedUpdate = () => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setKey(prev => prev + 1);
      }, 150);
    };

    const observer = new ResizeObserver(debouncedUpdate);
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      clearTimeout(debounceRef.current);
    };
  }, [containerRef]);

  return key;
}
