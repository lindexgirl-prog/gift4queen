import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { createElement, forwardRef, type ReactNode } from 'react';
import { afterEach, vi } from 'vitest';

afterEach(() => cleanup());

Object.defineProperty(window, 'scrollTo', { value: vi.fn(), writable: true });

vi.mock('motion/react', () => {
  const ignoredProps = new Set(['initial', 'animate', 'exit', 'transition', 'layout']);
  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) =>
        forwardRef<HTMLElement, Record<string, unknown> & { children?: ReactNode }>((props, ref) => {
          const domProps = Object.fromEntries(
            Object.entries(props).filter(([name]) => !ignoredProps.has(name)),
          );
          return createElement(tag, { ...domProps, ref });
        }),
    },
  );

  return {
    motion,
    AnimatePresence: ({ children }: { children: ReactNode }) => children,
  };
});
