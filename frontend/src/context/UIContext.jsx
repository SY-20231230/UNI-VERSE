import { createContext, useCallback, useContext, useRef, useState } from 'react';

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [overlay, setOverlay] = useState(null); // { type: 'modal' | 'sheet', content }
  const toastId = useRef(0);

  const toast = useCallback((msg) => {
    const id = ++toastId.current;
    setToasts([{ id, msg }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 2200);
  }, []);

  const openModal = useCallback((content) => setOverlay({ type: 'modal', content }), []);
  const openSheet = useCallback((content) => setOverlay({ type: 'sheet', content }), []);
  const closeOverlay = useCallback(() => setOverlay(null), []);

  return (
    <UIContext.Provider value={{ toast, openModal, openSheet, closeOverlay }}>
      {children}
      {overlay && (
        <div
          className={overlay.type === 'modal' ? 'modal-backdrop' : 'sheet-backdrop'}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeOverlay();
          }}
        >
          <div className={overlay.type === 'modal' ? 'modal-card' : 'sheet'} onClick={(e) => e.stopPropagation()}>
            {overlay.type === 'sheet' && <div className="grabber"></div>}
            {overlay.content}
          </div>
        </div>
      )}
      <div className="toast-wrap" id="toast-root">
        {toasts.map((t) => (
          <div className="toast" key={t.id}>
            {t.msg}
          </div>
        ))}
      </div>
    </UIContext.Provider>
  );
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within UIProvider');
  return ctx;
}
