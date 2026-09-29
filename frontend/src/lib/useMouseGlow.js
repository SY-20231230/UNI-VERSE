import { useEffect, useRef } from 'react';

export function useMouseGlow() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const target = { x: 50, y: 50 };
    const current = { x: 50, y: 50 };
    let raf = null;

    function tick() {
      current.x += (target.x - current.x) * 0.12;
      current.y += (target.y - current.y) * 0.12;
      el.style.setProperty('--mx', current.x.toFixed(2) + '%');
      el.style.setProperty('--my', current.y.toFixed(2) + '%');
      raf = requestAnimationFrame(tick);
    }

    function start() {
      if (!raf) raf = requestAnimationFrame(tick);
    }
    function onMove(e) {
      const rect = el.getBoundingClientRect();
      target.x = ((e.clientX - rect.left) / rect.width) * 100;
      target.y = ((e.clientY - rect.top) / rect.height) * 100;
      start();
    }
    function onLeave() {
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    }

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return ref;
}
