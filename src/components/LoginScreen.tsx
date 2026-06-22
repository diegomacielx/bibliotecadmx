import { useEffect, useState } from 'react';
import type { AuthMode } from '../types';
import { maskEmail } from '../lib/authEmail';
import { BrandLogo } from './BrandLogo';
import { Icon } from './Icon';

const RESEND_COOLDOWN_SEC = 60;

interface LoginScreenProps {
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  loginEmail: string;
  setLoginEmail: (v: string) => void;
  loginPassword: string;
  setLoginPassword: (v: string) => void;
  registerPasswordConfirm: string;
  setRegisterPasswordConfirm: (v: string) => void;
  registerName: string;
  setRegisterName: (v: string) => void;
  registerNickname: string;
  setRegisterNickname: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  submitting?: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onGoogleSignIn?: () => void;
  googleSubmitting?: boolean;
  onResendPasswordReset?: () => void;
  passwordResetResending?: boolean;
}

export function LoginScreen({
  authMode,
  setAuthMode,
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  registerPasswordConfirm,
  setRegisterPasswordConfirm,
  registerName,
  setRegisterName,
  registerNickname,
  setRegisterNickname,
  showPassword,
  setShowPassword,
  submitting = false,
  onSubmit,
  onGoogleSignIn,
  googleSubmitting = false,
  onResendPasswordReset,
  passwordResetResending = false,
}: LoginScreenProps) {
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (authMode === 'forgot-sent') {
      setResendCooldown(RESEND_COOLDOWN_SEC);
    }
  }, [authMode]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const handleResend = () => {
    if (resendCooldown > 0 || passwordResetResending || !onResendPasswordReset) return;
    onResendPasswordReset();
    setResendCooldown(RESEND_COOLDOWN_SEC);
  };

  const title =
    authMode === 'login'
      ? 'ACESSO RESTRITO'
      : authMode === 'register'
        ? 'CRIAR CONTA'
        : authMode === 'forgot-sent'
          ? 'E-MAIL ENVIADO'
          : 'RECUPERAR SENHA';

  const maskedEmail = maskEmail(loginEmail);

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

        {authMode === 'forgot-sent' ? (
          <div className="auth-reset-sent relative z-10 text-left animate-fade-in">
            <div className="auth-reset-sent__icon-wrap mx-auto mb-5">
              <Icon name="mail" className="w-8 h-8 text-red-500" />
            </div>
            <p className="auth-reset-sent__lead mb-4">
              Enviamos um link de recuperação para
            </p>
            <p className="auth-reset-sent__email text-center font-bold mb-5">{maskedEmail}</p>
            <ul className="auth-reset-sent__tips space-y-2.5 mb-6">
              <li className="auth-reset-sent__tip">
                <Icon name="inbox" className="auth-reset-sent__tip-icon" />
                <span>Confira a caixa de entrada e a pasta de spam ou promoções.</span>
              </li>
              <li className="auth-reset-sent__tip">
                <Icon name="clock" className="auth-reset-sent__tip-icon" />
                <span>O link expira em cerca de 1 hora por segurança.</span>
              </li>
              <li className="auth-reset-sent__tip">
                <Icon name="shield" className="auth-reset-sent__tip-icon" />
                <span>Se o e-mail não estiver cadastrado, nenhuma mensagem será enviada.</span>
              </li>
            </ul>
            <button
              type="button"
              disabled={resendCooldown > 0 || passwordResetResending || !onResendPasswordReset}
              onClick={handleResend}
              className="w-full bg-red-600 py-3.5 rounded-2xl font-black uppercase tracking-cinematic-wide text-2xs hover:bg-red-700 shadow-cinematic hover:shadow-glow-red active:scale-[0.98] ease-cinematic duration-cinematic disabled:opacity-60 disabled:pointer-events-none inline-flex items-center justify-center gap-2"
            >
              {passwordResetResending && <Icon name="loader" className="w-4 h-4 animate-spin" />}
              {passwordResetResending
                ? 'REENVIANDO…'
                : resendCooldown > 0
                  ? `REENVIAR EM ${resendCooldown}s`
                  : 'REENVIAR E-MAIL'}
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className="auth-reset-sent__back"
            >
              Voltar ao login
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={onSubmit} className="space-y-3 relative z-10" noValidate>
              {authMode === 'register' && (
                <>
                  <div className="text-left space-y-1 relative animate-fade-in mb-4">
                    <label htmlFor="register-name" className="text-2xs font-black uppercase text-zinc-500 ml-4 tracking-widest">
                      Nome Completo
                    </label>
                    <input
                      id="register-name"
                      required
                      type="text"
                      autoComplete="name"
                      disabled={submitting}
                      placeholder="Seu nome e sobrenome"
                      className="w-full p-4 rounded-2xl text-sm input-cinema disabled:opacity-60"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                    />
                  </div>
                  <div className="text-left space-y-1 relative animate-fade-in mb-4">
                    <label htmlFor="register-nickname" className="text-2xs font-black uppercase text-zinc-500 ml-4 tracking-widest">
                      Apelido
                    </label>
                    <input
                      id="register-nickname"
                      required
                      type="text"
                      autoComplete="nickname"
                      disabled={submitting}
                      placeholder="Como quer ser chamado na biblioteca"
                      maxLength={24}
                      className="w-full p-4 rounded-2xl text-sm input-cinema disabled:opacity-60"
                      value={registerNickname}
                      onChange={(e) => setRegisterNickname(e.target.value)}
                    />
                  </div>
                </>
              )}
              <div className="text-left space-y-1">
                <label htmlFor="login-email" className="text-2xs font-black uppercase text-zinc-500 ml-4 tracking-widest">
                  E-mail
                </label>
                <input
                  id="login-email"
                  required
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  disabled={submitting}
                  placeholder="Seu e-mail de acesso"
                  className="w-full p-4 rounded-2xl text-sm input-cinema disabled:opacity-60"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
              </div>
              {authMode !== 'forgot' && (
                <div className="text-left space-y-1 relative">
                  <label htmlFor="login-password" className="text-2xs font-black uppercase text-zinc-500 ml-4 tracking-widest">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      required
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                      disabled={submitting}
                      placeholder="••••••••"
                      className="w-full p-4 pr-12 rounded-2xl text-sm input-cinema disabled:opacity-60"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white ease-cinematic duration-cinematic disabled:opacity-50"
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      <Icon name={showPassword ? 'eyeoff' : 'eye'} className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
              {authMode === 'register' && (
                <div className="text-left space-y-1 relative animate-fade-in">
                  <label
                    htmlFor="register-password-confirm"
                    className="text-2xs font-black uppercase text-zinc-500 ml-4 tracking-widest"
                  >
                    Confirmar Senha
                  </label>
                  <input
                    id="register-password-confirm"
                    required
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    disabled={submitting}
                    placeholder="••••••••"
                    className="w-full p-4 rounded-2xl text-sm input-cinema disabled:opacity-60"
                    value={registerPasswordConfirm}
                    onChange={(e) => setRegisterPasswordConfirm(e.target.value)}
                  />
                </div>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-red-600 py-3.5 rounded-2xl font-black uppercase tracking-cinematic-wide text-2xs hover:bg-red-700 shadow-cinematic hover:shadow-glow-red active:scale-[0.98] mt-3 ease-cinematic duration-cinematic disabled:opacity-70 disabled:pointer-events-none inline-flex items-center justify-center gap-2"
              >
                {submitting && <Icon name="loader" className="w-4 h-4 animate-spin" />}
                {submitting
                  ? 'AGUARDE…'
                  : authMode === 'login'
                    ? 'ACESSAR A BIBLIOTECA'
                    : authMode === 'register'
                      ? 'CADASTRAR E ACESSAR'
                      : 'ENVIAR LINK DE RECUPERAÇÃO'}
              </button>
            </form>

            {authMode === 'login' && onGoogleSignIn && (
              <div className="mt-4 relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-2xs uppercase tracking-widest text-zinc-500 font-bold">ou</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>
                <button
                  type="button"
                  disabled={submitting || googleSubmitting}
                  onClick={onGoogleSignIn}
                  className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl font-bold uppercase tracking-cinematic-wide text-2xs glass-panel hover:bg-white/10 ease-cinematic duration-cinematic disabled:opacity-60"
                >
                  {googleSubmitting ? (
                    <Icon name="loader" className="w-4 h-4 animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  )}
                  Continuar com Google
                </button>
              </div>
            )}

            <div className="mt-4 flex flex-col gap-2 relative z-10">
              {authMode === 'login' ? (
                <>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      setAuthMode('register');
                      setLoginPassword('');
                      setRegisterName('');
                      setRegisterNickname('');
                    }}
                    className="text-2xs text-white hover:text-red-500 font-black uppercase tracking-widest glass-panel py-3 rounded-xl ease-cinematic duration-cinematic disabled:opacity-50"
                  >
                    Não tem conta? Cadastre-se
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setAuthMode('forgot')}
                    className="text-2xs text-zinc-500 hover:text-white font-bold uppercase tracking-widest mt-2 ease-cinematic duration-cinematic disabled:opacity-50"
                  >
                    Esqueceu sua senha?
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setAuthMode('login');
                    setLoginPassword('');
                    setRegisterPasswordConfirm('');
                    setRegisterName('');
                    setRegisterNickname('');
                  }}
                  className="text-2xs text-zinc-400 hover:text-white font-bold uppercase tracking-widest ease-cinematic duration-cinematic disabled:opacity-50"
                >
                  Voltar para o Login
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
