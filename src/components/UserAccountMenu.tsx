import { useEffect, useState } from 'react';
import type { User } from '../lib/firebase';
import type { UserProfile } from '../types';
import { Icon } from './Icon';
import { useTheme } from '../hooks/useTheme';
import { normalizeNickname, validateNickname, resolveDisplayNickname } from '../lib/nickname';

interface UserAccountMenuProps {
  user: User | null;
  userProfile: UserProfile | null;
  onUpdateNickname: (nickname: string) => Promise<void>;
  onSuggest: () => void;
  onLogout: () => void;
  onClose: () => void;
}

export function UserAccountMenu({
  user,
  userProfile,
  onUpdateNickname,
  onSuggest,
  onLogout,
  onClose,
}: UserAccountMenuProps) {
  const { theme, setTheme } = useTheme();
  const displayNickname = resolveDisplayNickname({
    nickname: userProfile?.nickname,
    name: userProfile?.name,
    email: user?.email,
  });

  const [nicknameDraft, setNicknameDraft] = useState(userProfile?.nickname || displayNickname);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
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
      setSaved(true);
    } catch {
      setError('Não foi possível salvar o apelido. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-64 dropdown-panel py-1.5">
      <div className="px-3 py-2.5 border-b border-white/[0.06]">
        <p className="text-sm font-semibold text-white truncate">{displayNickname}</p>
        <p className="text-[10px] text-zinc-500 truncate mt-0.5">{user?.email}</p>
      </div>

      <div className="account-menu-section">
        <p className="account-menu-label">Apelido</p>
        <div className="account-menu-row">
          <input
            type="text"
            className="account-menu-input"
            value={nicknameDraft}
            onChange={(e) => {
              setNicknameDraft(e.target.value);
              setError(null);
              setSaved(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleSaveNickname();
              }
            }}
            maxLength={24}
            autoComplete="nickname"
            aria-label="Apelido"
          />
          <button
            type="button"
            className="account-menu-save"
            onClick={() => void handleSaveNickname()}
            disabled={saving}
          >
            {saving ? '…' : 'Salvar'}
          </button>
        </div>
        {error && <p className="account-menu-error">{error}</p>}
        {saved && !error && <p className="account-menu-success">Apelido atualizado.</p>}
      </div>

      <div className="account-menu-divider" />

      <div className="account-menu-section">
        <p className="account-menu-label">Aparência</p>
        <div className="theme-toggle-group" role="group" aria-label="Tema da interface">
          <button
            type="button"
            className={`theme-toggle-btn ${theme === 'dark' ? 'theme-toggle-btn--active' : ''}`}
            onClick={() => setTheme('dark')}
            aria-pressed={theme === 'dark'}
          >
            <Icon name="moon" className="w-3.5 h-3.5" />
            Escuro
          </button>
          <button
            type="button"
            className={`theme-toggle-btn ${theme === 'light' ? 'theme-toggle-btn--active' : ''}`}
            onClick={() => setTheme('light')}
            aria-pressed={theme === 'light'}
          >
            <Icon name="sun" className="w-3.5 h-3.5" />
            Claro
          </button>
        </div>
      </div>

      <div className="account-menu-divider" />

      <button
        type="button"
        onClick={() => {
          onClose();
          onSuggest();
        }}
        className="menu-item w-full sm:hidden"
      >
        <Icon name="lightbulb" className="w-4 h-4" />
        Sugerir exercício
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onLogout();
        }}
        className="menu-item menu-item--danger w-full"
      >
        <Icon name="logout" className="w-4 h-4" />
        Encerrar sessão
      </button>
    </div>
  );
}
