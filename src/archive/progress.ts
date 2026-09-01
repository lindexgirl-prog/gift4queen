import type { MemoryCard } from '../data/archiveSchema';

export const PROGRESS_STORAGE_KEY = 'family-archive:progress';

export type ArchiveProgress = {
  contentVersion: string;
  viewedCardIds: string[];
  lastCardId: string | null;
  continuationUnlocked: boolean;
};

export function createProgress(contentVersion: string): ArchiveProgress {
  return {
    contentVersion,
    viewedCardIds: [],
    lastCardId: null,
    continuationUnlocked: false,
  };
}

export function markCardViewed(progress: ArchiveProgress, cardId: string): ArchiveProgress {
  const viewedCardIds = progress.viewedCardIds.includes(cardId)
    ? progress.viewedCardIds
    : [...progress.viewedCardIds, cardId];

  return { ...progress, viewedCardIds, lastCardId: cardId };
}

export function revealContinuation(
  progress: ArchiveProgress,
  triggerCardId: string,
): ArchiveProgress {
  if (triggerCardId !== 'memory-050' || !progress.viewedCardIds.includes(triggerCardId)) return progress;
  return { ...progress, continuationUnlocked: true };
}

export function getAccessibleCardIds(
  cards: MemoryCard[],
  progress: ArchiveProgress,
): Set<string> {
  const accessible = new Set<string>();
  const viewed = new Set(progress.viewedCardIds);
  let previousCardsViewed = true;

  cards.forEach((card) => {
    if (!previousCardsViewed) return;

    if (card.unlock && !viewed.has(card.unlock.cardId)) {
      previousCardsViewed = false;
      return;
    }
    if (card.id === 'memory-051' && !progress.continuationUnlocked) {
      previousCardsViewed = false;
      return;
    }

    accessible.add(card.id);
    if (!viewed.has(card.id)) previousCardsViewed = false;
  });

  return accessible;
}

export function parseStoredProgress(
  raw: string | null,
  contentVersion: string,
  orderedCards: MemoryCard[],
): ArchiveProgress {
  if (!raw) return createProgress(contentVersion);

  try {
    const parsed = JSON.parse(raw) as Partial<ArchiveProgress>;
    const storedViewed = new Set(
      Array.isArray(parsed.viewedCardIds)
        ? parsed.viewedCardIds.filter((id): id is string => typeof id === 'string')
        : [],
    );
    const validViewedCardIds = orderedCards
      .filter((card) => storedViewed.has(card.id))
      .map((card) => card.id);
    const requestedContinuation = parsed.continuationUnlocked === true;
    const reachablePrefix: string[] = [];
    const reachableIds = new Set<string>();
    let blockedByUnlockDependency = false;

    for (const card of orderedCards) {
      if (!storedViewed.has(card.id)) break;
      if (card.unlock && !reachableIds.has(card.unlock.cardId)) {
        blockedByUnlockDependency = true;
        break;
      }
      if (
        card.id === 'memory-051'
        && (!requestedContinuation || !reachablePrefix.includes('memory-050'))
      ) break;
      reachablePrefix.push(card.id);
      reachableIds.add(card.id);
    }

    const continuationUnlocked = requestedContinuation && reachablePrefix.includes('memory-050');
    const viewedCardIds = validViewedCardIds
      .filter((id) => !blockedByUnlockDependency || reachableIds.has(id))
      .filter((id) => id !== 'memory-051' || continuationUnlocked);

    const storedLast = typeof parsed.lastCardId === 'string' ? parsed.lastCardId : null;
    const lastCardId = storedLast && reachablePrefix.includes(storedLast)
      ? storedLast
      : (reachablePrefix.at(-1) ?? null);

    return {
      contentVersion,
      viewedCardIds,
      lastCardId,
      continuationUnlocked,
    };
  } catch {
    return createProgress(contentVersion);
  }
}
