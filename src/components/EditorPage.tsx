import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  DownloadSimple,
  FileArrowUp,
  FloppyDisk,
  Plus,
} from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';
import type { Archive, MemoryCard } from '../data/archiveSchema';
import { archiveSchema, memoryCardSchema, parseArchive } from '../data/archiveSchema';
import {
  addCard,
  addChapter,
  exportArchiveJson,
  moveCard,
  moveCardToChapter,
  moveChapter,
  parseImportedArchive,
} from '../editor/editorModel';

export const EDITOR_DRAFT_KEY = 'family-archive:editor-draft';

type EditorPageProps = {
  initialArchive: Archive;
};

function errorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'issues' in error) {
    const issues = (error as { issues?: Array<{ message?: string }> }).issues;
    if (issues?.[0]?.message) return issues[0].message;
  }
  return error instanceof Error ? error.message : 'Неизвестная ошибка.';
}

type LoadedDraft = { archive: Archive; issue: string };

function isRecoverableDraft(input: unknown): input is Archive {
  if (!input || typeof input !== 'object') return false;
  const candidate = input as Partial<Archive>;
  return candidate.schemaVersion === 1
    && typeof candidate.contentVersion === 'string'
    && Boolean(candidate.meta && typeof candidate.meta.title === 'string')
    && Array.isArray(candidate.meta?.intro)
    && Array.isArray(candidate.meta?.closing)
    && Array.isArray(candidate.chapters)
    && candidate.chapters.every((chapter) => (
      chapter && typeof chapter.id === 'string' && typeof chapter.title === 'string' && typeof chapter.order === 'number'
    ))
    && Array.isArray(candidate.cards)
    && candidate.cards.every((card) => (
      card
      && typeof card.id === 'string'
      && typeof card.number === 'number'
      && typeof card.order === 'number'
      && typeof card.chapterId === 'string'
      && typeof card.title === 'string'
      && typeof card.text === 'string'
      && Array.isArray(card.extraMedia)
      && Array.isArray(card.effects)
    ));
}

function loadDraft(initialArchive: Archive): LoadedDraft {
  if (typeof window === 'undefined') return { archive: initialArchive, issue: '' };
  const raw = localStorage.getItem(`${EDITOR_DRAFT_KEY}:${initialArchive.contentVersion}`);
  if (!raw) return { archive: initialArchive, issue: '' };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecoverableDraft(parsed)) {
      return {
        archive: initialArchive,
        issue: 'Локальный черновик повреждён и не может быть безопасно открыт. Исходный archive.json не изменён.',
      };
    }
    const validation = archiveSchema.safeParse(parsed);
    return {
      archive: parsed,
      issue: validation.success
        ? ''
        : 'Локальный черновик восстановлен, но пока содержит ошибки. Исправьте их перед экспортом.',
    };
  } catch {
    return {
      archive: initialArchive,
      issue: 'Локальный черновик повреждён и не может быть прочитан. Исходный archive.json не изменён.',
    };
  }
}

export function EditorPage({ initialArchive }: EditorPageProps) {
  const [loadedDraft] = useState<LoadedDraft>(() => loadDraft(initialArchive));
  const [draft, setDraft] = useState<Archive>(loadedDraft.archive);
  const [selectedChapterId, setSelectedChapterId] = useState(draft.chapters[0]?.id ?? '');
  const [selectedCardId, setSelectedCardId] = useState(draft.cards[0]?.id ?? '');
  const [importText, setImportText] = useState('');
  const [advancedText, setAdvancedText] = useState(() => JSON.stringify(draft.cards[0] ?? {}, null, 2));
  const [notice, setNotice] = useState('');
  const [error, setError] = useState(loadedDraft.issue);

  const chapters = useMemo(
    () => [...draft.chapters].sort((left, right) => left.order - right.order),
    [draft.chapters],
  );
  const selectedCard = draft.cards.find((card) => card.id === selectedCardId) ?? draft.cards[0];
  const cards = useMemo(() => {
    const chapterOrder = new Map(draft.chapters.map((chapter) => [chapter.id, chapter.order]));
    return [...draft.cards].sort((left, right) => {
      const chapterDifference = (chapterOrder.get(left.chapterId) ?? 0) - (chapterOrder.get(right.chapterId) ?? 0);
      return chapterDifference || left.order - right.order;
    });
  }, [draft.cards, draft.chapters]);

  useEffect(() => {
    localStorage.setItem(`${EDITOR_DRAFT_KEY}:${initialArchive.contentVersion}`, JSON.stringify(draft));
  }, [draft, initialArchive.contentVersion]);

  const applyLocalDraft = (candidate: Archive, successMessage: string) => {
    setDraft(candidate);
    const validation = archiveSchema.safeParse(candidate);
    if (validation.success) {
      setError('');
      setNotice(successMessage);
      return;
    }
    setNotice('');
    setError(`Локальный черновик пока содержит ошибки: ${validation.error.issues[0]?.message ?? 'проверьте данные.'}`);
  };

  const replaceCard = (cardId: string, patch: Partial<MemoryCard>) => {
    const updated = selectedCard?.id === cardId ? { ...selectedCard, ...patch } : null;
    const candidate = {
      ...draft,
      cards: draft.cards.map((card) => card.id === cardId ? { ...card, ...patch } : card),
    };
    applyLocalDraft(candidate, 'Черновик сохранён локально.');
    if (updated) setAdvancedText(JSON.stringify(updated, null, 2));
  };

  const handleAddChapter = () => {
    const next = addChapter(draft);
    setDraft(next);
    setSelectedChapterId(next.chapters.at(-1)?.id ?? selectedChapterId);
    setNotice('Новая глава добавлена в черновик.');
  };

  const handleAddCard = () => {
    const chapterId = selectedChapterId || chapters[0]?.id;
    if (!chapterId) return;
    const next = addCard(draft, chapterId);
    setDraft(next);
    const addedCard = next.cards.at(-1);
    setSelectedCardId(addedCard?.id ?? selectedCardId);
    setAdvancedText(JSON.stringify(addedCard ?? {}, null, 2));
    setNotice('Новая карточка добавлена в черновик.');
  };

  const changeCardChapter = (cardId: string, chapterId: string) => {
    try {
      const next = moveCardToChapter(draft, cardId, chapterId);
      const movedCard = next.cards.find((card) => card.id === cardId);
      applyLocalDraft(next, 'Карточка перенесена, порядок обеих глав обновлён.');
      setSelectedChapterId(chapterId);
      if (movedCard) setAdvancedText(JSON.stringify(movedCard, null, 2));
    } catch (moveError) {
      setNotice('');
      setError(`Карточка не перенесена: ${errorMessage(moveError)}`);
    }
  };

  const applyImport = () => {
    try {
      const imported = parseImportedArchive(importText);
      setDraft(imported);
      setSelectedChapterId(imported.chapters[0]?.id ?? '');
      setSelectedCardId(imported.cards[0]?.id ?? '');
      setAdvancedText(JSON.stringify(imported.cards[0] ?? {}, null, 2));
      setError('');
      setNotice('JSON проверен и импортирован.');
    } catch (importError) {
      setNotice('');
      setError(`Импорт не выполнен: ${errorMessage(importError)}`);
    }
  };

  const readImportFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      setImportText(await file.text());
      setError('');
      setNotice('Файл прочитан. Нажмите «Импортировать JSON», чтобы проверить и применить его.');
    } catch (fileError) {
      setNotice('');
      setError(`Файл не прочитан: ${errorMessage(fileError)}`);
    }
  };

  const applyAdvancedCard = () => {
    if (!selectedCard) return;
    try {
      const parsedCard = memoryCardSchema.parse(JSON.parse(advancedText));
      const candidate = parseArchive({
        ...draft,
        cards: draft.cards.map((card) => card.id === selectedCard.id ? parsedCard : card),
      });
      setDraft(candidate);
      setSelectedCardId(parsedCard.id);
      setError('');
      setNotice('Все поля карточки обновлены.');
    } catch (advancedError) {
      setNotice('');
      setError(`Карточка не обновлена: ${errorMessage(advancedError)}`);
    }
  };

  const downloadJson = () => {
    try {
      const json = exportArchiveJson(draft);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'archive.json';
      link.click();
      URL.revokeObjectURL(url);
      setError('');
      setNotice('Проверенный archive.json экспортирован.');
    } catch (exportError) {
      setNotice('');
      setError(`Экспорт не выполнен: ${errorMessage(exportError)}`);
    }
  };

  return (
    <main className="editor-page">
      <header className="editor-header">
        <div>
          <a className="back-link" href="/"><ArrowLeft size={18} /> К архиву</a>
          <p className="eyebrow">Локальный режим</p>
          <h1>Редактор семейного архива</h1>
          <p>Изменения остаются в этом браузере, пока вы не экспортируете JSON.</p>
        </div>
        <button className="primary-button" type="button" onClick={downloadJson}>
          <DownloadSimple size={19} /> Экспортировать JSON
        </button>
      </header>

      {(notice || error) && (
        <p className={error ? 'editor-message error' : 'editor-message'} role={error ? 'alert' : 'status'}>
          {error || notice}
        </p>
      )}

      <section className="editor-meta panel">
        <h2>Общие тексты</h2>
        <label>
          Название архива
          <input value={draft.meta.title} onChange={(event) => setDraft((current) => ({ ...current, meta: { ...current.meta, title: event.target.value } }))} />
        </label>
        <label>
          Вступление — один абзац на строку
          <textarea value={draft.meta.intro.join('\n')} onChange={(event) => setDraft((current) => ({ ...current, meta: { ...current.meta, intro: event.target.value.split('\n') } }))} />
        </label>
        <label>
          Финальное сообщение — один абзац на строку
          <textarea value={draft.meta.closing.join('\n')} onChange={(event) => setDraft((current) => ({ ...current, meta: { ...current.meta, closing: event.target.value.split('\n') } }))} />
        </label>
      </section>

      <div className="editor-workspace">
        <aside className="editor-sidebar panel">
          <section>
            <div className="editor-section-heading">
              <h2>Главы</h2>
              <button type="button" className="icon-text-button" onClick={handleAddChapter}><Plus size={17} /> Добавить главу</button>
            </div>
            <div className="editor-list">
              {chapters.map((chapter) => (
                <div className={selectedChapterId === chapter.id ? 'editor-list-row selected' : 'editor-list-row'} data-testid="chapter-row" key={chapter.id}>
                  <button type="button" aria-label={`Выбрать главу ${chapter.title}`} onClick={() => setSelectedChapterId(chapter.id)}>
                    <small>Глава {chapter.order}</small>{chapter.title}
                  </button>
                  <span>
                    <button type="button" aria-label={`Поднять главу ${chapter.title}`} onClick={() => setDraft((current) => moveChapter(current, chapter.id, -1))}><ArrowUp size={15} /></button>
                    <button type="button" aria-label={`Опустить главу ${chapter.title}`} onClick={() => setDraft((current) => moveChapter(current, chapter.id, 1))}><ArrowDown size={15} /></button>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="editor-section-heading">
              <h2>Карточки</h2>
              <button type="button" className="icon-text-button" onClick={handleAddCard}><Plus size={17} /> Добавить карточку</button>
            </div>
            <div className="editor-list card-list">
              {cards.map((card) => (
                <div className={selectedCardId === card.id ? 'editor-list-row selected' : 'editor-list-row'} key={card.id}>
                  <button type="button" onClick={() => { setSelectedCardId(card.id); setSelectedChapterId(card.chapterId); setAdvancedText(JSON.stringify(card, null, 2)); }}>
                    <small>№{card.number} · {card.status === 'ready' ? 'готово' : 'черновик'}</small>{card.title}
                  </button>
                  <span>
                    <button type="button" aria-label={`Поднять карточку №${card.number}`} onClick={() => setDraft((current) => moveCard(current, card.id, -1))}><ArrowUp size={15} /></button>
                    <button type="button" aria-label={`Опустить карточку №${card.number}`} onClick={() => setDraft((current) => moveCard(current, card.id, 1))}><ArrowDown size={15} /></button>
                  </span>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <section className="editor-form panel">
          {selectedCard ? (
            <>
              <div className="editor-section-heading">
                <div><p className="eyebrow">Карточка №{selectedCard.number}</p><h2>{selectedCard.title}</h2></div>
                <span className={`status-chip ${selectedCard.status}`}>{selectedCard.status === 'ready' ? 'Готово' : 'Черновик'}</span>
              </div>

              <div className="field-grid">
                <label>
                  Название карточки
                  <input value={selectedCard.title} onChange={(event) => replaceCard(selectedCard.id, { title: event.target.value })} />
                </label>
                <label>
                  Статус
                  <select value={selectedCard.status} onChange={(event) => replaceCard(selectedCard.id, { status: event.target.value as MemoryCard['status'] })}>
                    <option value="draft">Черновик</option>
                    <option value="ready">Готово</option>
                  </select>
                </label>
                <label>
                  Глава
                  <select value={selectedCard.chapterId} onChange={(event) => changeCardChapter(selectedCard.id, event.target.value)}>
                    {chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}
                  </select>
                </label>
                <label>
                  Подзаголовок
                  <input value={selectedCard.subtitle ?? ''} onChange={(event) => replaceCard(selectedCard.id, { subtitle: event.target.value || undefined })} />
                </label>
                <label>
                  Год
                  <input value={selectedCard.year ?? ''} onChange={(event) => replaceCard(selectedCard.id, { year: event.target.value || undefined })} />
                </label>
                <label>
                  Подпись даты
                  <input value={selectedCard.dateLabel ?? ''} onChange={(event) => replaceCard(selectedCard.id, { dateLabel: event.target.value || undefined })} />
                </label>
                <label>
                  Место
                  <input value={selectedCard.location ?? ''} onChange={(event) => replaceCard(selectedCard.id, { location: event.target.value || undefined })} />
                </label>
                <label>
                  Эмоция
                  <input value={selectedCard.emotion ?? ''} onChange={(event) => replaceCard(selectedCard.id, { emotion: event.target.value || undefined })} />
                </label>
              </div>
              <label>
                Текст воспоминания
                <textarea rows={8} value={selectedCard.text} onChange={(event) => replaceCard(selectedCard.id, { text: event.target.value })} />
              </label>

              <fieldset>
                <legend>Основная фотография</legend>
                <label>
                  Путь, например /images/card-01.jpg
                  <input
                    value={selectedCard.coverImage?.src ?? ''}
                    onChange={(event) => replaceCard(selectedCard.id, {
                      coverImage: event.target.value ? { type: 'image', src: event.target.value, alt: selectedCard.coverImage?.alt || 'Опишите фотографию' } : null,
                    })}
                  />
                </label>
                <label>
                  Описание для доступности (alt)
                  <input
                    value={selectedCard.coverImage?.alt ?? ''}
                    disabled={!selectedCard.coverImage}
                    onChange={(event) => selectedCard.coverImage && replaceCard(selectedCard.id, { coverImage: { ...selectedCard.coverImage, alt: event.target.value } })}
                  />
                </label>
                {selectedCard.coverImage && <img className="editor-media-preview" src={selectedCard.coverImage.src} alt={selectedCard.coverImage.alt} />}
              </fieldset>

              <details className="advanced-editor" open>
                <summary>Все поля карточки: медиа, голос, маршрут и эффекты</summary>
                <p>Здесь доступен полный контракт. Пути к файлам начинаются с /images, /audio или /video.</p>
                <label>
                  Все поля выбранной карточки
                  <textarea rows={22} value={advancedText} onChange={(event) => setAdvancedText(event.target.value)} spellCheck="false" />
                </label>
                <button className="secondary-button" type="button" onClick={applyAdvancedCard}><FloppyDisk size={18} /> Применить все поля</button>
              </details>
            </>
          ) : <p>Добавьте первую карточку.</p>}
        </section>
      </div>

      <section className="import-panel panel">
        <div className="editor-section-heading">
          <div><p className="eyebrow">Перенос данных</p><h2>Импорт JSON</h2></div>
          <FileArrowUp size={26} weight="light" />
        </div>
        <p>Вставьте содержимое archive.json. Перед заменой черновика структура будет полностью проверена.</p>
        <label className="file-input-label">
          Выбрать archive.json с компьютера
          <input type="file" accept="application/json,.json" onChange={(event) => { void readImportFile(event.target.files?.[0]); }} />
        </label>
        <label>
          JSON для импорта
          <textarea rows={10} value={importText} onChange={(event) => setImportText(event.target.value)} spellCheck="false" />
        </label>
        <button className="secondary-button" type="button" onClick={applyImport}>Импортировать JSON</button>
      </section>
    </main>
  );
}
