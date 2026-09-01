import { z } from 'zod';

const nonEmptyText = z.string().trim().min(1);
const mediaPath = (folder: 'images' | 'audio' | 'video') => nonEmptyText.refine(
  (value) => value.startsWith(`/${folder}/`) && !value.includes('\\') && !value.split('/').includes('..'),
  `Файл должен находиться в /${folder}.`,
);
const imagePath = mediaPath('images');
const audioPath = mediaPath('audio');
const videoPath = mediaPath('video');

export const imageMediaSchema = z.object({
  type: z.literal('image'),
  src: imagePath,
  alt: nonEmptyText,
  caption: z.string().trim().optional(),
});

export const videoMediaSchema = z.object({
  type: z.literal('video'),
  src: videoPath,
  poster: imagePath,
  caption: nonEmptyText,
  transcript: nonEmptyText,
});

export const voiceMessageSchema = z.object({
  enabled: z.boolean(),
  audio: audioPath,
  title: nonEmptyText,
  dedication: nonEmptyText,
  transcript: nonEmptyText,
});

export const routeDataSchema = z.object({
  label: nonEmptyText,
  mapImage: imagePath.optional(),
  points: z
    .array(
      z.object({
        x: z.number().min(0).max(100),
        y: z.number().min(0).max(100),
        label: nonEmptyText,
      }),
    )
    .min(2),
});

export const chapterSchema = z.object({
  id: nonEmptyText,
  order: z.number().int().positive(),
  title: nonEmptyText,
  subtitle: z.string().trim().optional(),
});

export const memoryCardSchema = z.object({
  id: nonEmptyText,
  number: z.number().int().positive(),
  order: z.number().int().positive(),
  chapterId: nonEmptyText,
  status: z.enum(['draft', 'ready']),
  title: nonEmptyText,
  subtitle: z.string().trim().optional(),
  year: z.string().trim().optional(),
  dateLabel: z.string().trim().optional(),
  location: z.string().trim().optional(),
  emotion: z.string().trim().optional(),
  text: nonEmptyText,
  coverImage: imageMediaSchema.nullable(),
  extraMedia: z.array(z.discriminatedUnion('type', [imageMediaSchema, videoMediaSchema])),
  voiceMessage: voiceMessageSchema.nullable(),
  route: routeDataSchema.nullable(),
  effects: z.array(z.enum(['vintage-photo', 'soft-particles'])),
  unlock: z
    .object({
      type: z.literal('after-card'),
      cardId: nonEmptyText,
    })
    .nullable(),
  futureSlot: z
    .object({
      label: nonEmptyText,
      image: imageMediaSchema.nullable(),
    })
    .nullable(),
});

const archiveShape = z.object({
  schemaVersion: z.literal(1),
  contentVersion: nonEmptyText,
  meta: z.object({
    title: nonEmptyText,
    intro: z.array(nonEmptyText).min(1),
    closing: z.array(nonEmptyText).min(1),
    primaryCardCount: z.literal(50),
  }),
  featuredVideo: videoMediaSchema.nullable(),
  chapters: z.array(chapterSchema).min(1),
  cards: z.array(memoryCardSchema).min(1),
});

export const archiveSchema = archiveShape.superRefine((archive, context) => {
  const chapterIds = new Set<string>();
  const cardIds = new Set<string>();
  const cardNumbers = new Set<number>();
  const chapterOrders = new Set<number>();
  const cardOrdersByChapter = new Set<string>();

  archive.chapters.forEach((chapter, index) => {
    if (chapterIds.has(chapter.id)) {
      context.addIssue({
        code: 'custom',
        path: ['chapters', index, 'id'],
        message: 'ID глав должны быть уникальными.',
      });
    }
    if (chapterOrders.has(chapter.order)) {
      context.addIssue({
        code: 'custom',
        path: ['chapters', index, 'order'],
        message: 'Порядок глав не должен повторяться.',
      });
    }
    chapterIds.add(chapter.id);
    chapterOrders.add(chapter.order);
  });

  archive.cards.forEach((card, index) => {
    if (cardIds.has(card.id)) {
      context.addIssue({
        code: 'custom',
        path: ['cards', index, 'id'],
        message: 'ID карточек должны быть уникальными.',
      });
    }
    if (cardNumbers.has(card.number)) {
      context.addIssue({
        code: 'custom',
        path: ['cards', index, 'number'],
        message: 'Номера карточек должны быть уникальными.',
      });
    }
    if (!chapterIds.has(card.chapterId)) {
      context.addIssue({
        code: 'custom',
        path: ['cards', index, 'chapterId'],
        message: `Карточка ссылается на неизвестную главу «${card.chapterId}».`,
      });
    }
    const orderKey = `${card.chapterId}:${card.order}`;
    if (cardOrdersByChapter.has(orderKey)) {
      context.addIssue({
        code: 'custom',
        path: ['cards', index, 'order'],
        message: 'Порядок карточек внутри главы не должен повторяться.',
      });
    }
    cardIds.add(card.id);
    cardNumbers.add(card.number);
    cardOrdersByChapter.add(orderKey);
  });

  archive.cards.forEach((card, index) => {
    if (card.unlock && !cardIds.has(card.unlock.cardId)) {
      context.addIssue({
        code: 'custom',
        path: ['cards', index, 'unlock', 'cardId'],
        message: `Правило открытия ссылается на неизвестную карточку «${card.unlock.cardId}».`,
      });
    }
  });
});

export type ImageMedia = z.infer<typeof imageMediaSchema>;
export type VideoMedia = z.infer<typeof videoMediaSchema>;
export type VoiceMessage = z.infer<typeof voiceMessageSchema>;
export type RouteData = z.infer<typeof routeDataSchema>;
export type Chapter = z.infer<typeof chapterSchema>;
export type MemoryCard = z.infer<typeof memoryCardSchema>;
export type Archive = z.infer<typeof archiveSchema>;
export type MediaKind = 'image' | 'audio' | 'video';
export type MediaReference = { path: string; kind: MediaKind };

export function parseArchive(input: unknown): Archive {
  return archiveSchema.parse(input);
}

export function sortArchiveCards(archive: Pick<Archive, 'chapters' | 'cards'>): MemoryCard[] {
  const chapterOrder = new Map(archive.chapters.map((chapter) => [chapter.id, chapter.order]));
  return [...archive.cards].sort((left, right) => {
    const chapterDifference = (chapterOrder.get(left.chapterId) ?? 0)
      - (chapterOrder.get(right.chapterId) ?? 0);
    return chapterDifference || left.order - right.order;
  });
}

export function collectMediaReferences(archive: Archive): MediaReference[] {
  const references = new Map<string, MediaKind>();
  const addImage = (image: ImageMedia | null | undefined) => {
    if (image) references.set(image.src, 'image');
  };
  const addVideo = (video: VideoMedia | null | undefined) => {
    if (!video) return;
    references.set(video.src, 'video');
    references.set(video.poster, 'image');
  };

  addVideo(archive.featuredVideo);
  archive.cards.forEach((card) => {
    addImage(card.coverImage);
    card.extraMedia.forEach((media) => {
      if (media.type === 'image') addImage(media);
      else addVideo(media);
    });
    if (card.voiceMessage) references.set(card.voiceMessage.audio, 'audio');
    if (card.route?.mapImage) references.set(card.route.mapImage, 'image');
    addImage(card.futureSlot?.image);
  });

  return [...references.entries()]
    .map(([path, kind]) => ({ path, kind }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

export function collectMediaPaths(archive: Archive): string[] {
  return collectMediaReferences(archive).map((reference) => reference.path);
}

export function getProductionIssues(archive: Archive): string[] {
  const orderedCards = sortArchiveCards(archive);
  const readyPrimaryCards = archive.cards.filter(
    (card) => card.number >= 1 && card.number <= 50 && card.status === 'ready',
  );
  const issues: string[] = [];

  if (readyPrimaryCards.length !== 50) {
    issues.push(
      `Ожидалось 50 готовых основных карточек, найдено ${readyPrimaryCards.length}.`,
    );
  }

  const finalPrimary = archive.cards.find((card) => card.id === 'memory-050');
  if (!finalPrimary || finalPrimary.number !== 50) {
    issues.push('Карточка №50 должна иметь ID memory-050 и номер 50.');
  }

  const continuation = archive.cards.find((card) => card.id === 'memory-051');
  if (
    !continuation
    || continuation.number !== 51
    || continuation.unlock?.type !== 'after-card'
    || continuation.unlock.cardId !== 'memory-050'
  ) {
    issues.push('Карточка №51 должна иметь ID memory-051, номер 51 и открываться после memory-050.');
  }

  const primarySequenceIsValid = orderedCards
    .slice(0, archive.meta.primaryCardCount)
    .every((card, index) => card.number === index + 1);
  if (!primarySequenceIsValid) {
    issues.push('Основные карточки должны следовать по порядку от №1 до №50.');
  }

  const reachablePrimaryIds = new Set<string>();
  const primaryCardsInOrder = orderedCards
    .filter((card) => card.number <= archive.meta.primaryCardCount)
    .slice(0, archive.meta.primaryCardCount);
  for (const card of primaryCardsInOrder) {
    if (card.unlock && !reachablePrimaryIds.has(card.unlock.cardId)) {
      issues.push(
        `Основную карточку №${card.number} невозможно открыть: правило unlock должно ссылаться на уже просмотренную карточку.`,
      );
      break;
    }
    reachablePrimaryIds.add(card.id);
  }

  const finalPrimaryIndex = orderedCards.findIndex((card) => card.id === 'memory-050');
  const continuationIndex = orderedCards.findIndex((card) => card.id === 'memory-051');
  if (continuationIndex !== finalPrimaryIndex + 1 || finalPrimaryIndex < 0) {
    issues.push('Карточка №51 должна следовать сразу после карточки №50.');
  }

  return issues;
}
