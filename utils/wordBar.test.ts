import { describe, it, expect } from 'vitest';
import { BAR_MAX, BAR_TICKS, barFillPct, barTickPos } from './wordBar';

describe('word-count bar geometry', () => {
  it('puts each scale number where the fill for that many words ends', () => {
    // This is the whole bug: a 1,000-word draft filled 40% of the track while the "1k"
    // number sat at 50%, so the bar under-reported by roughly 200 words.
    for (const [at] of BAR_TICKS) {
      expect(barTickPos(at).left).toBeCloseTo(barFillPct(at), 6);
    }
  });

  it('places 1k at 40% and 300 at 12% of a 2,500-word track', () => {
    expect(barTickPos(1000).left).toBe(40);
    expect(barTickPos(300).left).toBe(12);
    expect(barFillPct(1000)).toBe(40);
  });

  it('nudges the end labels inside the track and centres the rest', () => {
    expect(barTickPos(0).shift).toBe('0');
    expect(barTickPos(BAR_MAX).shift).toBe('-100%');
    expect(barTickPos(1000).shift).toBe('-50%');
  });

  it('clamps the fill to the track', () => {
    expect(barFillPct(10_000)).toBe(100);
    expect(barFillPct(0)).toBe(0);
    expect(barFillPct(-5)).toBe(0);
  });

  it('keeps the scale in order and ending at BAR_MAX', () => {
    const points = BAR_TICKS.map(([at]) => at);
    expect(points).toEqual([...points].sort((x, y) => x - y));
    expect(points[points.length - 1]).toBe(BAR_MAX);
  });
});
