interface BlockedAccessScreenProps {
  onLogout: () => void;
}

export function BlockedAccessScreen({ onLogout }: BlockedAccessScreenProps) {
  return (
    <div className="page-canvas min-h-screen flex items-center justify-center p-6 relative font-sans">
      <div className="auth-card p-8 sm:p-12 w-full max-w-md text-center animate-fade-in relative overflow-hidden z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-red-600/10 to-transparent pointer-events-none" />
        <div
          className="w-16 h-16 rounded-full border-2 border-red-600/40 flex items-center justify-center mb-6 mx-auto relative z-10"
          aria-hidden="true"
        >
          <span className="text-red-500 text-2xl font-black">✕</span>
        </div>
        <h2 className="font-display text-lg font-black uppercase italic mb-4 tracking-cinematic text-white relative z-10">
          ACESSO <span className="text-red-600">BLOQUEADO</span>
        </h2>
        <p className="text-body text-xs text-zinc-400 leading-relaxed mb-8 relative z-10">
          Seu acesso à biblioteca foi suspenso pelo administrador. Se acredita que isso é um erro,
          entre em contato com o suporte.
        </p>
        <button
          type="button"
          onClick={() => void onLogout()}
          className="relative z-10 w-full glass-panel py-4 rounded-2xl font-black uppercase tracking-widest text-2xs text-white hover:border-white/15 ease-cinematic duration-cinematic"
        >
          Sair
        </button>
      </div>
    </div>
  );
}
