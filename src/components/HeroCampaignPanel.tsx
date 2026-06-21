import { useMemo, useState } from 'react';
import type { HeroCampaign, HeroSpotlightSettings } from '../types';
import { ExerciseCoverImage } from './ExerciseCoverImage';
import {
  CAMPAIGN_STATUS_LABEL,
  aggregateCampaignStats,
  campaignToFrameSource,
  createEmptyCampaign,
  createCampaignId,
  formatCampaignCtr,
  formatScheduleRange,
  getCampaignStats,
  getCampaignStatus,
  isoToDatetimeLocal,
  datetimeLocalToIso,
} from '../lib/heroCampaign';
import {
  getCoverFocusX,
  getCoverFocusY,
  parseCoverFocusXInput,
  parseCoverFocusYInput,
  parseCoverZoomInput,
  type CoverFrameSource,
} from '../lib/coverFocus';
import { Icon } from './Icon';

interface HeroCampaignPanelProps {
  heroSpotlight: HeroSpotlightSettings;
  onChange: (next: HeroSpotlightSettings) => void;
}

export function HeroCampaignPanel({ heroSpotlight, onChange }: HeroCampaignPanelProps) {
  const campaigns = heroSpotlight.campaigns ?? [];
  const stats = heroSpotlight.stats ?? {};
  const [editingId, setEditingId] = useState<string | null>(campaigns[0]?.id ?? null);
  const [listQuery, setListQuery] = useState('');

  const totals = useMemo(() => aggregateCampaignStats(stats), [stats]);

  const filteredCampaigns = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    const sorted = [...campaigns].sort(
      (a, b) => (a.priority ?? 999) - (b.priority ?? 999) || (a.createdAt ?? '').localeCompare(b.createdAt ?? '')
    );
    if (!q) return sorted;
    return sorted.filter(
      (c) =>
        c.label?.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.categoryLabel?.toLowerCase().includes(q)
    );
  }, [campaigns, listQuery]);

  const editing = campaigns.find((c) => c.id === editingId) ?? null;

  const patchSettings = (next: Partial<HeroSpotlightSettings>) =>
    onChange({ ...heroSpotlight, ...next });

  const patchCampaigns = (next: HeroCampaign[]) => patchSettings({ campaigns: next });

  const updateCampaign = (id: string, patch: Partial<HeroCampaign>) => {
    patchCampaigns(
      campaigns.map((c) =>
        c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c
      )
    );
  };

  const addCampaign = () => {
    const maxPriority = campaigns.reduce((m, c) => Math.max(m, c.priority ?? 0), 0);
    const next = createEmptyCampaign(maxPriority + 1);
    patchCampaigns([...campaigns, next]);
    setEditingId(next.id);
  };

  const duplicateCampaign = (source: HeroCampaign) => {
    const maxPriority = campaigns.reduce((m, c) => Math.max(m, c.priority ?? 0), 0);
    const now = new Date().toISOString();
    const copy: HeroCampaign = {
      ...source,
      id: createCampaignId(),
      label: source.label ? `${source.label} (cópia)` : 'Cópia',
      priority: maxPriority + 1,
      createdAt: now,
      updatedAt: now,
    };
    patchCampaigns([...campaigns, copy]);
    setEditingId(copy.id);
  };

  const removeCampaign = (id: string) => {
    if (!confirm('Excluir esta campanha? As métricas permanecem no histórico.')) return;
    patchCampaigns(campaigns.filter((c) => c.id !== id));
    if (editingId === id) setEditingId(campaigns.find((c) => c.id !== id)?.id ?? null);
  };

  const movePriority = (id: string, dir: -1 | 1) => {
    const sorted = [...campaigns].sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
    const idx = sorted.findIndex((c) => c.id === id);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[swapIdx];
    patchCampaigns(
      campaigns.map((c) => {
        if (c.id === a.id) return { ...c, priority: b.priority ?? swapIdx + 1 };
        if (c.id === b.id) return { ...c, priority: a.priority ?? idx + 1 };
        return c;
      })
    );
  };

  const previewFrame: CoverFrameSource = editing
    ? {
        ...campaignToFrameSource(editing),
        coverFocusX: editing.coverFocusX,
        coverFocusY: editing.coverFocusY,
        coverZoom: editing.coverZoom,
      }
    : { name: '', category: '', muscleGroups: [] };

  const displayY =
    parseCoverFocusYInput(editing?.coverFocusY != null ? String(editing.coverFocusY) : '') ??
    getCoverFocusY(previewFrame);
  const displayX =
    parseCoverFocusXInput(editing?.coverFocusX != null ? String(editing.coverFocusX) : '') ??
    getCoverFocusX(previewFrame);
  const displayZoom = Math.round(
    (parseCoverZoomInput(
      editing?.coverZoom != null ? String(Math.round(editing.coverZoom * 100)) : ''
    ) ?? previewFrame.coverZoom ?? 1) * 100
  );

  return (
    <div className="hero-campaign-panel">
      <div className="hero-campaign-panel__toolbar">
        <div className="hero-campaign-panel__rotation">
          <span className="admin-label">Rotação entre campanhas ativas</span>
          <div className="admin-cover-mode admin-cover-mode--compact">
            {(
              [
                ['queue', 'Fila diária', 'Alterna por prioridade a cada dia'],
                ['random', 'Sorteio diário', 'Escolhe uma campanha ativa por dia'],
                ['priority', 'Prioridade fixa', 'Sempre a de maior prioridade'],
              ] as const
            ).map(([value, label, hint]) => (
              <button
                key={value}
                type="button"
                title={hint}
                className={`admin-cover-mode-btn ${heroSpotlight.campaignRotation === value ? 'admin-cover-mode-btn--active' : ''}`}
                onClick={() => patchSettings({ campaignRotation: value })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-stats-row hero-campaign-panel__totals">
          <div className="admin-stat-chip">
            <span className="admin-stat-label">Impressões</span>
            <span className="admin-stat-value">{totals.impressions.toLocaleString('pt-BR')}</span>
          </div>
          <div className="admin-stat-chip admin-stat-chip--ok">
            <span className="admin-stat-label">Cliques</span>
            <span className="admin-stat-value">{totals.clicks.toLocaleString('pt-BR')}</span>
          </div>
          <div className="admin-stat-chip">
            <span className="admin-stat-label">CTR geral</span>
            <span className="admin-stat-value">{formatCampaignCtr(totals)}</span>
          </div>
        </div>
      </div>

      <div className="hero-campaign-panel__list-head">
        <input
          type="search"
          className="admin-input hero-campaign-panel__search"
          placeholder="Filtrar campanhas…"
          value={listQuery}
          onChange={(e) => setListQuery(e.target.value)}
        />
        <button type="button" className="admin-btn admin-btn--primary admin-btn--sm" onClick={addCampaign}>
          <Icon name="plus" className="w-4 h-4" />
          Nova campanha
        </button>
      </div>

      <div className="hero-campaign-table-wrap">
        <table className="hero-campaign-table">
          <thead>
            <tr>
              <th scope="col">Campanha</th>
              <th scope="col">Status</th>
              <th scope="col">Agendamento</th>
              <th scope="col" className="hero-campaign-table__num">
                Impr.
              </th>
              <th scope="col" className="hero-campaign-table__num">
                Cliques
              </th>
              <th scope="col" className="hero-campaign-table__num">
                CTR
              </th>
              <th scope="col" className="hero-campaign-table__actions">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredCampaigns.length === 0 ? (
              <tr>
                <td colSpan={7} className="hero-campaign-table__empty">
                  Nenhuma campanha. Crie uma para veicular no destaque.
                </td>
              </tr>
            ) : (
              filteredCampaigns.map((c) => {
                const status = getCampaignStatus(c);
                const cStats = getCampaignStats(stats, c.id);
                const isSelected = c.id === editingId;
                return (
                  <tr
                    key={c.id}
                    className={`hero-campaign-table__row ${isSelected ? 'hero-campaign-table__row--selected' : ''}`}
                    onClick={() => setEditingId(c.id)}
                  >
                    <td>
                      <div className="hero-campaign-table__name">
                        <span className="hero-campaign-table__title">
                          {c.label?.trim() || c.title || 'Sem título'}
                        </span>
                        {c.label?.trim() && c.title && (
                          <span className="hero-campaign-table__subtitle">{c.title}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`hero-campaign-badge hero-campaign-badge--${status}`}>
                        {CAMPAIGN_STATUS_LABEL[status]}
                      </span>
                    </td>
                    <td className="hero-campaign-table__schedule">{formatScheduleRange(c)}</td>
                    <td className="hero-campaign-table__num">{cStats.impressions.toLocaleString('pt-BR')}</td>
                    <td className="hero-campaign-table__num">{cStats.clicks.toLocaleString('pt-BR')}</td>
                    <td className="hero-campaign-table__num">{formatCampaignCtr(cStats)}</td>
                    <td className="hero-campaign-table__actions" onClick={(e) => e.stopPropagation()}>
                      <div className="hero-campaign-table__action-group">
                        <button
                          type="button"
                          className="admin-btn admin-btn--ghost admin-btn--sm"
                          title="Subir prioridade"
                          onClick={() => movePriority(c.id, -1)}
                        >
                          <Icon name="chevronup" className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn--ghost admin-btn--sm"
                          title="Descer prioridade"
                          onClick={() => movePriority(c.id, 1)}
                        >
                          <Icon name="chevrondown" className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn--ghost admin-btn--sm"
                          title={c.enabled ? 'Pausar' : 'Ativar'}
                          onClick={() => updateCampaign(c.id, { enabled: !c.enabled })}
                        >
                          <Icon name={c.enabled ? 'pause' : 'play'} className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn--ghost admin-btn--sm"
                          title="Duplicar"
                          onClick={() => duplicateCampaign(c)}
                        >
                          <Icon name="copy" className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn--ghost admin-btn--sm hero-campaign-table__delete"
                          title="Excluir"
                          onClick={() => removeCampaign(c.id)}
                        >
                          <Icon name="trash" className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="hero-campaign-editor">
          <header className="hero-campaign-editor__head">
            <h4 className="hero-campaign-editor__title">Editar campanha</h4>
            <span className={`hero-campaign-badge hero-campaign-badge--${getCampaignStatus(editing)}`}>
              {CAMPAIGN_STATUS_LABEL[getCampaignStatus(editing)]}
            </span>
          </header>

          <div className="hero-campaign-editor__grid">
            <div className="hero-campaign-editor__form admin-form-grid">
              <label className="admin-field admin-field--full">
                <span className="admin-label">Nome interno</span>
                <input
                  className="admin-input"
                  placeholder="Cliente X — março 2026"
                  value={editing.label ?? ''}
                  onChange={(e) => updateCampaign(editing.id, { label: e.target.value })}
                />
              </label>
              <label className="admin-field admin-field--full">
                <span className="admin-label">Imagem (URL 16:9)</span>
                <input
                  className="admin-input"
                  placeholder="https://storage.googleapis.com/…"
                  value={editing.imageUrl}
                  onChange={(e) => updateCampaign(editing.id, { imageUrl: e.target.value })}
                />
              </label>
              <label className="admin-field admin-field--full">
                <span className="admin-label">Título público</span>
                <input
                  className="admin-input"
                  value={editing.title}
                  onChange={(e) => updateCampaign(editing.id, { title: e.target.value })}
                />
              </label>
              <label className="admin-field admin-field--full">
                <span className="admin-label">Subtítulo</span>
                <input
                  className="admin-input"
                  value={editing.subtitle ?? ''}
                  onChange={(e) => updateCampaign(editing.id, { subtitle: e.target.value })}
                />
              </label>
              <label className="admin-field">
                <span className="admin-label">Tag / categoria</span>
                <input
                  className="admin-input"
                  placeholder="Patrocinado"
                  value={editing.categoryLabel ?? ''}
                  onChange={(e) => updateCampaign(editing.id, { categoryLabel: e.target.value })}
                />
              </label>
              <label className="admin-field">
                <span className="admin-label">Texto do botão</span>
                <input
                  className="admin-input"
                  value={editing.ctaLabel ?? ''}
                  onChange={(e) => updateCampaign(editing.id, { ctaLabel: e.target.value })}
                />
              </label>
              <label className="admin-field admin-field--full">
                <span className="admin-label">Link ao clicar</span>
                <input
                  className="admin-input"
                  placeholder="https://…"
                  value={editing.linkUrl ?? ''}
                  onChange={(e) => updateCampaign(editing.id, { linkUrl: e.target.value })}
                />
              </label>
              <label className="admin-field">
                <span className="admin-label">Início</span>
                <input
                  type="datetime-local"
                  className="admin-input"
                  value={isoToDatetimeLocal(editing.startAt)}
                  onChange={(e) =>
                    updateCampaign(editing.id, { startAt: datetimeLocalToIso(e.target.value) })
                  }
                />
              </label>
              <label className="admin-field">
                <span className="admin-label">Fim</span>
                <input
                  type="datetime-local"
                  className="admin-input"
                  value={isoToDatetimeLocal(editing.endAt)}
                  onChange={(e) =>
                    updateCampaign(editing.id, { endAt: datetimeLocalToIso(e.target.value) })
                  }
                />
              </label>
            </div>

            <div className="hero-campaign-editor__preview admin-cover-focus">
              <div className="admin-cover-preview admin-cover-preview--hero hero-cover-wrap card-catalog-cover">
                {editing.imageUrl ? (
                  <ExerciseCoverImage
                    imgSrc={editing.imageUrl}
                    imgLoaded
                    alt=""
                    frameSource={{
                      ...previewFrame,
                      coverFocusX: displayX,
                      coverFocusY: displayY,
                      coverZoom: displayZoom / 100,
                    }}
                    useBlurUp={false}
                    onLoad={() => {}}
                    onError={() => {}}
                    imgClassName="card-cover-img"
                  />
                ) : (
                  <div className="admin-cover-preview-empty">Informe a URL da imagem</div>
                )}
                <span className="admin-cover-preview-badge">
                  16:9 · {displayX}% · {displayY}% · {displayZoom}%
                </span>
              </div>
              <div className="admin-cover-controls">
                <label className="admin-cover-slider-label">
                  <span>Foco Y</span>
                  <span className="admin-cover-slider-value">{displayY}%</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={displayY}
                  className="admin-cover-slider"
                  onChange={(e) => updateCampaign(editing.id, { coverFocusY: Number(e.target.value) })}
                />
                <label className="admin-cover-slider-label">
                  <span>Foco X</span>
                  <span className="admin-cover-slider-value">{displayX}%</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={displayX}
                  className="admin-cover-slider"
                  onChange={(e) => updateCampaign(editing.id, { coverFocusX: Number(e.target.value) })}
                />
                <label className="admin-cover-slider-label">
                  <span>Zoom</span>
                  <span className="admin-cover-slider-value">{displayZoom}%</span>
                </label>
                <input
                  type="range"
                  min={75}
                  max={160}
                  value={displayZoom}
                  className="admin-cover-slider"
                  onChange={(e) =>
                    updateCampaign(editing.id, { coverZoom: Number(e.target.value) / 100 })
                  }
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
