import { FilmStrip } from '@phosphor-icons/react';
import { useState } from 'react';
import type { VideoMedia } from '../data/archiveSchema';

type VideoSectionProps = {
  videos: VideoMedia[];
  featured?: boolean;
};

export function VideoSection({ videos, featured = false }: VideoSectionProps) {
  const [failedSources, setFailedSources] = useState<string[]>([]);
  if (!videos.length) return null;

  return (
    <section className={featured ? 'video-section featured-video' : 'video-section'} aria-labelledby={featured ? 'featured-video-heading' : undefined}>
      {featured && (
        <header>
          <FilmStrip size={25} weight="light" />
          <p className="section-kicker" id="featured-video-heading">Видео-поздравление</p>
        </header>
      )}
      {videos.map((video) => (
        <figure key={video.src}>
          <video
            aria-label={video.caption}
            src={video.src}
            poster={video.poster}
            controls
            preload="metadata"
            playsInline
            onError={() => setFailedSources((items) => [...new Set([...items, video.src])])}
          >
            <track kind="captions" />
          </video>
          <figcaption>{video.caption}</figcaption>
          <details>
            <summary>Расшифровка видео</summary>
            <p>{video.transcript}</p>
          </details>
          {failedSources.includes(video.src) && (
            <p className="media-error" role="alert">Видео пока недоступно. Проверьте файл в public/video.</p>
          )}
        </figure>
      ))}
    </section>
  );
}

