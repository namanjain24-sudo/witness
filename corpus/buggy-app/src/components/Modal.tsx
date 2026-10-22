import { useEffect, useRef, type ReactNode } from 'react';

/**
 * B21 — the dialog traps focus on the way in but never wires up Escape and never
 * restores focus to the trigger, so keyboard users get stuck inside it.
 */
export default function Modal({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusables = ref.current?.querySelectorAll<HTMLElement>('button, a, input');
      if (!focusables?.length) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="modal-backdrop">
      <div className="modal" role="dialog" aria-modal="true" tabIndex={-1} ref={ref}>
        {children}
        <button className="btn" data-testid="modal-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
