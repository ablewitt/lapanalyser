import { useCallback, useRef, useState } from 'react';

export function useColumnResize(initialWidths: number[]) {
  const [widths, setWidths] = useState(initialWidths);
  const widthsRef = useRef(widths);
  widthsRef.current = widths;

  const onColMouseDown = useCallback((colIndex: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = widthsRef.current[colIndex];

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    function onMouseMove(ev: MouseEvent) {
      const newWidth = Math.max(50, startWidth + ev.clientX - startX);
      setWidths(prev => {
        const next = [...prev];
        next[colIndex] = newWidth;
        return next;
      });
    }

    function onMouseUp() {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, []);

  return { widths, onColMouseDown };
}
