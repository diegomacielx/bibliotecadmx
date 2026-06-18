import type { ReactNode } from 'react';
import type {
  AdminTab,
  Exercise,
  ExerciseForm,
  ExerciseRequest,
  AuthorizedEmail,
  UserProfile,
  AppSettings,
  HeroSpotlightSettings,
} from '../types';
import { CATEGORIES } from '../lib/constants';
import { Icon } from './Icon';
import { AdminCoverEditor } from './AdminCoverEditor';
import { AdminEquipmentField } from './AdminEquipmentField';
import { AccessIntegrationsSection } from './AccessIntegrationsSection';
import { HeroSpotlightSection } from './HeroSpotlightSection';

interface AdminPanelProps {
  adminTab: AdminTab;
  setAdminTab: (tab: AdminTab) => void;
  editingId: string | null;
  form: ExerciseForm;
  setForm: (form: ExerciseForm) => void;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  sendNotification: boolean;
  setSendNotification: (v: boolean) => void;
  sendEmail: boolean;
  setSendEmail: (v: boolean) => void;
  batchInput: string;
  setBatchInput: (v: string) => void;
  syncing: boolean;
  onBatchImport: () => void;
  exerciseRequests: ExerciseRequest[];
  onMarkRequestDone: (req: ExerciseRequest) => void;
  onDeleteRequest: (reqId: string) => void;
  authorizedEmails: AuthorizedEmail[];
  newAuthEmail: string;
  setNewAuthEmail: (v: string) => void;
  onAddAuthEmail: (e: React.FormEvent) => void;
  onRemoveAuthEmail: (email: string) => void;
  appUsers: UserProfile[];
  onToggleUserStatus: (uid: string, status: string) => void;
  isAuditing: boolean;
  auditProgress: number;
  auditCurrentItem: string;
  auditStats: { checked: number; found: number; missing: number };
  onRunCloudAudit: () => void;
  appSettings: AppSettings;
  setAppSettings: (s: AppSettings) => void;
  onSaveSettings: (e: React.FormEvent) => void;
  exercises: Exercise[];
  heroSpotlight: HeroSpotlightSettings;
  onHeroSpotlightChange: (next: HeroSpotlightSettings) => void;
  onSaveHeroSpotlight: (next: HeroSpotlightSettings) => Promise<void>;
}

type NavItem = {
  tab: AdminTab;
  label: string;
  icon: string;
  badge?: number;
};

function AdminField({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`admin-field ${className}`}>
      <label className="admin-label">{label}</label>
      {children}
    </div>
  );
}

function AdminEmpty({ message }: { message: string }) {
  return (
    <div className="admin-empty">
      <p>{message}</p>
    </div>
  );
}

function AdminRowActions({ children }: { children: React.ReactNode }) {
  return <div className="admin-row-actions">{children}</div>;
}

export function AdminPanel({
  adminTab,
  setAdminTab,
  editingId,
  form,
  setForm,
  onClose,
  onSave,
  sendNotification,
  setSendNotification,
  sendEmail,
  setSendEmail,
  batchInput,
  setBatchInput,
  syncing,
  onBatchImport,
  exerciseRequests,
  onMarkRequestDone,
  onDeleteRequest,
  authorizedEmails,
  newAuthEmail,
  setNewAuthEmail,
  onAddAuthEmail,
  onRemoveAuthEmail,
  appUsers,
  onToggleUserStatus,
  isAuditing,
  auditProgress,
  auditCurrentItem,
  auditStats,
  onRunCloudAudit,
  appSettings,
  setAppSettings,
  onSaveSettings,
  exercises,
  heroSpotlight,
  onHeroSpotlightChange,
  onSaveHeroSpotlight,
}: AdminPanelProps) {
  const pendingRequests = exerciseRequests.filter((r) => r.status === 'pending');
  const pendingUsers = appUsers.filter((u) => u.status === 'pending').length;

  const navItems: NavItem[] = editingId
    ? [{ tab: 'single', label: 'Editar exercício', icon: 'pencil' }]
    : [
        { tab: 'batch', label: 'Importar lote', icon: 'server' },
        { tab: 'single', label: 'Cadastro único', icon: 'pluscircle' },
        { tab: 'requests', label: 'Pedidos', icon: 'listtodo', badge: pendingRequests.length },
        { tab: 'users', label: 'Alunos', icon: 'users', badge: pendingUsers },
        { tab: 'authorized', label: 'E-mails', icon: 'mail', badge: authorizedEmails.length },
        { tab: 'audit', label: 'Auditoria', icon: 'cloud' },
        { tab: 'settings', label: 'Integrações', icon: 'settings' },
      ];

  const tabTitles: Record<AdminTab, string> = {
    batch: 'Importação em lote',
    single: editingId ? 'Editar registro' : 'Cadastro único',
    requests: 'Pedidos dos alunos',
    users: 'Gerenciar alunos',
    authorized: 'Pré-autorização',
    audit: 'Auditoria na nuvem',
    settings: 'Integrações e acesso pago',
  };

  return (
    <div className="admin-shell">
      <div className="admin-modal">
        <header className="admin-header">
          <div>
            <p className="admin-eyebrow">Studio Admin</p>
            <h2 className="admin-title">{tabTitles[adminTab]}</h2>
          </div>
          <button type="button" onClick={onClose} className="admin-close" aria-label="Fechar">
            <Icon name="x" className="w-5 h-5" />
          </button>
        </header>

        <div className="admin-body">
          {!editingId && (
            <nav className="admin-nav" aria-label="Seções do admin">
              {navItems.map((item) => (
                <button
                  key={item.tab}
                  type="button"
                  onClick={() => setAdminTab(item.tab)}
                  className={`admin-nav-item ${adminTab === item.tab ? 'admin-nav-item--active' : ''}`}
                >
                  <Icon name={item.icon} className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {item.badge != null && item.badge > 0 && (
                    <span className="admin-nav-badge">{item.badge}</span>
                  )}
                </button>
              ))}
            </nav>
          )}

          <div className="admin-content">
            {adminTab === 'batch' && (
              <div className="admin-panel-section admin-panel-section--batch">
                <p className="admin-lead">
                  Cole um array JSON. O sistema normaliza <code>muscleGroups</code>,{' '}
                  <code>keywords</code> e <code>equipment</code> e grava em lote no Firestore.
                </p>
                <textarea
                  placeholder={'[\n  {\n    "name": "Agachamento Livre",\n    "category": "Quadríceps",\n    "muscleGroups": "Quadríceps, Glúteos",\n    "equipment": ["barra"],\n    "keywords": "agachamento, squat",\n    "youtubeUrl": ""\n  }\n]'}
                  className="admin-code-editor"
                  value={batchInput}
                  onChange={(e) => setBatchInput(e.target.value)}
                  spellCheck={false}
                />
                <div className="admin-sticky-actions">
                  <button
                    type="button"
                    onClick={onBatchImport}
                    disabled={syncing || !batchInput.trim()}
                    className="admin-btn admin-btn--primary"
                  >
                    {syncing ? (
                      <Icon name="loader" className="w-4 h-4 animate-spin" />
                    ) : (
                      <Icon name="save" className="w-4 h-4" />
                    )}
                    {syncing ? 'Importando…' : 'Executar importação'}
                  </button>
                </div>
              </div>
            )}

            {adminTab === 'single' && (
              <form onSubmit={onSave} className="admin-form-grid">
                <AdminField label="ID (opcional)">
                  <input
                    placeholder="Ex: 0045 — vazio = auto"
                    className="admin-input"
                    value={form.id}
                    onChange={(e) => setForm({ ...form, id: e.target.value })}
                  />
                </AdminField>
                <AdminField label="Nome">
                  <input
                    required
                    placeholder="Supino reto"
                    className="admin-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </AdminField>
                <AdminField label="Categoria">
                  <div className="admin-select-wrap">
                    <select
                      className="admin-input"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                    >
                      {CATEGORIES.slice(1).map((c) => (
                        <option key={c} value={c} className="bg-canvas">
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </AdminField>
                <AdminField label="YouTube URL">
                  <input
                    required
                    placeholder="https://youtube.com/watch?v=..."
                    className="admin-input"
                    value={form.youtubeUrl}
                    onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })}
                  />
                </AdminField>
                <AdminField label="Músculos (vírgula)" className="admin-field--full">
                  <input
                    placeholder="Peitoral, Tríceps — primeiro = primário"
                    className="admin-input"
                    value={form.muscleGroups}
                    onChange={(e) => setForm({ ...form, muscleGroups: e.target.value })}
                  />
                </AdminField>
                <AdminField label="Equipamento" className="admin-field--full">
                  <AdminEquipmentField
                    equipment={form.equipment}
                    onChange={(equipment) => setForm({ ...form, equipment })}
                  />
                </AdminField>
                <AdminField label="Capa (opcional)" className="admin-field--full">
                  <input
                    placeholder="URL ou deixe vazio para GitHub / YouTube"
                    className="admin-input"
                    value={form.thumbnail}
                    onChange={(e) => setForm({ ...form, thumbnail: e.target.value })}
                  />
                </AdminField>
                <AdminField label="Enquadramento da capa" className="admin-field--full">
                  <AdminCoverEditor
                    form={form}
                    setForm={setForm}
                    editingFirestoreId={editingId}
                  />
                </AdminField>
                <AdminField label="Keywords" className="admin-field--full">
                  <textarea
                    placeholder="Tags separadas por vírgula"
                    className="admin-input admin-input--area"
                    value={form.keywords}
                    onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                  />
                </AdminField>
                {!editingId && (
                  <div className="admin-field--full admin-toggle-row">
                    <button
                      type="button"
                      className={`admin-toggle ${sendNotification ? 'admin-toggle--on' : ''}`}
                      onClick={() => setSendNotification(!sendNotification)}
                    >
                      <Icon name="bell" className="w-4 h-4" />
                      Alerta no sino
                    </button>
                    <button
                      type="button"
                      className={`admin-toggle ${sendEmail ? 'admin-toggle--on' : ''}`}
                      onClick={() => setSendEmail(!sendEmail)}
                    >
                      <Icon name="mail" className="w-4 h-4" />
                      Disparar e-mail
                    </button>
                  </div>
                )}
                <div className="admin-field--full">
                  <button type="submit" className="admin-btn admin-btn--primary w-full sm:w-auto">
                    <Icon name="save" className="w-4 h-4" />
                    {editingId ? 'Salvar alterações' : 'Salvar exercício'}
                  </button>
                </div>
              </form>
            )}

            {adminTab === 'requests' && (
              <div className="admin-panel-section">
                {pendingRequests.length === 0 ? (
                  <AdminEmpty message="Nenhum pedido pendente na fila." />
                ) : (
                  <div className="admin-list">
                    {pendingRequests.map((r) => (
                      <article key={r.id} className="admin-list-card">
                        <div className="admin-list-main">
                          <h3 className="admin-list-title">{r.exerciseName}</h3>
                          {r.details && <p className="admin-list-meta">&quot;{r.details}&quot;</p>}
                          <p className="admin-list-sub">
                            {r.userName} · {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <AdminRowActions>
                          <button
                            type="button"
                            onClick={() => onMarkRequestDone(r)}
                            className="admin-btn admin-btn--success admin-btn--sm"
                          >
                            <Icon name="check" className="w-3.5 h-3.5" />
                            Gravado
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteRequest(r.id)}
                            className="admin-btn admin-btn--ghost admin-btn--sm"
                            title="Excluir sem notificar"
                          >
                            <Icon name="trash" className="w-3.5 h-3.5" />
                          </button>
                        </AdminRowActions>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {adminTab === 'authorized' && (
              <div className="admin-panel-section">
                <form onSubmit={onAddAuthEmail} className="admin-inline-form">
                  <input
                    required
                    type="email"
                    placeholder="aluno@email.com"
                    className="admin-input flex-1"
                    value={newAuthEmail}
                    onChange={(e) => setNewAuthEmail(e.target.value)}
                  />
                  <button type="submit" className="admin-btn admin-btn--accent shrink-0">
                    Autorizar
                  </button>
                </form>
                <p className="admin-hint">
                  E-mails autorizados são aprovados automaticamente no cadastro.
                </p>
                {authorizedEmails.length === 0 ? (
                  <AdminEmpty message="Nenhum e-mail pré-autorizado." />
                ) : (
                  <div className="admin-list">
                    {authorizedEmails.map((item) => (
                      <article key={item.email} className="admin-list-card admin-list-card--compact">
                        <div className="admin-list-main">
                          <p className="admin-list-title">{item.email}</p>
                          <p className="admin-list-sub">
                            {item.source === 'kiwify'
                              ? 'Kiwify'
                              : item.source === 'stripe'
                                ? 'Stripe'
                                : item.source === 'manual_admin'
                                  ? 'Manual'
                                  : item.source}{' '}
                            ·{' '}
                            {item.accessStatus === 'revoked' ? (
                              <span className="text-red-400">Revogado</span>
                            ) : (
                              <span className="text-emerald-400">Ativo</span>
                            )}
                            {item.authorizedAt
                              ? ` · ${new Date(item.authorizedAt).toLocaleDateString('pt-BR')}`
                              : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveAuthEmail(item.email)}
                          className="admin-btn admin-btn--ghost admin-btn--sm"
                        >
                          <Icon name="trash" className="w-4 h-4" />
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {adminTab === 'users' && (
              <div className="admin-panel-section">
                {appUsers.length === 0 ? (
                  <AdminEmpty message="Nenhum aluno cadastrado." />
                ) : (
                  <div className="admin-list">
                    {appUsers.map((u) => (
                      <article key={u.uid} className="admin-list-card admin-list-card--compact">
                        <div className="admin-list-main">
                          <p className="admin-list-title">{u.name}</p>
                          <p className="admin-list-sub">
                            {u.email} · {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`admin-status ${
                              u.status === 'approved'
                                ? 'admin-status--ok'
                                : u.status === 'blocked'
                                  ? 'admin-status--bad'
                                  : 'admin-status--warn'
                            }`}
                          >
                            {u.status === 'approved'
                              ? 'Aprovado'
                              : u.status === 'blocked'
                                ? 'Bloqueado'
                                : 'Pendente'}
                          </span>
                          <button
                            type="button"
                            onClick={() => onToggleUserStatus(u.uid, u.status)}
                            className={`admin-btn admin-btn--sm ${
                              u.status === 'approved' ? 'admin-btn--ghost' : 'admin-btn--success'
                            }`}
                          >
                            {u.status === 'approved' ? (
                              <>
                                <Icon name="x" className="w-3.5 h-3.5" />
                                Bloquear
                              </>
                            ) : (
                              <>
                                <Icon name="check" className="w-3.5 h-3.5" />
                                Aprovar
                              </>
                            )}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {adminTab === 'audit' && (
              <div className="admin-panel-section">
                <p className="admin-lead">
                  A auditoria roda em segundo plano. Use o botão abaixo apenas para forçar uma varredura
                  imediata.
                </p>
                <button
                  type="button"
                  onClick={onRunCloudAudit}
                  disabled={isAuditing}
                  className="admin-btn admin-btn--indigo"
                >
                  {isAuditing ? (
                    <Icon name="loader" className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon name="cloud" className="w-4 h-4" />
                  )}
                  {isAuditing ? 'Varredura em andamento…' : 'Forçar varredura'}
                </button>
                {isAuditing && (
                  <>
                    <div className="admin-progress">
                      <div className="admin-progress-bar" style={{ width: `${auditProgress}%` }} />
                    </div>
                    <p className="admin-hint">
                      {auditProgress}% · ID {auditCurrentItem || '—'}
                    </p>
                  </>
                )}
                {auditStats.checked > 0 && (
                  <div className="admin-stats-row">
                    <div className="admin-stat-chip">
                      <span className="admin-stat-label">Verificados</span>
                      <span className="admin-stat-value">{auditStats.checked}</span>
                    </div>
                    <div className="admin-stat-chip admin-stat-chip--ok">
                      <span className="admin-stat-label">Upados</span>
                      <span className="admin-stat-value">{auditStats.found}</span>
                    </div>
                    <div className="admin-stat-chip admin-stat-chip--bad">
                      <span className="admin-stat-label">Faltando</span>
                      <span className="admin-stat-value">{auditStats.missing}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {adminTab === 'settings' && (
              <div className="admin-settings-stack">
                <HeroSpotlightSection
                  exercises={exercises}
                  heroSpotlight={heroSpotlight}
                  onChange={onHeroSpotlightChange}
                  onSave={onSaveHeroSpotlight}
                />
                <AccessIntegrationsSection
                  appSettings={appSettings}
                  setAppSettings={setAppSettings}
                  onSave={onSaveSettings}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
