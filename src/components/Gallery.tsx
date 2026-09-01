import { X } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ImageMedia } from '../data/archiveSchema';

type GalleryProps = {
  images: ImageMedia[];
};

export function Gallery({ images }: GalleryProps) {
  const [selected, setSelected] = useState<ImageMedia | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!selected) return;
    const backgroundElements = [...document.body.children]
      .filter((element): element is HTMLElement => element instanceof HTMLElement && !element.classList.contains('lightbox'));
    const backgroundStates = backgroundElements.map((element) => ({
      element,
      inert: element.inert,
    }));
    const previousOverflow = document.body.style.overflow;
    backgroundElements.forEach((element) => { element.inert = true; });
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const keepFocusInDialog = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null);
      if (event.key === 'Tab') {
        event.preventDefault();
        closeButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', keepFocusInDialog);
    return () => {
      window.removeEventListener('keydown', keepFocusInDialog);
      backgroundStates.forEach(({ element, inert }) => { element.inert = inert; });
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus();
    };
  }, [selected]);

  if (!images.length) return null;

  return (
    <section className="media-section" aria-labelledby="gallery-heading">
      <p className="section-kicker" id="gallery-heading">Ещё несколько кадров</p>
      <div className="gallery-grid">
        {images.map((image) => (
          <figure key={image.src}>
            <button type="button" onClick={(event) => { triggerRef.current = event.currentTarget; setSelected(image); }} aria-label={`Открыть фотографию: ${image.alt}`}>
              <img src={image.src} alt={image.alt} loading="lazy" />
            </button>
            {image.caption && <figcaption>{image.caption}</figcaption>}
          </figure>
        ))}
      </div>

      {selected && createPortal(
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={selected.alt} onClick={() => setSelected(null)}>
          <button ref={closeButtonRef} className="lightbox-close" type="button" aria-label="Закрыть фотографию" onClick={() => setSelected(null)}>
            <X size={24} />
          </button>
          <figure onClick={(event) => event.stopPropagation()}>
            <img src={selected.src} alt={selected.alt} />
            {selected.caption && <figcaption>{selected.caption}</figcaption>}
          </figure>
        </div>,
        document.body,
      )}
    </section>
  );
}
