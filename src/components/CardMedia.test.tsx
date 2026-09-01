import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { ImageMedia, RouteData, VideoMedia } from '../data/archiveSchema';
import { Gallery } from './Gallery';
import { RouteMap } from './RouteMap';
import { VideoSection } from './VideoSection';

const image: ImageMedia = {
  type: 'image',
  src: '/images/moment.jpg',
  alt: 'Семейный момент на прогулке',
  caption: 'Подпись к фотографии',
};

const video: VideoMedia = {
  type: 'video',
  src: '/video/moment.mp4',
  poster: '/images/moment-poster.jpg',
  caption: 'Короткий семейный ролик',
  transcript: 'Расшифровка семейного ролика.',
};

const route: RouteData = {
  label: 'Наш маршрут',
  points: [
    { x: 10, y: 75, label: 'Дом' },
    { x: 50, y: 35, label: 'Остановка' },
    { x: 90, y: 60, label: 'Море' },
  ],
};

describe('card media', () => {
  it('renders an accessible additional-photo gallery', () => {
    render(<Gallery images={[image]} />);

    expect(screen.getByRole('img', { name: image.alt })).toBeInTheDocument();
    expect(screen.getByText(image.caption ?? '')).toBeInTheDocument();
  });

  it('traps modal focus and restores it to the gallery trigger', async () => {
    const user = userEvent.setup();
    const existingInertElement = document.createElement('aside');
    existingInertElement.inert = true;
    document.body.append(existingInertElement);
    render(<Gallery images={[image]} />);
    const trigger = screen.getByRole('button', { name: `Открыть фотографию: ${image.alt}` });

    await user.click(trigger);
    const close = screen.getByRole('button', { name: 'Закрыть фотографию' });
    expect(close).toHaveFocus();

    await user.tab();
    expect(close).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
    expect(existingInertElement.inert).toBe(true);
    existingInertElement.remove();
  });

  it('renders a short video with its transcript', () => {
    render(<VideoSection videos={[video]} />);

    expect(screen.getByLabelText(video.caption)).toHaveAttribute('poster', video.poster);
    expect(screen.getByText(video.transcript)).toBeInTheDocument();
  });

  it('renders every named point on a local route map', () => {
    render(<RouteMap route={route} />);

    expect(screen.getByRole('img', { name: route.label })).toBeInTheDocument();
    expect(screen.getByText('Дом')).toBeInTheDocument();
    expect(screen.getByText('Море')).toBeInTheDocument();
  });
});
