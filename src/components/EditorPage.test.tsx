import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Archive } from '../data/archiveSchema';
import { EDITOR_DRAFT_KEY, EditorPage } from './EditorPage';

const archive: Archive = {
  schemaVersion: 1,
  contentVersion: 'editor-test',
  meta: { title: 'Архив', intro: ['Вступление'], closing: ['Финал'], primaryCardCount: 50 },
  featuredVideo: null,
  chapters: [
    { id: 'chapter-1', order: 1, title: 'Первая глава' },
    { id: 'chapter-2', order: 2, title: 'Вторая глава' },
  ],
  cards: [{
    id: 'memory-001',
    number: 1,
    order: 1,
    chapterId: 'chapter-1',
    status: 'draft',
    title: 'Старое название',
    text: 'Черновой текст',
    coverImage: null,
    extraMedia: [],
    voiceMessage: null,
    route: null,
    effects: [],
    unlock: null,
    futureSlot: null,
  }],
};

describe('EditorPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('edits a card and autosaves the draft locally', async () => {
    const user = userEvent.setup();
    render(<EditorPage initialArchive={archive} />);

    const title = screen.getByLabelText('Название карточки');
    await user.clear(title);
    await user.type(title, 'Новое название');

    await waitFor(() => {
      expect(localStorage.getItem(`${EDITOR_DRAFT_KEY}:editor-test`)).toContain('Новое название');
    });
  });

  it('adds and reorders chapters without changing code', async () => {
    const user = userEvent.setup();
    render(<EditorPage initialArchive={archive} />);

    await user.click(screen.getByRole('button', { name: 'Добавить главу' }));
    expect(screen.getByRole('button', { name: 'Выбрать главу Новая глава 3' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Выбрать главу Вторая глава' }));
    await user.click(screen.getByRole('button', { name: 'Поднять главу Вторая глава' }));
    expect(screen.getAllByTestId('chapter-row')[0]).toHaveTextContent('Вторая глава');
  });

  it('shows validation errors for invalid imported JSON', async () => {
    const user = userEvent.setup();
    render(<EditorPage initialArchive={archive} />);

    fireEvent.change(screen.getByLabelText('JSON для импорта'), { target: { value: '{"schemaVersion": 2}' } });
    await user.click(screen.getByRole('button', { name: 'Импортировать JSON' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Импорт не выполнен');
  });

  it('applies advanced JSON without losing nested card data', async () => {
    const user = userEvent.setup();
    render(<EditorPage initialArchive={archive} />);

    const advanced = screen.getByLabelText('Все поля выбранной карточки');
    const card = JSON.parse((advanced as HTMLTextAreaElement).value);
    card.voiceMessage = {
      enabled: true,
      audio: '/audio/message-01.mp3',
      title: 'Послушать',
      dedication: 'От меня — тебе',
      transcript: 'Текст сообщения',
    };
    fireEvent.change(advanced, { target: { value: JSON.stringify(card) } });
    await user.click(screen.getByRole('button', { name: 'Применить все поля' }));

    expect(screen.getByText('Все поля карточки обновлены.')).toBeInTheDocument();
    expect(localStorage.getItem(`${EDITOR_DRAFT_KEY}:editor-test`)).toContain('/audio/message-01.mp3');
  });

  it('restores a temporarily invalid local draft and keeps warning until it is valid', async () => {
    const user = userEvent.setup();
    const invalidDraft = {
      ...archive,
      cards: [{ ...archive.cards[0], title: '' }],
    };
    localStorage.setItem(`${EDITOR_DRAFT_KEY}:editor-test`, JSON.stringify(invalidDraft));

    render(<EditorPage initialArchive={archive} />);

    expect(screen.getByLabelText('Название карточки')).toHaveValue('');
    expect(screen.getByRole('alert')).toHaveTextContent('Локальный черновик восстановлен');

    await user.type(screen.getByLabelText('Подзаголовок'), 'Дополнение');
    expect(screen.getByRole('alert')).toHaveTextContent('пока содержит ошибки');

    await user.selectOptions(screen.getByLabelText('Глава'), 'chapter-2');
    expect(screen.getByRole('alert')).toHaveTextContent('пока содержит ошибки');
  });
});
