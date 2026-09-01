import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VoiceMessage } from '../data/archiveSchema';
import { VoicePlayer } from './VoicePlayer';

const message: VoiceMessage = {
  enabled: true,
  audio: '/audio/card-50.mp3',
  title: 'Послушай это, когда закончишь',
  dedication: 'От меня — тебе',
  transcript: 'Мама, спасибо за всё.',
};

describe('VoicePlayer', () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
  });

  it('reveals the custom player and starts only after a user action', async () => {
    const user = userEvent.setup();
    render(<VoicePlayer message={message} />);

    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: message.title }));

    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
    expect(screen.getByRole('slider', { name: 'Позиция голосового сообщения' })).toBeInTheDocument();
    expect(screen.getByText(message.transcript)).toBeInTheDocument();
  });

  it('shows a quiet completion message when playback ends', async () => {
    const user = userEvent.setup();
    render(<VoicePlayer message={message} />);
    await user.click(screen.getByRole('button', { name: message.title }));

    fireEvent.ended(screen.getByTestId('voice-audio'));

    expect(screen.getByText('Это сообщение останется с нами.')).toBeInTheDocument();
  });

  it('explains when the audio file cannot be played', async () => {
    const user = userEvent.setup();
    render(<VoicePlayer message={message} />);
    await user.click(screen.getByRole('button', { name: message.title }));

    fireEvent.error(screen.getByTestId('voice-audio'));

    expect(screen.getByRole('alert')).toHaveTextContent('Не удалось открыть запись');
  });
});

