/**
 * Geometry for the word-count bar in the post analyzer.
 *
 * The fill and the scale numbers underneath it are two separate pieces of markup that have
 * to agree about the same axis. They did not: the fill was linear on 0–2,500 words while the
 * numbers were laid out with `justify-content: space-between`, which spaces items evenly
 * regardless of what they mean — so 300 sat at 25% and 1k at 50% of the track. A 1,000-word
 * draft filled 40% of the bar and therefore looked like about 800 words against those
 * numbers. Reported by @ahmedabbaci, 2026-09-29.
 *
 * Both now derive from BAR_MAX here, so they cannot drift apart again.
 */

/** Words at which the bar is full. Matches the 'Optimal' label in the analyzer. */
export const BAR_MAX = 2500;

/** Labelled points on the axis, in words. */
export const BAR_TICKS: readonly (readonly [number, string])[] = [
  [0, '0'], [300, '300'], [1000, '1k'], [2500, '2.5k'],
];

/** Fill width, as a percentage of the track. */
export const barFillPct = (wordCount: number): number =>
  Math.min(100, Math.max(0, (wordCount / BAR_MAX) * 100));

/**
 * Where a tick's label sits on the track, as a percentage, plus how far to shift it so it
 * reads as marking that point: the first label hangs off the left edge, the last off the
 * right, and the rest are centred.
 */
export const barTickPos = (at: number): { left: number; shift: string } => ({
  left: (at / BAR_MAX) * 100,
  shift: at <= 0 ? '0' : at >= BAR_MAX ? '-100%' : '-50%',
});
