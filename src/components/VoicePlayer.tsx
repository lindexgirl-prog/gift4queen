import { Microphone, Pause, Play } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { VoiceMessage } from '../data/archiveSchema';

type VoicePlayerProps = {
  message: VoiceMessage;
};

type BrowserWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

function formatTime(value: number) {
  if (!Number.isFinite(value)) return '0:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function VoicePlayer({ message }: VoicePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!expanded || !audioRef.current) return;
    void audioRef.current.play().catch(() => {
      setError('Не удалось открыть запись. Проверьте файл в папке public/audio.');
    });
  }, [expanded]);

  useEffect(() => () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    void contextRef.current?.close();
  }, []);

  const drawVisualizer = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const values = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      analyser.getByteFrequencyData(values);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#a67c3f';
      const bars = 28;
      const gap = 4;
      const width = (canvas.width - gap * (bars - 1)) / bars;
      for (let index = 0; index < bars; index += 1) {
        const sample = values[Math.floor((index / bars) * values.length)] ?? 0;
        const height = Math.max(3, (sample / 255) * canvas.height);
        context.fillRect(index * (width + gap), (canvas.height - height) / 2, width, height);
      }
      animationRef.current = requestAnimationFrame(draw);
    };
    draw();
  };

  const startVisualizer = () => {
    const audio = audioRef.current;
    const browserWindow = window as BrowserWindow;
    const AudioContextConstructor = window.AudioContext ?? browserWindow.webkitAudioContext;
    if (!audio || !AudioContextConstructor || sourceRef.current) return;

    try {
      const audioContext = new AudioContextConstructor();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      const source = audioContext.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      sourceRef.current = source;
      analyserRef.current = analyser;
      contextRef.current = audioContext;
      drawVisualizer();
    } catch {
      // The range control remains a complete fallback when Web Audio is unavailable.
    }
  };

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!expanded) {
      setExpanded(true);
      return;
    }
    if (!audio) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  };

  const seek = (value: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = value;
    setElapsed(value);
  };

  return (
    <section className="voice-message" aria-label="Голосовое воспоминание">
      <audio
        ref={audioRef}
        data-testid="voice-audio"
        src={message.audio}
        preload="metadata"
        onPlay={() => { setIsPlaying(true); startVisualizer(); }}
        onPause={() => setIsPlaying(false)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => setElapsed(event.currentTarget.currentTime)}
        onEnded={() => { setIsPlaying(false); setCompleted(true); }}
        onError={() => setError('Не удалось открыть запись. Проверьте файл в папке public/audio.')}
      >
        <track kind="captions" />
      </audio>

      <button className="voice-trigger" type="button" onClick={togglePlayback} aria-label={expanded ? (isPlaying ? 'Пауза' : 'Продолжить') : message.title}>
        <span className="voice-icon" aria-hidden="true">
          {expanded ? (isPlaying ? <Pause size={22} weight="fill" /> : <Play size={22} weight="fill" />) : <Microphone size={24} weight="light" />}
        </span>
        <span>
          <strong>{message.title}</strong>
          <small>{message.dedication}</small>
        </span>
      </button>

      {expanded && (
        <motion.div className="voice-controls" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
          <canvas ref={canvasRef} className="waveform" width="420" height="46" aria-hidden="true" />
          <div className="voice-timeline">
            <span>{formatTime(elapsed)}</span>
            <input
              aria-label="Позиция голосового сообщения"
              type="range"
              min="0"
              max={Math.max(0, duration)}
              step="0.1"
              value={Math.min(elapsed, duration || 0)}
              onChange={(event) => seek(Number(event.target.value))}
            />
            <span>{formatTime(duration)}</span>
          </div>
          <details>
            <summary>Расшифровка сообщения</summary>
            <p>{message.transcript}</p>
          </details>
        </motion.div>
      )}

      {completed && <motion.p className="voice-complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Это сообщение останется с нами.</motion.p>}
      {error && <p className="media-error" role="alert">{error}</p>}
    </section>
  );
}

