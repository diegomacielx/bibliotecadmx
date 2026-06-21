import { increment, updateDoc } from 'firebase/firestore';
import { db, fbDoc } from './firebase';
import { getSettingsPath, logWarn } from './utils';

const IMPRESSION_SESSION_PREFIX = 'dmx_hero_imp_';

async function incrementStat(campaignId: string, field: 'impressions' | 'clicks'): Promise<void> {
  if (!campaignId) return;
  try {
    const settingsRef = fbDoc(db, ...getSettingsPath());
    await updateDoc(settingsRef, {
      [`heroSpotlight.stats.${campaignId}.${field}`]: increment(1),
    });
  } catch (err) {
    logWarn('HeroCampaignMetrics', `Falha ao registrar ${field}`, err);
  }
}

/** Uma impressão por campanha por sessão de navegador. */
export async function trackHeroCampaignImpression(campaignId: string): Promise<void> {
  if (!campaignId || typeof window === 'undefined') return;
  const key = `${IMPRESSION_SESSION_PREFIX}${campaignId}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch {
    /* sessionStorage indisponível — registra mesmo assim */
  }
  await incrementStat(campaignId, 'impressions');
}

export async function trackHeroCampaignClick(campaignId: string): Promise<void> {
  await incrementStat(campaignId, 'clicks');
}
