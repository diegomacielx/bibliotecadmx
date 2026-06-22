import { useEffect, useState } from 'react';
import {
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { clearAuthActionParams, type AuthActionParams } from '../lib/authActionParams';
import { BrandLogo } from './BrandLogo';
import { Icon } from './Icon';

interface AuthActionScreenProps {
  params: AuthActionParams;
  onDone: () => void;
}

export function AuthActionScreen({ params, onDone }: AuthActionScreenProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (params.mode === 'resetPassword') {
          const info = await verifyPasswordResetCode(auth, params.oobCode);
          if (active) setEmail(info);
        } else if (params.mode === 'verifyEmail') {
          await checkActionCode(auth, params.oobCode);
          await applyActionCode(auth, params.oobCode);
          if (active) {
            setSuccess('E-mail verificado com sucesso! Você já pode acessar a biblioteca.');
            clearAuthActionParams();
          }
        } else {
          if (active) setError('Tipo de ação não suportado.');
        }
      } catch {
        if (active) {
          setError(
            params.mode === 'resetPassword'
              ? 'Este link expirou ou já foi usado. Solicite um novo link de recuperação.'
              : 'Este link de verificação expirou ou já foi usado.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [params]);

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await confirmPasswordReset(auth, params.oobCode, newPassword);
      setSuccess('Senha redefinida com sucesso! Faça login com sua nova senha.');
      clearAuthActionParams();
    } catch {
      setError('Não foi possível redefinir a senha. Solicite um novo link.');
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    params.mode === 'resetPassword'
      ? 'NOVA SENHA'
      : params.mode === 'verifyEmail'
        ? 'VERIFICAR E-MAIL'
        : 'AÇÃO DE CONTA';

  return (
    <div className="page-canvas min-h-screen flex items-center justify-center p-4 sm:p-6 relative font-sans">
      <div className="auth-card p-6 sm:p-8 w-full max-w-md text-center animate-fade-in relative overflow-hidden z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-red-600/8 to-transparent pointer-events-none" />
        <BrandLogo variant="auth" className="mx-auto mb-4 relative z-10" />
        <h2 className="font-display text-base sm:text-lg font-black uppercase mb-1 tracking-wide relative z-10 leading-snug">
          BIBLIOTECA <span className="text-red-500">DMX</span>
        </h2>
        <p className="text-2xs font-semibold uppercase tracking-cinematic-wide text-zinc-500 mb-5 relative z-10">
          {title}
        </p>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-8 relative z-10">
            <Icon name="loader" className="w-8 h-8 animate-spin text-red-500" />
            <p className="auth-action__status">Validando link…</p>
          </div>
        ) : success ? (
          <div className="space-y-4 relative z-10">
            <p className="auth-action__status auth-action__status--success">{success}</p>
            <button
              type="button"
              onClick={onDone}
              className="w-full bg-red-600 py-3.5 rounded-2xl font-black uppercase tracking-cinematic-wide text-2xs hover:bg-red-700 shadow-cinematic"
            >
              Ir para o login
            </button>
          </div>
        ) : params.mode === 'resetPassword' && email ? (
          <form onSubmit={handleResetSubmit} className="space-y-3 relative z-10 text-left" noValidate>
            <p className="auth-action__hint">
              Crie uma nova senha para <strong>{email}</strong>
            </p>
            {error && (
              <p className="auth-action__status auth-action__status--error text-center" role="alert">
                {error}
              </p>
            )}
            <div className="space-y-1">
              <label htmlFor="new-password" className="text-2xs font-black uppercase text-zinc-500 ml-4 tracking-widest">
                Nova senha
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  required
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  disabled={submitting}
                  placeholder="••••••••"
                  className="w-full p-4 pr-12 rounded-2xl text-sm input-cinema disabled:opacity-60"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  <Icon name={showPassword ? 'eyeoff' : 'eye'} className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="confirm-new-password" className="text-2xs font-black uppercase text-zinc-500 ml-4 tracking-widest">
                Confirmar senha
              </label>
              <input
                id="confirm-new-password"
                required
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                disabled={submitting}
                placeholder="••••••••"
                className="w-full p-4 rounded-2xl text-sm input-cinema disabled:opacity-60"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-red-600 py-3.5 rounded-2xl font-black uppercase tracking-cinematic-wide text-2xs hover:bg-red-700 shadow-cinematic disabled:opacity-70 inline-flex items-center justify-center gap-2"
            >
              {submitting && <Icon name="loader" className="w-4 h-4 animate-spin" />}
              {submitting ? 'SALVANDO…' : 'SALVAR NOVA SENHA'}
            </button>
          </form>
        ) : (
          <div className="space-y-4 relative z-10">
            <p className="auth-action__status auth-action__status--error">{error || 'Link inválido ou expirado.'}</p>
            <button
              type="button"
              onClick={onDone}
              className="w-full bg-red-600 py-3.5 rounded-2xl font-black uppercase tracking-cinematic-wide text-2xs hover:bg-red-700 shadow-cinematic"
            >
              Voltar para o login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
