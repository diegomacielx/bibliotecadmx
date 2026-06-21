import type {
  HeroCampaign,
  HeroCampaignRotation,
  HeroCampaignStats,
  HeroCampaignStatus,
  HeroSpotlightSettings,
} from '../types';
import type { CoverFrameSource } from './coverFocus';

const DEFAULT_CTA = 'Saiba mais';

export function createCampaignId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `camp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyCampaign(priority = 100): HeroCampaign {
  const now = new Date().toISOString();
  return {
    id: createCampaignId(),
    label: '',
    enabled: true,
    imageUrl: '',
    title: '',
    subtitle: '',
    categoryLabel: 'Patrocinado',
    ctaLabel: DEFAULT_CTA,
    linkUrl: '',
    priority,
    createdAt: now,
    updatedAt: now,
  };
}

function legacyCampaignFromSettings(spot: HeroSpotlightSettings): HeroCampaign | null {
  if (!spot.imageUrl?.trim()) return null;
  const now = new Date().toISOString();
  return {
    id: createCampaignId(),
    label: spot.title?.trim() || 'Campanha legada',
    enabled: true,
    imageUrl: spot.imageUrl.trim(),
    title: spot.title?.trim() || 'Destaque',
    subtitle: spot.subtitle?.trim(),
    categoryLabel: spot.categoryLabel?.trim() || 'Outdoor',
    ctaLabel: spot.ctaLabel?.trim() || DEFAULT_CTA,
    linkUrl: spot.linkUrl?.trim(),
    coverFocusX: spot.coverFocusX,
    coverFocusY: spot.coverFocusY,
    coverZoom: spot.coverZoom,
    priority: 1,
    createdAt: now,
    updatedAt: now,
  };
}

/** Normaliza settings vindos do Firestore (migra campanha única legada → array). */
export function normalizeHeroSpotlight(
  raw: HeroSpotlightSettings | undefined
): HeroSpotlightSettings {
  const spot: HeroSpotlightSettings = { ...(raw ?? {}) };
  spot.campaigns = Array.isArray(spot.campaigns) ? [...spot.campaigns] : [];
  spot.stats = spot.stats ?? {};
  spot.campaignRotation = spot.campaignRotation ?? 'queue';

  if (spot.campaigns.length === 0 && spot.mode === 'campaign') {
    const legacy = legacyCampaignFromSettings(spot);
    if (legacy) spot.campaigns = [legacy];
  }

  return spot;
}

export function getCampaignStats(
  stats: Record<string, HeroCampaignStats> | undefined,
  campaignId: string
): HeroCampaignStats {
  return stats?.[campaignId] ?? { impressions: 0, clicks: 0 };
}

export function formatCampaignCtr(stat: HeroCampaignStats): string {
  if (!stat.impressions) return '—';
  const pct = (stat.clicks / stat.impressions) * 100;
  return `${pct < 10 ? pct.toFixed(1) : Math.round(pct)}%`;
}

export function getCampaignStatus(campaign: HeroCampaign, now = new Date()): HeroCampaignStatus {
  if (!campaign.enabled) return 'paused';
  if (!campaign.imageUrl?.trim() || !campaign.title?.trim()) return 'draft';
  const start = campaign.startAt ? new Date(campaign.startAt) : null;
  const end = campaign.endAt ? new Date(campaign.endAt) : null;
  if (start && !Number.isNaN(start.getTime()) && now < start) return 'scheduled';
  if (end && !Number.isNaN(end.getTime()) && now > end) return 'ended';
  return 'active';
}

export const CAMPAIGN_STATUS_LABEL: Record<HeroCampaignStatus, string> = {
  draft: 'Rascunho',
  scheduled: 'Agendada',
  active: 'Ativa',
  paused: 'Pausada',
  ended: 'Encerrada',
};

/** Campanhas elegíveis para exibição agora (ativas no calendário). */
export function getActiveCampaigns(campaigns: HeroCampaign[], now = new Date()): HeroCampaign[] {
  return campaigns.filter((c) => getCampaignStatus(c, now) === 'active');
}

function sortForRotation(campaigns: HeroCampaign[]): HeroCampaign[] {
  return [...campaigns].sort(
    (a, b) =>
      (a.priority ?? 999) - (b.priority ?? 999) ||
      (a.createdAt ?? '').localeCompare(b.createdAt ?? '') ||
      a.id.localeCompare(b.id)
  );
}

function dayHash(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

/** Escolhe qual campanha exibir entre as ativas no período. */
export function pickCampaignForDisplay(
  active: HeroCampaign[],
  rotation: HeroCampaignRotation | undefined,
  date = new Date()
): HeroCampaign | null {
  if (active.length === 0) return null;
  const sorted = sortForRotation(active);
  const mode = rotation ?? 'queue';

  if (mode === 'priority') {
    return sorted[0];
  }

  const dayKey = date.toISOString().slice(0, 10);

  if (mode === 'random') {
    const index = dayHash(`${dayKey}:hero-campaign-random`) % sorted.length;
    return sorted[index];
  }

  // queue: rotação diária na ordem de prioridade
  const index = dayHash(`${dayKey}:hero-campaign-queue`) % sorted.length;
  return sorted[index];
}

export function campaignToFrameSource(campaign: HeroCampaign): CoverFrameSource {
  return {
    name: campaign.title,
    category: campaign.categoryLabel || '',
    muscleGroups: [],
    coverFocusX: campaign.coverFocusX,
    coverFocusY: campaign.coverFocusY,
    coverZoom: campaign.coverZoom,
  };
}

export function campaignToDisplayFields(campaign: HeroCampaign) {
  return {
    mode: 'campaign' as const,
    campaignId: campaign.id,
    title: campaign.title.trim(),
    subtitle: campaign.subtitle?.trim(),
    categoryLabel: campaign.categoryLabel?.trim() || 'Patrocinado',
    imageUrl: campaign.imageUrl.trim(),
    linkUrl: campaign.linkUrl?.trim(),
    ctaLabel: campaign.ctaLabel?.trim() || DEFAULT_CTA,
    frameSource: campaignToFrameSource(campaign),
  };
}

/** Converte ISO para valor de input datetime-local (hora local). */
export function isoToDatetimeLocal(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function datetimeLocalToIso(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

export function formatScheduleRange(campaign: HeroCampaign): string {
  const start = campaign.startAt ? new Date(campaign.startAt) : null;
  const end = campaign.endAt ? new Date(campaign.endAt) : null;
  const fmt = (d: Date) =>
    d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  if (start && end) return `${fmt(start)} → ${fmt(end)}`;
  if (start) return `A partir de ${fmt(start)}`;
  if (end) return `Até ${fmt(end)}`;
  return 'Sem agendamento';
}

export function aggregateCampaignStats(stats: Record<string, HeroCampaignStats> | undefined): HeroCampaignStats {
  let impressions = 0;
  let clicks = 0;
  if (!stats) return { impressions, clicks };
  for (const s of Object.values(stats)) {
    impressions += s.impressions ?? 0;
    clicks += s.clicks ?? 0;
  }
  return { impressions, clicks };
}
