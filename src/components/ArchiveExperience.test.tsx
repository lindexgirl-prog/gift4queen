import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Archive, MemoryCard } from '../data/archiveSchema';
import { ArchiveExperience } from './ArchiveExperience';

function card(
  id: string,
  number: number,
  title: string,
  unlock: MemoryCard['unlock'] = null,
  futureSlot: MemoryCard['futureSlot'] = null,
): MemoryCard {
  return {
    id,
    number,
    order: number,
    chapterId: number === 1 ? 'beginning' : 'new-chapter',
    status: 'ready',
    title,
    text: `Текст карточки ${number}`,
    coverImage: null,
    extraMedia: [],
    voiceMessage: null,
    route: null,
    effects: [],
    unlock,
    futureSlot,
  };
}

const archive: Archive = {
  schemaVersion: 1,
  contentVersion: 'test-v1',
  meta: {
    title: '50 моментов, за которые я тебя люблю',
    intro: ['Мама, тебе 50 лет.', 'Спасибо за первые 18 лет моей жизни.'],
    closing: ['Спасибо за всё.'],
    primaryCardCount: 50,
  },
  featuredVideo: null,
  chapters: [
    { id: 'beginning', order: 1, title: 'Начало истории' },
    { id: 'new-chapter', order: 2, title: 'Новая глава' },
  ],
  cards: [
    card('memory-001', 1, 'Первая страница'),
    card('memory-050', 50, 'Даже когда я стану взрослым'),
    card(
      'memory-051',
      51,
      'Продолжение следует...',
      { type: 'after-card', cardId: 'memory-050' },
      { label: 'Здесь будет наше следующее воспоминание', image: null },
    ),
  ],
};

describe('ArchiveExperience', () => {
  beforeEach(() => localStorage.clear());

  it('keeps editorial draft and emotion labels out of the family view', async () => {
    const user = userEvent.setup();
    const familyArchive: Archive = {
      ...archive,
      cards: [
        { ...archive.cards[0], status: 'draft', emotion: 'редакторская пометка' },
        ...archive.cards.slice(1),
      ],
    };

    render(<ArchiveExperience archive={familyArchive} />);
    await user.click(screen.getByRole('button', { name: 'Открыть первую страницу' }));

    expect(screen.queryByText('Черновик — текст и фотография ждут подтверждения')).not.toBeInTheDocument();
    expect(screen.queryByText('редакторская пометка')).not.toBeInTheDocument();
  });

  it('opens the archive from the intro and advances sequentially', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ArchiveExperience archive={archive} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Мама, тебе 50 лет.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Открыть первую страницу' }));
    expect(screen.getByRole('heading', { name: 'Первая страница' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Следующая страница' }));
    await user.click(screen.getByRole('button', { name: 'Открыть главу' }));

    expect(await screen.findByRole('heading', { name: 'Даже когда я стану взрослым' })).toBeInTheDocument();
    expect(screen.queryByText('Продолжение следует...')).not.toBeInTheDocument();
  });

  it('reveals card 51 only through the final-page action', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ArchiveExperience archive={archive} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Открыть первую страницу' }));
    await user.click(screen.getByRole('button', { name: 'Следующая страница' }));
    await user.click(screen.getByRole('button', { name: 'Открыть главу' }));
    await user.click(screen.getByRole('button', { name: 'Перевернуть последнюю страницу' }));

    expect(screen.getByText('Ты посмотрела всю историю...')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Открыть ещё одну страницу' }));

    expect(screen.getByRole('heading', { name: 'Продолжение следует...' })).toBeInTheDocument();
    expect(screen.getByText('Здесь будет наше следующее воспоминание')).toBeInTheDocument();
  });

  it('does not render a locked card when archive order is invalid', async () => {
    const user = userEvent.setup();
    const invalidOrder: Archive = {
      ...archive,
      chapters: [
        { id: 'new-chapter', order: 1, title: 'Новая глава' },
        { id: 'beginning', order: 2, title: 'Начало истории' },
      ],
      cards: [
        archive.cards[0],
        { ...archive.cards[1], order: 2 },
        { ...archive.cards[2], order: 1 },
      ],
    };
    render(<ArchiveExperience archive={invalidOrder} />);

    await user.click(screen.getByRole('button', { name: 'Открыть первую страницу' }));

    expect(screen.getByText('Архив временно недоступен')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Продолжение следует...' })).not.toBeInTheDocument();
  });
});
