import { describe, expect, it, vi } from 'vitest';
import { sampleAnimationBounds } from '../src/animation-bounds.js';

describe('完整动画的固定采样范围', () => {
  it('合并中途极值及首尾姿态的世界坐标范围', () => {
    let time = 0;
    const bounds = sampleAnimationBounds(1, (delta) => {
      time += delta;
      return {
        x: -10 * Math.sin(Math.PI * time),
        y: time * 5,
        width: 20,
        height: 10 + time * 10,
      };
    });
    expect(bounds.x).toBeCloseTo(-10);
    expect(bounds.y).toBe(0);
    expect(bounds.width).toBeCloseTo(30);
    expect(bounds.height).toBeCloseTo(25);
    expect(time).toBeCloseTo(1);
  });

  it('空附件和非法范围不把原点加入可见姿态的包围盒', () => {
    const poses = [
      { x: 0, y: 0, width: 0, height: 0 },
      { x: Infinity, y: -Infinity, width: -Infinity, height: -Infinity },
      { x: 100, y: 200, width: 30, height: 40 },
    ];
    expect(sampleAnimationBounds(2 / 60, () => poses.shift()!)).toEqual({
      x: 100,
      y: 200,
      width: 30,
      height: 40,
    });
  });

  it('零时长及非法时长只测一次，长动画完整覆盖且限制测量次数', () => {
    const pose = vi.fn(() => ({ x: 0, y: 0, width: 10, height: 20 }));
    for (const duration of [0, -1, Infinity, NaN]) {
      pose.mockClear();
      sampleAnimationBounds(duration, pose);
      expect(pose).toHaveBeenCalledExactlyOnceWith(0);
    }
    let elapsed = 0;
    const longPose = vi.fn((delta: number) => {
      elapsed += delta;
      return pose();
    });
    sampleAnimationBounds(3600, longPose);
    expect(longPose).toHaveBeenCalledTimes(601);
    expect(elapsed).toBeCloseTo(3600);
  });
});
