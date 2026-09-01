import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { PROGRESS_STORAGE_KEY } from '../archive/progress';
import type { Archive, MemoryCard } from '../data/archiveSchema';
import { MomentsArchive } from './MomentsArchive';

function memory(id: string, number: number, imageAlt: string): MemoryCard {
  return {
    id,
    number,
    order: number,
    chapterId: 'chapter',
    status: 'ready',
    title: id,
    text: id,
    coverImage: {
      type: 'image',
      src: `/images/${id}.jpg`,
      alt: imageAlt,
    },
    extraMedia: [],
    voiceMessage: null,
    route: null,
    effects: [],
    unlock: null,
    futureSlot: null,
  };
}

const archive: Archive = {
  schemaVersion: 1,
  contentVersion: 'v1',
  meta: { title: 'Архив', intro: ['Интро'], closing: ['Финал'], primaryCardCount: 50 },
  featuredVideo: null,
  chapters: [{ id: 'chapter', order: 1, title: 'Глава' }],
  cards: [
    memory('memory-001', 1, 'Открытая фотография'),
    memory('memory-002', 2, 'Закрытая фотография'),
  ],
};

describe('MomentsArchive', () => {
  beforeEach(() => localStorage.clear());

  it('shows media only from viewed cards', () => {
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({
        contentVersion: 'v1',
        viewedCardIds: ['memory-001'],
        lastCardId: 'memory-001',
        continuationUnlocked: false,
      }),
    );

    render(<MomentsArchive archive={archive} />);

    expect(screen.getByRole('img', { name: 'Открытая фотография' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Закрытая фотография' })).not.toBeInTheDocument();
  });

  it('shows a helpful empty state before the first card is viewed', () => {
    render(<MomentsArchive archive={archive} />);

    expect(screen.getByText('Здесь появятся фотографии, видео и голоса из открытых карточек.')).toBeInTheDocument();
  });
});

