import { Icon } from './Icon';

interface PendingAccessScreenProps {
  onLogout: () => void;
}

export function PendingAccessScreen({ onLogout }: PendingAccessScreenProps) {
  return (
    <div className="page-canvas min-h-screen flex items-center justify-center p-6 relative font-sans">
      <div className="auth-card p-8 sm:p-12 w-full max-w-md text-center animate-fade-in relative overflow-hidden z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none" />
        <Icon name="loader" className="w-12 h-12 animate-spin text-red-600 opacity-60 mb-6 mx-auto relative z-10" />
        <h2 className="font-display text-lg font-black uppercase italic mb-4 tracking-cinematic text-white relative z-10">
          ACESSO <span className="text-red-600">EM ANÁLISE</span>
        </h2>
        <p className="text-body text-xs text-zinc-400 leading-relaxed mb-8 relative z-10">
          Se você já comprou o acesso, cadastre-se com o <strong className="text-zinc-200">mesmo e-mail</strong>{' '}
          usado na Kiwify ou Stripe — a liberação é automática após a confirmação do pagamento.
          Caso contrário, aguarde a verificação manual do administrador.
        </p>
        <button
          type="button"
          onClick={() => void onLogout()}
          className="relative z-10 w-full glass-panel py-4 rounded-2xl font-black uppercase tracking-widest text-2xs text-white hover:border-white/15 ease-cinematic duration-cinematic"
        >
          Sair e Voltar mais tarde
        </button>
      </div>
    </div>
  );
}
