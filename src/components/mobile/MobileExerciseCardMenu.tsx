import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '../Icon';

interface MobileExerciseCardMenuProps {
  variant: 'grid' | 'list';
  onDownload: (e: React.MouseEvent) => void;
  onCopyLink: (e: React.MouseEvent) => void;
  copied?: boolean;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
}

export function MobileExerciseCardMenu({
  variant,
  onDownload,
  onCopyLink,
  copied = false,
  onEdit,
  onDelete,
}: MobileExerciseCardMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const close = () => setOpen(false);

  const runAction = (action: (e: React.MouseEvent) => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    action(e);
    close();
  };

  return (
    <div
      ref={rootRef}
      className={`mobile-exercise-card-menu mobile-exercise-card-menu--${variant}`}
      data-card-action="menu"
    >
      <button
        type="button"
        className="mobile-exercise-card-menu__trigger"
        aria-label="Mais opções"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((value) => !value);
        }}
      >
        <Icon name="morevertical" className="mobile-exercise-card-menu__icon" strokeWidth={2} />
      </button>

      {open && (
        <div
          id={menuId}
          className="mobile-exercise-card-menu__panel"
          role="menu"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            className="mobile-exercise-card-menu__item"
            onClick={runAction(onDownload)}
          >
            <Icon name="download" className="mobile-exercise-card-menu__item-icon" strokeWidth={1.75} />
            Baixar 4K
          </button>
          <button
            type="button"
            role="menuitem"
            className={`mobile-exercise-card-menu__item ${copied ? 'mobile-exercise-card-menu__item--success' : ''}`}
            onClick={runAction(onCopyLink)}
          >
            <Icon
              name={copied ? 'check' : 'copy'}
              className="mobile-exercise-card-menu__item-icon"
              strokeWidth={1.75}
            />
            {copied ? 'Link copiado' : 'Copiar link'}
          </button>
          {onEdit && (
            <button
              type="button"
              role="menuitem"
              className="mobile-exercise-card-menu__item"
              onClick={runAction(onEdit)}
            >
              <Icon name="pencil" className="mobile-exercise-card-menu__item-icon" strokeWidth={1.75} />
              Editar
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              role="menuitem"
              className="mobile-exercise-card-menu__item mobile-exercise-card-menu__item--danger"
              onClick={runAction(onDelete)}
            >
              <Icon name="trash" className="mobile-exercise-card-menu__item-icon" strokeWidth={1.75} />
              Excluir
            </button>
          )}
        </div>
      )}
    </div>
  );
}
