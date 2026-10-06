/**
 * Pure statistical calculation functions with no I/O or platform awareness.
 */

/**
 * Computes a simple moving average.
 * @param {number[]} series - Array of numerical values.
 * @param {number} window - The window size for the moving average.
 * @returns {(number|null)[]} - Array of the same length, with `null` for the warm-up period.
 */
function movingAverage(series, window) {
  if (!series || window <= 0) return series;
  return series.map((val, idx, arr) => {
    if (idx < window - 1) return null;
    const slice = arr.slice(idx - window + 1, idx + 1);
    const sum = slice.reduce((a, b) => a + (b || 0), 0);
    return sum / window;
  });
}

/**
 * Computes the rolling standard deviation.
 * @param {number[]} series 
 * @param {number} window 
 * @returns {(number|null)[]}
 */
function rollingStdDev(series, window) {
  if (!series || window <= 0) return series;
  return series.map((val, idx, arr) => {
    if (idx < window - 1) return null;
    const slice = arr.slice(idx - window + 1, idx + 1);
    const mean = slice.reduce((a, b) => a + (b || 0), 0) / window;
    const variance = slice.reduce((a, b) => a + Math.pow((b || 0) - mean, 2), 0) / window;
    return Math.sqrt(variance);
  });
}

/**
 * Computes the percent change from previous to current.
 * @param {number} current
 * @param {number} previous
 * @returns {number|null}
 */
function percentChange(current, previous) {
  if (previous === 0 || previous == null) return null;
  return (current - previous) / previous;
}

/**
 * Computes the churn rate (uninstalls / active devices).
 * @param {number} uninstalls 
 * @param {number} activeDevices 
 * @returns {number|null} 
 */
function churnRate(uninstalls, activeDevices) {
  if (!activeDevices || activeDevices === 0) return null;
  return uninstalls / activeDevices;
}

/**
 * Computes the install survival rate (active devices / total installs).
 * @param {number} activeDevices 
 * @param {number} totalInstalls 
 * @returns {number|null} 
 */
function installSurvival(activeDevices, totalInstalls) {
  if (!totalInstalls || totalInstalls === 0) return null;
  return activeDevices / totalInstalls;
}

/**
 * Computes average value per weekday.
 * @param {Array<{date: string, [key: string]: any}>} trends - Array of objects with `date` (YYYY-MM-DD) and the specified field.
 * @param {string} field - The object property to average.
 * @returns {Record<number, number|null>} { 0: avg_sun, 1: avg_mon, ... }
 */
function weekdayAverages(trends, field) {
  const sums = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const counts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

  trends.forEach(trend => {
    const d = new Date(trend.date);
    if (isNaN(d)) return;
    const day = d.getUTCDay();
    if (trend[field] !== undefined && trend[field] !== null) {
      sums[day] += trend[field];
      counts[day]++;
    }
  });

  const avgs = {};
  for (let i = 0; i < 7; i++) {
    avgs[i] = counts[i] > 0 ? sums[i] / counts[i] : null;
  }
  return avgs;
}

/**
 * Detect anomalies using rolling z-score.
 * @param {number[]} series
 * @param {number} window
 * @param {number} k - Z-score threshold
 * @returns {Array<{index: number, z: number}>}
 */
function zScoreAnomalies(series, window, k) {
  const ma = movingAverage(series, window);
  const std = rollingStdDev(series, window);
  
  return series.map((val, idx) => {
    if (ma[idx] === null || std[idx] === null || std[idx] === 0) return null;
    const z = (val - ma[idx]) / std[idx];
    return Math.abs(z) > k ? { index: idx, z } : null;
  }).filter(x => x !== null);
}

/**
 * Computes concentration index and Herfindahl-Hirschman Index (HHI).
 * @param {any[]} rows
 * @param {string} field
 * @param {number} [topN=3]
 * @returns {{topShare: number, hhi: number}|null}
 */
function concentrationIndex(rows, field, topN = 3) {
  const sorted = [...rows].sort((a, b) => (b[field] || 0) - (a[field] || 0));
  const total = sorted.reduce((sum, row) => sum + (row[field] || 0), 0);
  if (total === 0) return null;
  
  const topShare = sorted.slice(0, topN).reduce((sum, row) => sum + (row[field] || 0), 0) / total;
  
  const hhi = sorted.reduce((sum, row) => {
    const share = (row[field] || 0) / total;
    return sum + (share * share);
  }, 0);

  return { topShare, hhi };
}

/**
 * Simple linear forecast using least squares regression.
 * @param {number[]} series
 * @param {number} horizonDays
 * @returns {{points: number[], slope: number}|null}
 */
function linearForecast(series, horizonDays) {
  const n = series.length;
  if (n < 2) return null;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += series[i];
    sumXY += i * series[i];
    sumX2 += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const points = [];
  for (let i = 0; i < horizonDays; i++) {
    points.push(slope * (n + i) + intercept);
  }

  return { points, slope };
}

module.exports = {
  movingAverage,
  rollingStdDev,
  percentChange,
  churnRate,
  installSurvival,
  weekdayAverages,
  zScoreAnomalies,
  concentrationIndex,
  linearForecast
};
