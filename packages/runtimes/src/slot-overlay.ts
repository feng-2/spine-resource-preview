import type { PoseBounds } from './types.js';

/** 从附件世界顶点中读取稳定的轴对齐包围盒。 */
export function boundsFromVertices(
  vertices: ArrayLike<number>,
  count: number,
): PoseBounds | undefined {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let index = 0; index + 1 < count; index += 2) {
    const x = vertices[index];
    const y = vertices[index + 1];
    if (x === undefined || y === undefined || !Number.isFinite(x) || !Number.isFinite(y))
      continue;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return Number.isFinite(minX)
    ? { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
    : undefined;
}
