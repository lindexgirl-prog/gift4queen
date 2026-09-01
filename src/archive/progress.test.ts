import { describe, expect, it } from 'vitest';
import type { MemoryCard } from '../data/archiveSchema';
import {
  createProgress,
  getAccessibleCardIds,
  markCardViewed,
  parseStoredProgress,
  revealContinuation,
} from './progress';

function card(id: string, order: number, unlock: MemoryCard['unlock'] = null): MemoryCard {
  return {
    id,
    number: order,
    order,
    chapterId: 'chapter',
    status: 'ready',
    title: id,
    text: id,
    coverImage: null,
    extraMedia: [],
    voiceMessage: null,
    route: null,
    effects: [],
    unlock,
    futureSlot: null,
  };
}

const sequence = [
  card('memory-001', 1),
  card('memory-002', 2),
  card('memory-050', 50),
  card('memory-051', 51, { type: 'after-card', cardId: 'memory-050' }),
  card('memory-052', 52, { type: 'after-card', cardId: 'memory-051' }),
];

describe('archive progress', () => {
  it('allows only the first unseen card in a sequential archive', () => {
    const progress = createProgress('v1');

    expect([...getAccessibleCardIds(sequence, progress)]).toEqual(['memory-001']);
  });

  it('opens the next card after the current card is viewed', () => {
    const progress = markCardViewed(createProgress('v1'), 'memory-001');

    expect([...getAccessibleCardIds(sequence, progress)]).toEqual(['memory-001', 'memory-002']);
  });

  it('keeps card 51 locked until the deliberate reveal action', () => {
    let progress = createProgress('v1');
    for (const id of ['memory-001', 'memory-002', 'memory-050']) {
      progress = markCardViewed(progress, id);
    }

    expect(getAccessibleCardIds(sequence, progress).has('memory-051')).toBe(false);

    progress = revealContinuation(progress, 'memory-050');

    expect(getAccessibleCardIds(sequence, progress).has('memory-051')).toBe(true);
  });

  it('unlocks future cards after card 51 is viewed', () => {
    let progress = revealContinuation(
      markCardViewed(
        markCardViewed(markCardViewed(createProgress('v1'), 'memory-001'), 'memory-002'),
        'memory-050',
      ),
      'memory-050',
    );
    progress = markCardViewed(progress, 'memory-051');

    expect(getAccessibleCardIds(sequence, progress).has('memory-052')).toBe(true);
  });

  it('restores only valid viewed ids from local storage data', () => {
    const restored = parseStoredProgress(
      JSON.stringify({
        contentVersion: 'old',
        viewedCardIds: ['memory-001', 'deleted-card'],
        lastCardId: 'deleted-card',
        continuationUnlocked: true,
      }),
      'new',
      sequence,
    );

    expect(restored).toEqual({
      contentVersion: 'new',
      viewedCardIds: ['memory-001'],
      lastCardId: 'memory-001',
      continuationUnlocked: false,
    });
  });

  it('rejects forged progress that tries to open card 51 directly', () => {
    const restored = parseStoredProgress(
      JSON.stringify({
        viewedCardIds: ['memory-051'],
        lastCardId: 'memory-051',
        continuationUnlocked: true,
      }),
      'v1',
      sequence,
    );

    expect(restored).toEqual(createProgress('v1'));
  });

  it('preserves viewed stable IDs when cards are reordered around an unseen card', () => {
    const unseen = card('memory-010', 10);
    const reordered = [sequence[0], unseen, sequence[1], sequence[2], sequence[3], sequence[4]];
    const restored = parseStoredProgress(
      JSON.stringify({
        viewedCardIds: ['memory-001', 'memory-002', 'memory-050'],
        lastCardId: 'memory-050',
        continuationUnlocked: false,
      }),
      'v2',
      reordered,
    );

    expect(restored.viewedCardIds).toEqual(['memory-001', 'memory-002', 'memory-050']);
    expect(restored.lastCardId).toBe('memory-001');
    expect([...getAccessibleCardIds(reordered, restored)]).toEqual(['memory-001', 'memory-010']);
  });

  it('rejects forged progress that violates a regular unlock dependency', () => {
    const lockedSequence = [
      card('a', 1),
      card('b', 2, { type: 'after-card', cardId: 'c' }),
      card('c', 3),
    ];
    const restored = parseStoredProgress(
      JSON.stringify({
        viewedCardIds: ['a', 'b', 'c'],
        lastCardId: 'c',
        continuationUnlocked: false,
      }),
      'v1',
      lockedSequence,
    );

    expect(restored.lastCardId).toBe('a');
    expect([...getAccessibleCardIds(lockedSequence, restored)]).toEqual(['a']);
  });
});
