import { describe, expect, it } from 'vitest';
import {
  archiveSchema,
  collectMediaPaths,
  getProductionIssues,
  parseArchive,
} from './archiveSchema';

const validArchive = {
  schemaVersion: 1,
  contentVersion: '2026-08-31',
  meta: {
    title: '50 моментов',
    intro: ['Мама, тебе 50 лет.'],
    closing: ['Спасибо за всё.'],
    primaryCardCount: 50,
  },
  featuredVideo: null,
  chapters: [
    {
      id: 'beginning',
      order: 1,
      title: 'Начало истории',
      subtitle: 'Первые страницы',
    },
  ],
  cards: [
    {
      id: 'memory-001',
      number: 1,
      order: 1,
      chapterId: 'beginning',
      status: 'draft',
      title: 'Мой первый дом',
      text: 'Текст будет подтверждён после анализа семейного архива.',
      coverImage: {
        type: 'image',
        src: '/images/card-01.jpg',
        alt: 'Описание семейной фотографии',
      },
      extraMedia: [
        {
          type: 'video',
          src: '/video/card-01.mp4',
          poster: '/images/card-01-poster.jpg',
          caption: 'Короткий семейный момент',
          transcript: 'Расшифровка видео.',
        },
      ],
      voiceMessage: {
        enabled: true,
        audio: '/audio/card-01.mp3',
        title: 'Послушать мои слова',
        dedication: 'От меня — тебе',
        transcript: 'Текст голосового сообщения.',
      },
      route: null,
      effects: ['vintage-photo'],
      unlock: null,
      futureSlot: null,
    },
  ],
} as const;

describe('archiveSchema', () => {
  it('parses a structurally valid archive', () => {
    const result = parseArchive(validArchive);

    expect(result.cards[0].id).toBe('memory-001');
  });

  it('rejects duplicate card identifiers', () => {
    const duplicate = {
      ...validArchive,
      cards: [validArchive.cards[0], { ...validArchive.cards[0] }],
    };

    const result = archiveSchema.safeParse(duplicate);

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.message.includes('ID карточек'))).toBe(true);
  });

  it('rejects cards linked to a missing chapter', () => {
    const broken = {
      ...validArchive,
      cards: [{ ...validArchive.cards[0], chapterId: 'missing' }],
    };

    const result = archiveSchema.safeParse(broken);

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.message.includes('неизвестную главу'))).toBe(true);
  });

  it('requires a transcript for an enabled voice message', () => {
    const broken = {
      ...validArchive,
      cards: [
        {
          ...validArchive.cards[0],
          voiceMessage: { ...validArchive.cards[0].voiceMessage, transcript: '' },
        },
      ],
    };

    expect(archiveSchema.safeParse(broken).success).toBe(false);
  });

  it('rejects duplicate card order inside one chapter', () => {
    const broken = {
      ...validArchive,
      cards: [
        validArchive.cards[0],
        { ...validArchive.cards[0], id: 'memory-002', number: 2 },
      ],
    };

    const result = archiveSchema.safeParse(broken);

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.message.includes('Порядок карточек'))).toBe(true);
  });

  it('rejects media paths that try to leave public folders', () => {
    const broken = {
      ...validArchive,
      cards: [{
        ...validArchive.cards[0],
        coverImage: { ...validArchive.cards[0].coverImage, src: '/images/../../secret.txt' },
      }],
    };

    expect(archiveSchema.safeParse(broken).success).toBe(false);
  });

  it('keeps the primary archive fixed at 50 cards', () => {
    const broken = { ...validArchive, meta: { ...validArchive.meta, primaryCardCount: 1 } };

    expect(archiveSchema.safeParse(broken).success).toBe(false);
  });

  it('requires each media type to use its own public folder', () => {
    const broken = {
      ...validArchive,
      cards: [{
        ...validArchive.cards[0],
        extraMedia: [{ ...validArchive.cards[0].extraMedia[0], src: '/images/not-a-video.mp4' }],
        voiceMessage: { ...validArchive.cards[0].voiceMessage, audio: '/video/not-a-voice.mp3' },
      }],
    };

    expect(archiveSchema.safeParse(broken).success).toBe(false);
  });
});

describe('archive production checks', () => {
  function productionArchive() {
    return parseArchive({
      schemaVersion: 1,
      contentVersion: 'release',
      meta: { title: 'Архив', intro: ['Вступление'], closing: ['Финал'], primaryCardCount: 50 },
      featuredVideo: null,
      chapters: [
        { id: 'continuation', order: 1, title: 'Продолжение' },
        { id: 'main', order: 2, title: 'Основная история' },
      ],
      cards: [
        {
          id: 'memory-051', number: 51, order: 1, chapterId: 'continuation', status: 'draft',
          title: 'Продолжение следует...', text: 'Будущая история', coverImage: null, extraMedia: [],
          voiceMessage: null, route: null, effects: [], unlock: { type: 'after-card', cardId: 'memory-050' },
          futureSlot: { label: 'Будущий снимок', image: null },
        },
        ...Array.from({ length: 50 }, (_, index) => ({
          id: `memory-${String(index + 1).padStart(3, '0')}`,
          number: index + 1,
          order: index + 1,
          chapterId: 'main',
          status: 'ready',
          title: `Карточка ${index + 1}`,
          text: 'Подтверждённая история',
          coverImage: null,
          extraMedia: [],
          voiceMessage: null,
          route: null,
          effects: [],
          unlock: null,
          futureSlot: null,
        })),
      ],
    });
  }

  it('collects every local media path once', () => {
    const archive = parseArchive(validArchive);

    expect(collectMediaPaths(archive)).toEqual([
      '/audio/card-01.mp3',
      '/images/card-01-poster.jpg',
      '/images/card-01.jpg',
      '/video/card-01.mp4',
    ]);
  });

  it('reports missing ready primary cards', () => {
    const archive = parseArchive(validArchive);

    expect(getProductionIssues(archive)).toContain(
      'Ожидалось 50 готовых основных карточек, найдено 0.',
    );
    expect(getProductionIssues(archive).some((issue) => issue.includes('Карточка №51'))).toBe(true);
  });

  it('rejects a continuation card placed before the 50-card story', () => {
    expect(getProductionIssues(productionArchive()).some((issue) => issue.includes('следовать сразу после'))).toBe(true);
  });

  it('rejects a primary card locked behind a later card', () => {
    const archive = productionArchive();
    archive.chapters = archive.chapters.map((chapter) => ({
      ...chapter,
      order: chapter.id === 'main' ? 1 : 2,
    }));
    archive.cards = archive.cards.map((card) => card.number === 2
      ? { ...card, unlock: { type: 'after-card' as const, cardId: 'memory-050' } }
      : card);

    expect(getProductionIssues(archive).some((issue) => issue.includes('невозможно открыть'))).toBe(true);
  });
});
