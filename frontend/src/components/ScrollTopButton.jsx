import { useEffect, useState } from 'react';
import Icon from '../lib/icons';

export default function ScrollTopButton() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    function onScroll() {
      setShow(window.scrollY > 400);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!show) return null;

  return (
    <button className="scroll-top-btn" title="맨 위로" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
      <Icon name="chev" size={18} style={{ transform: 'rotate(-90deg)' }} />
    </button>
  );
}
