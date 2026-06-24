export type PlaylistSelectionLookup = {
  readonly ids: ReadonlySet<string>;
  readonly sequenceById: ReadonlyMap<string, number>;
  readonly count: number;
};

const EMPTY_LOOKUP: PlaylistSelectionLookup = {
  ids: new Set(),
  sequenceById: new Map(),
  count: 0,
};

export const playlistSelectionEmpty = EMPTY_LOOKUP;

export function buildPlaylistSelectionLookup(order: string[]): PlaylistSelectionLookup {
  if (order.length === 0) return EMPTY_LOOKUP;
  const ids = new Set(order);
  const sequenceById = new Map(order.map((id, index) => [id, index + 1]));
  return { ids, sequenceById, count: order.length };
}

export function getPlaylistSequence(
  lookup: PlaylistSelectionLookup,
  firestoreId: string,
  selectionMode: boolean
): number | undefined {
  if (!selectionMode) return undefined;
  return lookup.sequenceById.get(firestoreId);
}
