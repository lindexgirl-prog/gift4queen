import { describe, expect, it } from 'vitest';
import archiveData from './archive.json';
import { parseArchive, sortArchiveCards } from './archiveSchema';

const archive = parseArchive(archiveData);

function card(id: string) {
  const result = archive.cards.find((item) => item.id === id);
  if (!result) throw new Error(`Не найдена карточка ${id}`);
  return result;
}

describe('approved family archive content', () => {
  it('moves the former card 6 to the beginning of chapter 6 without breaking the 1–51 sequence', () => {
    const ordered = sortArchiveCards(archive);

    expect(ordered.map((item) => item.number)).toEqual(
      Array.from({ length: 51 }, (_, index) => index + 1),
    );
    expect(ordered[5]).toMatchObject({ id: 'memory-007', number: 6 });
    expect(ordered[40]).toMatchObject({ id: 'memory-042', number: 41 });
    expect(ordered[41]).toMatchObject({
      id: 'memory-006',
      number: 42,
      order: 1,
      chapterId: 'chapter-6',
    });
    expect(ordered[42]).toMatchObject({ id: 'memory-043', number: 43, order: 2 });
    expect(ordered[49]).toMatchObject({ id: 'memory-050', number: 50 });
    expect(ordered[50]).toMatchObject({ id: 'memory-051', number: 51 });
  });

  it('describes the moved Moskvarium photo as a story about the new generation', () => {
    const moved = card('memory-006');

    expect(`${moved.title} ${moved.subtitle} ${moved.text}`.toLowerCase()).toContain('поколен');
    expect(moved.text).not.toContain('держишь меня');
    expect(moved.coverImage?.alt).not.toContain('сын');
  });

  it('uses the supplied mother-and-son photo for the former card 17 without inventing an event', () => {
    const replacement = card('memory-017');

    expect(replacement.coverImage?.src).toBe('/images/family-archive/memory-17.png');
    expect(replacement.coverImage?.alt.toLowerCase()).toContain('мама и сын');
    expect(replacement.dateLabel).toBeUndefined();
    expect(replacement.year).toBeUndefined();
    expect(`${replacement.title} ${replacement.subtitle} ${replacement.text}`.toLowerCase()).not.toContain('свадеб');
  });

  it('calls the drink in the former card 24 a cocktail, not a cake', () => {
    const cocktail = card('memory-024');
    const copy = `${cocktail.title} ${cocktail.subtitle} ${cocktail.text} ${cocktail.coverImage?.alt} ${cocktail.coverImage?.caption}`.toLowerCase();

    expect(copy).toContain('коктейл');
    expect(copy).not.toContain('торт');
  });

  it('describes only the mother and compliments her smile in the former card 35', () => {
    const portrait = card('memory-035');
    const copy = `${portrait.title} ${portrait.subtitle} ${portrait.text} ${portrait.coverImage?.alt} ${portrait.coverImage?.caption}`.toLowerCase();

    expect(copy).toContain('улыбк');
    expect(copy).not.toContain('семейн');
    expect(portrait.coverImage?.alt.toLowerCase()).toContain('мама');
  });

  it('describes three people in Peterhof in the former card 42', () => {
    const peterhof = card('memory-042');
    const copy = `${peterhof.title} ${peterhof.subtitle} ${peterhof.text} ${peterhof.coverImage?.alt} ${peterhof.coverImage?.caption}`.toLowerCase();

    expect(copy).toContain('втроём');
    expect(copy).not.toContain('вдвоём');
    expect(peterhof.coverImage?.alt.toLowerCase()).toContain('трое');
  });
});
