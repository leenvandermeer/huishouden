export function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length ? sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2 : 0;
}

/** Each prediction sees only observations strictly before its evaluation period. */
export function backtestMonthlyBaseline(values: number[], window = 12) {
  const folds: Array<{ actual: number; mean: number; median: number }> = [];
  for (let index = 3; index < values.length; index++) {
    const training = values.slice(Math.max(0, index - window), index);
    folds.push({
      actual: values[index],
      mean: training.reduce((sum, value) => sum + value, 0) / training.length,
      median: median(training),
    });
  }
  const meanAbsoluteError = (method: "mean" | "median") => folds.length
    ? folds.reduce((sum, fold) => sum + Math.abs(fold.actual - fold[method]), 0) / folds.length
    : undefined;
  return { folds: folds.length, meanAbsoluteError: meanAbsoluteError("mean"), medianAbsoluteError: meanAbsoluteError("median") };
}
