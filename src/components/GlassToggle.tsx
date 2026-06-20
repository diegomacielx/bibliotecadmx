interface GlassToggleProps {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** `instant` remove animações — ideal para toggles que disparam reordenação imediata */
  transitionSpeed?: 'default' | 'instant';
}

export function GlassToggle({
  label,
  hint,
  checked,
  onChange,
  disabled = false,
  transitionSpeed = 'default',
}: GlassToggleProps) {
  const speedClass = transitionSpeed === 'instant' ? 'glass-toggle-row--instant' : '';

  return (
    <div className={`glass-toggle-row ${checked ? 'glass-toggle-row--on' : ''} ${speedClass}`.trim()}>
      <div className="glass-toggle-copy">
        <span className="glass-toggle-label">{label}</span>
        {hint ? <span className="glass-toggle-hint">{hint}</span> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        className={`glass-toggle ${checked ? 'glass-toggle--on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="glass-toggle__thumb" aria-hidden="true" />
      </button>
    </div>
  );
}
