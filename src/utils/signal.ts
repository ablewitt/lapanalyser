/** Causal moving average — only looks backward, no lookahead bias. */
export function movingAverage(arr: number[], window: number): number[] {
  const out = new Array<number>(arr.length);
  let sum = 0;
  let count = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
    count++;
    if (count > window) {
      sum -= arr[i - window];
      count = window;
    }
    out[i] = sum / count;
  }
  return out;
}

/** Returns indices of local minima. halfWindow defines neighbourhood size. */
export function findLocalMinima(arr: number[], halfWindow: number): number[] {
  const result: number[] = [];
  for (let i = halfWindow; i < arr.length - halfWindow; i++) {
    let isMin = true;
    for (let j = i - halfWindow; j <= i + halfWindow; j++) {
      if (j !== i && arr[j] <= arr[i]) { isMin = false; break; }
    }
    if (isMin) result.push(i);
  }
  return result;
}

/** Returns indices of local maxima. */
export function findLocalMaxima(arr: number[], halfWindow: number): number[] {
  const result: number[] = [];
  for (let i = halfWindow; i < arr.length - halfWindow; i++) {
    let isMax = true;
    for (let j = i - halfWindow; j <= i + halfWindow; j++) {
      if (j !== i && arr[j] >= arr[i]) { isMax = false; break; }
    }
    if (isMax) result.push(i);
  }
  return result;
}

/**
 * Largest-Triangle-Three-Buckets downsampling.
 * Reduces a (x, y) series to targetCount points while preserving visual shape.
 */
export function lttbDecimate(
  xs: number[], ys: number[], targetCount: number,
): { xs: number[]; ys: number[] } {
  const n = xs.length;
  if (targetCount >= n || n <= 2) return { xs, ys };

  const outX: number[] = [xs[0]];
  const outY: number[] = [ys[0]];

  const bucketSize = (n - 2) / (targetCount - 2);
  let a = 0;

  for (let i = 0; i < targetCount - 2; i++) {
    const rangeStart = Math.floor((i + 1) * bucketSize) + 1;
    const rangeEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, n);

    let avgX = 0, avgY = 0, avgCount = 0;
    for (let j = rangeStart; j < rangeEnd; j++) {
      avgX += xs[j]; avgY += ys[j]; avgCount++;
    }
    avgX /= avgCount; avgY /= avgCount;

    const currStart = Math.floor(i * bucketSize) + 1;
    const currEnd = Math.min(Math.floor((i + 1) * bucketSize) + 1, n);

    const ax = xs[a], ay = ys[a];
    let maxArea = -1, maxIdx = currStart;
    for (let j = currStart; j < currEnd; j++) {
      const area = Math.abs((ax - avgX) * (ys[j] - ay) - (ax - xs[j]) * (avgY - ay)) * 0.5;
      if (area > maxArea) { maxArea = area; maxIdx = j; }
    }

    outX.push(xs[maxIdx]);
    outY.push(ys[maxIdx]);
    a = maxIdx;
  }

  outX.push(xs[n - 1]);
  outY.push(ys[n - 1]);
  return { xs: outX, ys: outY };
}
