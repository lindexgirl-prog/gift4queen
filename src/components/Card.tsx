import { ArrowLeft, ArrowRight, MapPin, Sparkle } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import type { Chapter, MemoryCard } from '../data/archiveSchema';
import { Gallery } from './Gallery';
import { RouteMap } from './RouteMap';
import { VideoSection } from './VideoSection';
import { VoicePlayer } from './VoicePlayer';

type CardProps = {
  card: MemoryCard;
  chapter?: Chapter;
  canGoBack: boolean;
  onBack: () => void;
  onNext: () => void;
  isLastPrimary: boolean;
  isLastCard: boolean;
};

export function Card({
  card,
  chapter,
  canGoBack,
  onBack,
  onNext,
  isLastPrimary,
  isLastCard,
}: CardProps) {
  const image = card.futureSlot?.image ?? card.coverImage;
  const usesFutureFrame = Boolean(card.futureSlot && !card.futureSlot.image);

  return (
    <motion.article
      className="memory-card"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="card-heading">
        <p className="eyebrow">{chapter?.title ?? 'Семейный архив'}</p>
        <div className="card-number" aria-label={`Карточка ${card.number}`}>
          {String(card.number).padStart(2, '0')}
        </div>
        <div className="gold-rule" aria-hidden="true" />
        <h1>{card.title}</h1>
        {card.subtitle && <p className="card-subtitle">{card.subtitle}</p>}
      </header>

      {card.effects.includes('soft-particles') && (
        <div className="soft-sparkles" aria-hidden="true">
          <Sparkle size={18} weight="fill" />
          <Sparkle size={12} weight="fill" />
          <Sparkle size={15} weight="fill" />
        </div>
      )}

      <div className={`polaroid ${card.effects.includes('vintage-photo') ? 'is-vintage' : ''}`}>
        {image ? (
          <img src={image.src} alt={image.alt} loading="eager" />
        ) : (
          <img
            src="/images/future-memory.png"
            alt="Пустая архивная рамка для будущей семейной фотографии"
            loading="eager"
          />
        )}
        <p className="polaroid-caption">
          {usesFutureFrame
            ? card.futureSlot?.label
            : (image?.caption ?? 'Фотография будет добавлена после утверждения материалов')}
        </p>
      </div>

      <div className="card-copy">
        <p>{card.text}</p>
        <div className="card-meta" aria-label="Детали воспоминания">
          {card.dateLabel && <span>{card.dateLabel}</span>}
          {card.year && <span>{card.year}</span>}
          {card.location && (
            <span><MapPin size={15} weight="light" />{card.location}</span>
          )}
        </div>
      </div>

      {card.route && <RouteMap route={card.route} />}
      <Gallery images={card.extraMedia.filter((media) => media.type === 'image')} />
      <VideoSection videos={card.extraMedia.filter((media) => media.type === 'video')} />
      {card.voiceMessage?.enabled && <VoicePlayer message={card.voiceMessage} />}

      <nav className="card-actions" aria-label="Навигация по истории">
        <button className="icon-button" type="button" onClick={onBack} disabled={!canGoBack} aria-label="Предыдущая страница">
          <ArrowLeft size={22} weight="light" />
        </button>
        <button className="primary-button" type="button" onClick={onNext}>
          {isLastPrimary
            ? 'Перевернуть последнюю страницу'
            : isLastCard
              ? 'Завершить чтение'
              : 'Следующая страница'}
          {!isLastCard && <ArrowRight size={18} weight="light" />}
        </button>
      </nav>
    </motion.article>
  );
}
