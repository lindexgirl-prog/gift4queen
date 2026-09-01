import { describe, expect, it } from 'vitest';
import type { Archive, MemoryCard } from '../data/archiveSchema';
import {
  addCard,
  addChapter,
  exportArchiveJson,
  moveCard,
  moveCardToChapter,
  moveChapter,
  parseImportedArchive,
} from './editorModel';

const card = (id: string, number: number, order: number, chapterId = 'chapter-1'): MemoryCard => ({
  id,
  number,
  order,
  chapterId,
  status: 'draft',
  title: `Карточка ${number}`,
  text: 'Черновик',
  coverImage: null,
  extraMedia: [],
  voiceMessage: null,
  route: null,
  effects: [],
  unlock: null,
  futureSlot: null,
});

const archive: Archive = {
  schemaVersion: 1,
  contentVersion: 'draft-1',
  meta: { title: 'Архив', intro: ['Вступление'], closing: ['Финал'], primaryCardCount: 50 },
  featuredVideo: null,
  chapters: [
    { id: 'chapter-1', order: 1, title: 'Первая глава' },
    { id: 'chapter-2', order: 2, title: 'Вторая глава' },
  ],
  cards: [card('memory-001', 1, 1), card('memory-002', 2, 2)],
};

describe('editor model', () => {
  it('adds chapters and cards with stable unique IDs', () => {
    const withChapter = addChapter(archive);
    const next = addCard(withChapter, 'chapter-3');

    expect(withChapter.chapters.at(-1)).toMatchObject({ id: 'chapter-3', order: 3 });
    expect(next.cards.at(-1)).toMatchObject({ id: 'memory-003', number: 3, chapterId: 'chapter-3' });
  });

  it('moves chapters and normalizes their order', () => {
    const moved = moveChapter(archive, 'chapter-2', -1);
    expect(moved.chapters.map(({ id, order }) => [id, order])).toEqual([
      ['chapter-2', 1],
      ['chapter-1', 2],
    ]);
  });

  it('moves cards only inside their chapter and normalizes order', () => {
    const moved = moveCard(archive, 'memory-002', -1);
    expect(moved.cards.map(({ id, order }) => [id, order])).toEqual([
      ['memory-002', 1],
      ['memory-001', 2],
    ]);
  });

  it('moves a card to another chapter and normalizes both chapters', () => {
    const moved = moveCardToChapter(archive, 'memory-001', 'chapter-2');

    expect(moved.cards.find((item) => item.id === 'memory-002')).toMatchObject({ chapterId: 'chapter-1', order: 1 });
    expect(moved.cards.find((item) => item.id === 'memory-001')).toMatchObject({ chapterId: 'chapter-2', order: 1 });
  });

  it('exports and imports without losing valid data', () => {
    const exported = exportArchiveJson(archive);
    expect(parseImportedArchive(exported)).toEqual(archive);
  });

  it('rejects malformed imported content', () => {
    expect(() => parseImportedArchive('{"schemaVersion": 2}')).toThrow();
  });
});
