import { useEffect, useState, useRef } from 'react';
import type { User } from '../../lib/firebase';
import type { UserProfile } from '../../types';
import { Icon } from '../Icon';
import { useTheme } from '../../hooks/useTheme';
import { normalizeNickname, validateNickname, resolveDisplayNickname } from '../../lib/nickname';

interface MobileAccountScreenProps {
  user: User | null;
  userProfile: UserProfile | null;
  onUpdateNickname: (nickname: string) => Promise<void>;
  onResendVerification?: () => Promise<void>;
  onOpenSettings: () => void;
  onOpenUsageGuide?: () => void;
  onSuggest: () => void;
  onLogout: () => void;
}

export function MobileAccountScreen({
  user,
  userProfile,
  onUpdateNickname,
  onResendVerification,
  onOpenSettings,
  onOpenUsageGuide,
  onSuggest,
  onLogout,
}: MobileAccountScreenProps) {
  const { theme, setTheme } = useTheme();
  const displayNickname = resolveDisplayNickname({
    nickname: userProfile?.nickname,
    name: userProfile?.name,
    email: user?.email,
  });

  const [nicknameDraft, setNicknameDraft] = useState(userProfile?.nickname || displayNickname);
  const nicknameDirtyRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [resending, setResending] = useState(false);

  const emailUnverified = user && !user.emailVerified;
  const initial = (displayNickname.trim()[0] || 'D').toUpperCase();

  useEffect(() => {
    if (nicknameDirtyRef.current) return;
    setNicknameDraft(userProfile?.nickname || displayNickname);
  }, [userProfile?.nickname, displayNickname]);

  const handleSaveNickname = async () => {
    const validationError = validateNickname(nicknameDraft);
    if (validationError) {
      setError(validationError);
      setSaved(false);
      return;
    }

    const normalized = normalizeNickname(nicknameDraft);
    if (normalized === (userProfile?.nickname || '')) {
      setError(null);
      setSaved(true);
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await onUpdateNickname(normalized);
      nicknameDirtyRef.current = false;
      setSaved(true);
    } catch {
      setError('Não foi possível salvar o apelido. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mobile-account-screen">
      <header className="mobile-account-screen__hero">
        <span className="mobile-account-screen__avatar" aria-hidden="true">
          {initial}
        </span>
        <h2 className="mobile-account-screen__name">{displayNickname}</h2>
        <p className="mobile-account-screen__email">{user?.email}</p>
      </header>

      {emailUnverified && onResendVerification && (
        <div className="mobile-account-screen__banner">
          <p className="mobile-account-screen__banner-text">Confirme seu e-mail para acesso completo.</p>
          <button
            type="button"
            className="mobile-account-screen__banner-btn"
            disabled={resending}
            onClick={async () => {
              setResending(true);
              try {
                await onResendVerification();
              } finally {
                setResending(false);
              }
            }}
          >
            {resending ? 'Enviando…' : 'Reenviar confirmação'}
          </button>
        </div>
      )}

      <section className="mobile-account-screen__section">
        <h3 className="mobile-account-screen__section-title">Apelido</h3>
        <div className="mobile-account-screen__nickname-row">
          <input
            type="text"
            id="mobile-account-nickname"
            name="nickname"
            value={nicknameDraft}
            onChange={(e) => {
              nicknameDirtyRef.current = true;
              setNicknameDraft(e.target.value);
              setSaved(false);
              setError(null);
            }}
            className="mobile-account-screen__input"
            maxLength={24}
            aria-label="Apelido"
          />
          <button
            type="button"
            className="mobile-account-screen__save-btn"
            onClick={() => void handleSaveNickname()}
            disabled={saving}
          >
            {saving ? '…' : saved ? '✓' : 'Salvar'}
          </button>
        </div>
        {error && <p className="mobile-account-screen__error">{error}</p>}
      </section>

      <section className="mobile-account-screen__section">
        <h3 className="mobile-account-screen__section-title">Aparência</h3>
        <div className="mobile-account-screen__theme-row">
          <button
            type="button"
            className={`mobile-account-screen__theme-btn ${theme === 'light' ? 'mobile-account-screen__theme-btn--active' : ''}`}
            onClick={() => setTheme('light')}
          >
            <Icon name="lightbulb" className="w-4 h-4" />
            Claro
          </button>
          <button
            type="button"
            className={`mobile-account-screen__theme-btn ${theme === 'dark' ? 'mobile-account-screen__theme-btn--active' : ''}`}
            onClick={() => setTheme('dark')}
          >
            <Icon name="moon" className="w-4 h-4" />
            Escuro
          </button>
        </div>
      </section>

      <nav className="mobile-account-screen__links" aria-label="Conta e preferências">
        <button type="button" className="mobile-account-screen__link" onClick={onOpenSettings}>
          <Icon name="settings" className="w-4 h-4" />
          Configurações
        </button>
        {onOpenUsageGuide && (
          <button type="button" className="mobile-account-screen__link" onClick={onOpenUsageGuide}>
            <Icon name="help" className="w-4 h-4" />
            Guia de uso
          </button>
        )}
        <button type="button" className="mobile-account-screen__link" onClick={onSuggest}>
          <Icon name="lightbulb" className="w-4 h-4" />
          Sugerir exercício
        </button>
        <button
          type="button"
          className="mobile-account-screen__link mobile-account-screen__link--danger"
          onClick={() => void onLogout()}
        >
          <Icon name="logout" className="w-4 h-4" />
          Sair
        </button>
      </nav>
    </div>
  );
}
