import { useEffect } from 'react';
import { Icon } from './Icon';

interface RequestModalProps {
  requestForm: { name: string; details: string };
  setRequestForm: (form: { name: string; details: string }) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function RequestModal({ requestForm, setRequestForm, onSubmit, onClose }: RequestModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 modal-backdrop" onClick={onClose} />
      <div className="auth-card w-full max-w-lg p-8 relative z-10 animate-fade-in">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-zinc-500 hover:text-white ease-cinematic duration-cinematic"
        >
          <Icon name="x" className="w-6 h-6" />
        </button>
        <div className="mb-6 flex items-center gap-3">
          <div className="w-12 h-12 bg-accent-muted rounded-2xl flex items-center justify-center text-red-500 border border-red-500/20">
            <Icon name="lightbulb" className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display text-lg font-black uppercase text-white">Sugerir Exercício</h2>
            <p className="text-2xs text-zinc-400 font-bold uppercase tracking-widest mt-1">
              O que você quer ver na biblioteca?
            </p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-2xs font-black uppercase text-zinc-500 ml-2 tracking-widest">
              Nome do Exercício
            </label>
            <input
              required
              autoFocus
              placeholder="Ex: Agachamento Sumô"
              className="w-full p-4 mt-1 input-cinema text-sm"
              value={requestForm.name}
              onChange={(e) => setRequestForm({ ...requestForm, name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-2xs font-black uppercase text-zinc-500 ml-2 tracking-widest">
              Detalhes (Opcional)
            </label>
            <textarea
              placeholder="Em qual máquina? Qual a variação exata? Deixe um comentário para o nosso time de gravação..."
              className="w-full p-4 mt-1 input-cinema text-sm min-h-[100px]"
              value={requestForm.details}
              onChange={(e) => setRequestForm({ ...requestForm, details: e.target.value })}
            />
          </div>
          <button
            type="submit"
            className="w-full cta-pill justify-center font-black uppercase tracking-widest text-2xs hover:bg-red-600 hover:text-white mt-2"
          >
            Enviar Sugestão
          </button>
        </form>
      </div>
    </div>
  );
}
