import type { AuthMode } from '../types';
import { BrandLogo } from './BrandLogo';
import { Icon } from './Icon';

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
}: LoginScreenProps) {
  const title =
    authMode === 'login'
      ? 'ACESSO RESTRITO'
      : authMode === 'register'
        ? 'CRIAR CONTA'
        : 'RECUPERAR SENHA';

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
      </div>
    </div>
  );
}
