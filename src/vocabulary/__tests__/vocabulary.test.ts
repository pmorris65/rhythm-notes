import { sanitizeSettings } from '../../domain/validate';
import {
  DEFAULT_PERIOD_WORD,
  labelsFor,
  lowerFirst,
  normalizePeriodWord,
  pluralize,
  withArticle,
} from '..';

describe('period word', () => {
  it('uses the chosen word throughout the neutral labels', () => {
    const l = labelsFor('neutral', 'Wave');
    expect(l.period).toBe('Wave');
    expect(l.nextIn(14)).toBe('Next wave in 14 days');
    expect(l.nextIn(1)).toBe('Next wave in 1 day');
    expect(l.dayOfPeriod(3)).toBe('Wave day 3');
    expect(l.predicted).toBe('Expected wave');
    expect(l.periodsLower).toBe('waves');
    expect(l.phases.during).toBe('During waves');
  });

  it('never reveals the real word in neutral mode', () => {
    const l = labelsFor('neutral', 'Break');
    // Only the displayed text, not the property names.
    const values = (o: object): string[] =>
      Object.values(o).flatMap((v) => (typeof v === 'string' ? [v] : typeof v === 'object' ? values(v) : []));
    const text = [...values(l), l.nextIn(3), l.dayOfPeriod(2), l.late(2), l.dayOfCycle(8)].join(' ');
    expect(text.toLowerCase()).not.toMatch(/period|menstru|ovulat|fertil/);
  });

  it('ignores the custom word in explicit mode', () => {
    expect(labelsFor('explicit', 'Wave').period).toBe('Period');
  });

  it('keeps words with their own capitals as typed', () => {
    const l = labelsFor('neutral', 'Aunt Flo');
    expect(l.periodLower).toBe('Aunt Flo');
    expect(l.nextIn(2)).toBe('Next Aunt Flo in 2 days');
    expect(lowerFirst('TOM')).toBe('TOM');
    expect(lowerFirst('Moon')).toBe('moon');
  });

  it('capitalises lower-case input for titles', () => {
    const l = labelsFor('neutral', 'tide');
    expect(l.period).toBe('Tide');
    expect(l.periodLower).toBe('tide');
  });

  it('makes reasonable plurals', () => {
    expect(pluralize('Wave')).toBe('Waves');
    expect(pluralize('Beach')).toBe('Beaches');
    expect(pluralize('Story')).toBe('Stories');
    expect(pluralize('Day')).toBe('Days');
    expect(pluralize('Red days')).toBe('Red days');
  });

  it('picks a or an', () => {
    expect(withArticle('wave')).toBe('a wave');
    expect(withArticle('entry')).toBe('an entry');
    expect(labelsFor('neutral', 'Orbit').aPeriod).toBe('an orbit');
  });

  it('falls back to the default for empty or invalid input', () => {
    expect(normalizePeriodWord('   ')).toBe(DEFAULT_PERIOD_WORD);
    expect(normalizePeriodWord(42)).toBe(DEFAULT_PERIOD_WORD);
    expect(normalizePeriodWord('  my   thing ')).toBe('My thing');
    expect(normalizePeriodWord('x'.repeat(50))).toHaveLength(20);
    expect(sanitizeSettings({ periodWord: '' }).periodWord).toBe(DEFAULT_PERIOD_WORD);
    expect(sanitizeSettings({ periodWord: 'moon' }).periodWord).toBe('Moon');
  });
});
