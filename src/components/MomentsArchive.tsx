import { Archive as ArchiveIcon, ArrowLeft, Microphone } from '@phosphor-icons/react';
import { PROGRESS_STORAGE_KEY, parseStoredProgress } from '../archive/progress';
import {
  sortArchiveCards,
  type Archive,
  type ImageMedia,
  type VideoMedia,
  type VoiceMessage,
} from '../data/archiveSchema';
import { Gallery } from './Gallery';
import { VideoSection } from './VideoSection';
import { VoicePlayer } from './VoicePlayer';

type MomentsArchiveProps = {
  archive: Archive;
};

type CollectedVoice = {
  cardId: string;
  cardTitle: string;
  message: VoiceMessage;
};

export function MomentsArchive({ archive }: MomentsArchiveProps) {
  const orderedCards = sortArchiveCards(archive);
  const progress = parseStoredProgress(
    typeof window === 'undefined' ? null : localStorage.getItem(PROGRESS_STORAGE_KEY),
    archive.contentVersion,
    orderedCards,
  );
  const viewedIds = new Set(progress.viewedCardIds);
  const images: ImageMedia[] = [];
  const videos: VideoMedia[] = [];
  const voices: CollectedVoice[] = [];

  archive.cards
    .filter((card) => viewedIds.has(card.id))
    .forEach((card) => {
      if (card.coverImage) images.push(card.coverImage);
      card.extraMedia.forEach((media) => {
        if (media.type === 'image') images.push(media);
        else videos.push(media);
      });
      if (card.voiceMessage?.enabled) {
        voices.push({ cardId: card.id, cardTitle: card.title, message: card.voiceMessage });
      }
    });

  const allPrimaryCardsViewed = archive.cards
    .filter((card) => card.number <= archive.meta.primaryCardCount)
    .every((card) => viewedIds.has(card.id));
  if (archive.featuredVideo && allPrimaryCardsViewed) videos.push(archive.featuredVideo);
  const isEmpty = images.length === 0 && videos.length === 0 && voices.length === 0;

  return (
    <main className="moments-page">
      <header className="page-heading">
        <a className="back-link" href="/"><ArrowLeft size={18} /> К истории</a>
        <span className="page-icon"><ArchiveIcon size={28} weight="light" /></span>
        <p className="eyebrow">Живой семейный архив</p>
        <h1>Моменты, которые я хочу сохранить</h1>
        <p>Здесь собираются фотографии, видео и голосовые сообщения из уже открытых страниц.</p>
      </header>

      {isEmpty ? (
        <section className="empty-archive">
          <ArchiveIcon size={38} weight="light" />
          <p>Здесь появятся фотографии, видео и голоса из открытых карточек.</p>
          <a className="primary-button" href="/">Открыть первую страницу</a>
        </section>
      ) : (
        <div className="moments-content">
          <Gallery images={images} />
          <VideoSection videos={videos} featured={allPrimaryCardsViewed && Boolean(archive.featuredVideo)} />
          {voices.length > 0 && (
            <section className="voice-collection" aria-labelledby="voice-collection-heading">
              <header>
                <Microphone size={24} weight="light" />
                <p className="section-kicker" id="voice-collection-heading">Голосовые воспоминания</p>
              </header>
              {voices.map(({ cardId, cardTitle, message }) => (
                <article key={`${cardId}-${message.audio}`}>
                  <p className="voice-source">{cardTitle}</p>
                  <VoicePlayer message={message} />
                </article>
              ))}
            </section>
          )}
        </div>
      )}
    </main>
  );
}
