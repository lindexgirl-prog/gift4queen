import type { Archive, Chapter, MemoryCard } from '../data/archiveSchema';
import { parseArchive } from '../data/archiveSchema';

function nextNumber(values: number[]) {
  return Math.max(0, ...values) + 1;
}

function moveAt<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (index < 0 || target < 0 || target >= items.length) return items;
  const moved = [...items];
  [moved[index], moved[target]] = [moved[target], moved[index]];
  return moved;
}

export function addChapter(archive: Archive): Archive {
  const sequence = nextNumber(
    archive.chapters
      .map((chapter) => Number(chapter.id.match(/(\d+)$/)?.[1]))
      .filter(Number.isFinite),
  );
  const chapter: Chapter = {
    id: `chapter-${sequence}`,
    order: nextNumber(archive.chapters.map((item) => item.order)),
    title: `Новая глава ${sequence}`,
    subtitle: 'Добавьте короткое описание главы',
  };
  return { ...archive, chapters: [...archive.chapters, chapter] };
}

export function addCard(archive: Archive, chapterId: string): Archive {
  if (!archive.chapters.some((chapter) => chapter.id === chapterId)) {
    throw new Error(`Неизвестная глава: ${chapterId}`);
  }
  const number = nextNumber(archive.cards.map((item) => item.number));
  const sequence = nextNumber(
    archive.cards
      .map((item) => Number(item.id.match(/(\d+)$/)?.[1]))
      .filter(Number.isFinite),
  );
  const chapterCards = archive.cards.filter((item) => item.chapterId === chapterId);
  const card: MemoryCard = {
    id: `memory-${sequence.toString().padStart(3, '0')}`,
    number,
    order: nextNumber(chapterCards.map((item) => item.order)),
    chapterId,
    status: 'draft',
    title: `Новое воспоминание №${number}`,
    text: 'Добавьте сюда подтверждённую семейную историю.',
    coverImage: null,
    extraMedia: [],
    voiceMessage: null,
    route: null,
    effects: [],
    unlock: null,
    futureSlot: null,
  };
  return { ...archive, cards: [...archive.cards, card] };
}

export function moveChapter(archive: Archive, chapterId: string, direction: -1 | 1): Archive {
  const sorted = [...archive.chapters].sort((left, right) => left.order - right.order);
  const moved = moveAt(sorted, sorted.findIndex((chapter) => chapter.id === chapterId), direction)
    .map((chapter, index) => ({ ...chapter, order: index + 1 }));
  return { ...archive, chapters: moved };
}

export function moveCard(archive: Archive, cardId: string, direction: -1 | 1): Archive {
  const card = archive.cards.find((item) => item.id === cardId);
  if (!card) return archive;
  const chapterCards = archive.cards
    .filter((item) => item.chapterId === card.chapterId)
    .sort((left, right) => left.order - right.order);
  const moved = moveAt(chapterCards, chapterCards.findIndex((item) => item.id === cardId), direction)
    .map((item, index) => ({ ...item, order: index + 1 }));
  const movedById = new Map(moved.map((item) => [item.id, item]));
  const otherCards = archive.cards.filter((item) => item.chapterId !== card.chapterId);
  return { ...archive, cards: [...otherCards, ...moved].map((item) => movedById.get(item.id) ?? item) };
}

export function moveCardToChapter(archive: Archive, cardId: string, chapterId: string): Archive {
  const card = archive.cards.find((item) => item.id === cardId);
  if (!card || card.chapterId === chapterId) return archive;
  if (!archive.chapters.some((chapter) => chapter.id === chapterId)) {
    throw new Error(`Неизвестная глава: ${chapterId}`);
  }

  const oldChapterCards = archive.cards
    .filter((item) => item.chapterId === card.chapterId && item.id !== cardId)
    .sort((left, right) => left.order - right.order)
    .map((item, index) => ({ ...item, order: index + 1 }));
  const newChapterCards = [
    ...archive.cards
      .filter((item) => item.chapterId === chapterId)
      .sort((left, right) => left.order - right.order),
    { ...card, chapterId },
  ].map((item, index) => ({ ...item, order: index + 1 }));
  const updated = new Map(
    [...oldChapterCards, ...newChapterCards].map((item) => [item.id, item]),
  );

  return {
    ...archive,
    cards: archive.cards.map((item) => updated.get(item.id) ?? item),
  };
}

export function exportArchiveJson(archive: Archive): string {
  return `${JSON.stringify(parseArchive(archive), null, 2)}\n`;
}

export function parseImportedArchive(raw: string): Archive {
  return parseArchive(JSON.parse(raw));
}
