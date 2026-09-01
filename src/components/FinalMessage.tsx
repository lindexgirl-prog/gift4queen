import { Sparkle } from '@phosphor-icons/react';

type FinalMessageProps = {
  lines: string[];
  onRestart: () => void;
};

export function FinalMessage({ lines, onRestart }: FinalMessageProps) {
  return (
    <main className="closing-screen">
      <Sparkle size={28} weight="light" />
      {lines.map((line) => <p key={line}>{line}</p>)}
      <button className="secondary-button" type="button" onClick={onRestart}>
        Вернуться к началу
      </button>
    </main>
  );
}
