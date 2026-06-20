import type { UserProfile } from '../types';

export type GroupedAppUser = {
  primary: UserProfile;
  duplicates: UserProfile[];
};

export function groupAppUsersByEmail(users: UserProfile[]): GroupedAppUser[] {
  const byEmail = new Map<string, UserProfile[]>();

  for (const u of users) {
    const key = (u.email || '').trim().toLowerCase();
    if (!key) continue;
    const list = byEmail.get(key) ?? [];
    list.push(u);
    byEmail.set(key, list);
  }

  const groups = [...byEmail.values()].map((list) => {
    const sorted = [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return { primary: sorted[0], duplicates: sorted.slice(1) };
  });

  groups.sort(
    (a, b) => new Date(b.primary.createdAt).getTime() - new Date(a.primary.createdAt).getTime()
  );

  return groups;
}
