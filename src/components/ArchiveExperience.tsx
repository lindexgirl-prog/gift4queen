import { BookOpen } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import {
  createProgress,
  getAccessibleCardIds,
  markCardViewed,
  parseStoredProgress,
  PROGRESS_STORAGE_KEY,
  revealContinuation,
  type ArchiveProgress,
} from '../archive/progress';
import { sortArchiveCards, type Archive } from '../data/archiveSchema';
import { Card } from './Card';
import { FinalMessage } from './FinalMessage';

type ArchiveExperienceProps = {
  archive: Archive;
};

export function ArchiveExperience({ archive }: ArchiveExperienceProps) {
  const cards = useMemo(() => sortArchiveCards(archive), [archive]);
  const [progress, setProgress] = useState<ArchiveProgress>(() => {
    if (typeof window === 'undefined') return createProgress(archive.contentVersion);
    return parseStoredProgress(localStorage.getItem(PROGRESS_STORAGE_KEY), archive.contentVersion, cards);
  });
  const [started, setStarted] = useState(false);
  const [showContinuationReveal, setShowContinuationReveal] = useState(false);
  const [chapterRevealId, setChapterRevealId] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const initialAccessibleCardIds = getAccessibleCardIds(cards, progress);
  const restoredIndex = cards.findIndex(
    (card) => card.id === progress.lastCardId && initialAccessibleCardIds.has(card.id),
  );
  const initialIndex = restoredIndex >= 0
    ? restoredIndex
    : cards.findIndex((card) => initialAccessibleCardIds.has(card.id));
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const currentCard = currentIndex >= 0 ? cards[currentIndex] : undefined;

  useEffect(() => {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  useEffect(() => {
    if (currentIndex < 0) return;
    const nextCard = cards[currentIndex + 1];
    const nextImage = nextCard?.futureSlot?.image ?? nextCard?.coverImage;
    if (!nextCard) return;
    const image = new Image();
    image.src = nextImage?.src ?? (nextCard.futureSlot ? '/images/future-memory.png' : '');
  }, [cards, currentIndex]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [currentIndex, chapterRevealId]);

  if (!started) {
    return (
      <main className="intro-screen">
        <motion.div
          className="intro-card"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
        >
          <span className="intro-mark"><BookOpen size={26} weight="light" /></span>
          <p className="eyebrow">Цифровой семейный архив</p>
          <h1>{archive.meta.title}</h1>
          <div className="intro-lines">
            {archive.meta.intro.map((line) => <p key={line}>{line}</p>)}
          </div>
          <button className="primary-button" type="button" onClick={() => setStarted(true)}>
            {progress.viewedCardIds.length ? 'Продолжить историю' : 'Открыть первую страницу'}
          </button>
          <p className="intro-footnote">С любовью. Только для нашей семьи.</p>
        </motion.div>
      </main>
    );
  }

  if (finished) {
    return (
      <FinalMessage
        lines={archive.meta.closing}
        onRestart={() => { setCurrentIndex(0); setFinished(false); }}
      />
    );
  }

  if (chapterRevealId) {
    const nextChapter = archive.chapters.find((chapter) => chapter.id === chapterRevealId);
    return (
      <main className="chapter-screen">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="eyebrow">Новая глава</p>
          <span className="chapter-number">{String(nextChapter?.order ?? '').padStart(2, '0')}</span>
          <h1>{nextChapter?.title}</h1>
          {nextChapter?.subtitle && <p>{nextChapter.subtitle}</p>}
          <button className="primary-button" type="button" onClick={() => setChapterRevealId(null)}>
            Открыть главу
          </button>
        </motion.div>
      </main>
    );
  }

  if (!currentCard) {
    return (
      <main className="archive-error">
        <div>
          <p className="eyebrow">Проверка структуры</p>
          <h1>Архив временно недоступен</h1>
          <p>Проверьте порядок карточек и правила их открытия в редакторе.</p>
        </div>
      </main>
    );
  }

  const moveForward = () => {
    const nextProgress = markCardViewed(progress, currentCard.id);
    setProgress(nextProgress);

    if (currentCard.number === archive.meta.primaryCardCount) {
      setShowContinuationReveal(true);
      return;
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex >= cards.length) {
      setFinished(true);
      return;
    }

    const accessible = getAccessibleCardIds(cards, nextProgress);
    if (accessible.has(cards[nextIndex].id)) {
      if (cards[nextIndex].chapterId !== currentCard.chapterId) {
        setChapterRevealId(cards[nextIndex].chapterId);
      }
      setCurrentIndex(nextIndex);
    }
  };

  const openContinuation = () => {
    const nextProgress = revealContinuation(progress, currentCard.id);
    setProgress(nextProgress);
    setShowContinuationReveal(false);
    const nextIndex = cards.findIndex((card) => card.id === 'memory-051');
    if (nextIndex >= 0 && getAccessibleCardIds(cards, nextProgress).has('memory-051')) {
      setCurrentIndex(nextIndex);
    }
  };

  const chapter = archive.chapters.find((item) => item.id === currentCard.chapterId);

  return (
    <main className="archive-stage">
      <div className="archive-progress" aria-label={`Просмотрено ${progress.viewedCardIds.length} страниц`}>
        <span style={{ width: `${Math.min(100, (progress.viewedCardIds.length / archive.meta.primaryCardCount) * 100)}%` }} />
      </div>
      <AnimatePresence mode="wait">
        <Card
          key={currentCard.id}
          card={currentCard}
          chapter={chapter}
          canGoBack={currentIndex > 0}
          onBack={() => setCurrentIndex((index) => Math.max(0, index - 1))}
          onNext={moveForward}
          isLastPrimary={currentCard.number === archive.meta.primaryCardCount}
          isLastCard={currentIndex === cards.length - 1}
        />
      </AnimatePresence>

      <AnimatePresence>
        {showContinuationReveal && (
          <motion.div className="continuation-reveal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div>
              <p>Ты посмотрела всю историю...</p>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                Но есть ещё одна страница.
              </motion.p>
              <button className="light-button" type="button" onClick={openContinuation}>
                Открыть ещё одну страницу
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
