import type { PoseBounds } from './types.js';

/**
 * 合并完整动画的采样范围。回调只推进独立的测量姿态，不操作播放实例。
 * 以 60 Hz 采样并包含首尾，长动画最多 600 步，限制首次测量的开销。
 */
export function sampleAnimationBounds(
  duration: number,
  pose: (seconds: number) => PoseBounds,
): PoseBounds {
  const seconds = Number.isFinite(duration) ? Math.max(0, duration) : 0;
  const steps = Math.min(600, Math.ceil(seconds * 60));
  let left = Infinity;
  let bottom = Infinity;
  let right = -Infinity;
  let top = -Infinity;
  let previousTime = 0;
  for (let frame = 0; frame <= steps; frame++) {
    const time = frame === steps ? seconds : (frame * seconds) / steps;
    const bounds = pose(time - previousTime);
    previousTime = time;
    if (
      ![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite) ||
      bounds.width <= 0 ||
      bounds.height <= 0
    )
      continue;
    left = Math.min(left, bounds.x);
    bottom = Math.min(bottom, bounds.y);
    right = Math.max(right, bounds.x + bounds.width);
    top = Math.max(top, bounds.y + bounds.height);
  }
  return left === Infinity
    ? { x: 0, y: 0, width: 0, height: 0 }
    : { x: left, y: bottom, width: right - left, height: top - bottom };
}
