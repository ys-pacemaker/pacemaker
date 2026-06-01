/**
 * PaceMaker 통계 분석 모듈
 * - IQR 기반 이상치 탐지
 * - Z-score 산출
 * - 효율성 분석 (피어슨 상관계수)
 * - 시간 배분 전략 도출
 */

// === Helper Functions ===

function sortNumbers(arr) {
  return [...arr].sort((a, b) => a - b);
}

function mean(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stddev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function quartile(sorted, q) {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

// === IQR 기반 이상치 탐지 ===

export function detectOutliers(responseTimes) {
  const sorted = sortNumbers(responseTimes);
  const q1 = quartile(sorted, 0.25);
  const q3 = quartile(sorted, 0.75);
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  return {
    q1,
    q3,
    iqr,
    lowerBound: Math.max(0, lowerBound),
    upperBound,
    median: quartile(sorted, 0.5),
  };
}

/**
 * 각 응답에 상태 인덱스를 부여
 * @param {Array} responses - [{response_time_sec, is_correct, ...}]
 * @returns {Array} responses with status_flag added
 */
export function assignStatusFlags(responses) {
  const times = responses.map(r => r.response_time_sec);
  const { lowerBound, upperBound } = detectOutliers(times);

  return responses.map(r => {
    let status_flag = 'Normal';
    const t = r.response_time_sec;

    if (t > upperBound) {
      status_flag = 'Zoning Out';
    } else if (t < lowerBound) {
      status_flag = 'Guessing';
    } else if (r.is_correct) {
      status_flag = 'Efficient';
    } else {
      status_flag = 'Unefficient';
    }

    return { ...r, status_flag };
  });
}

// === Z-score 산출 ===

export function calculateZScores(responses) {
  return responses.map(r => {
    const avgTime = r.average_solving_time_sec || 120;
    // Simulated stddev as 30% of average
    const sd = avgTime * 0.3;
    const zScore = sd > 0 ? (r.response_time_sec - avgTime) / sd : 0;
    return { ...r, z_score: parseFloat(zScore.toFixed(2)) };
  });
}

// === 효율성 분석 (피어슨 상관계수) ===

export function pearsonCorrelation(x, y) {
  const n = x.length;
  if (n < 2) return 0;

  const mx = mean(x);
  const my = mean(y);

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denom = Math.sqrt(denomX * denomY);
  return denom === 0 ? 0 : numerator / denom;
}

/**
 * 단원별 효율성 분석
 */
export function analyzeEfficiencyByUnit(responses) {
  const unitGroups = {};

  responses.forEach(r => {
    const unit = r.unit || 'Unknown';
    if (!unitGroups[unit]) unitGroups[unit] = [];
    unitGroups[unit].push(r);
  });

  const results = {};
  for (const [unit, items] of Object.entries(unitGroups)) {
    if (items.length < 2) {
      results[unit] = { correlation: 0, label: 'Insufficient Data', count: items.length };
      continue;
    }
    const times = items.map(r => r.response_time_sec);
    const correctRates = items.map(r => r.is_correct ? 1 : 0);
    const corr = pearsonCorrelation(times, correctRates);

    results[unit] = {
      correlation: parseFloat(corr.toFixed(3)),
      label: corr > 0.1 ? 'Efficient' : corr < -0.1 ? 'Unefficient' : 'Neutral',
      count: items.length,
      avgTime: parseFloat(mean(times).toFixed(1)),
      correctRate: parseFloat(mean(correctRates).toFixed(2)),
    };
  }

  return results;
}

// === 시간 배분 전략 ===

export function generateTimeStrategy(responses) {
  const totalTime = responses.reduce((s, r) => s + r.response_time_sec, 0);
  const avgTimePerQuestion = totalTime / responses.length;

  // Group by status
  const statusGroups = {};
  responses.forEach(r => {
    const flag = r.status_flag || 'Normal';
    if (!statusGroups[flag]) statusGroups[flag] = [];
    statusGroups[flag].push(r);
  });

  // Calculate time savings from efficient questions
  const efficientItems = statusGroups['Efficient'] || [];
  const unefficientItems = statusGroups['Unefficient'] || [];
  const zoningOutItems = statusGroups['Zoning Out'] || [];

  const timeSaved = efficientItems.reduce((s, r) => {
    const diff = r.average_solving_time_sec - r.response_time_sec;
    return s + Math.max(0, diff);
  }, 0);

  const timeWasted = zoningOutItems.reduce((s, r) => {
    const diff = r.response_time_sec - r.average_solving_time_sec;
    return s + Math.max(0, diff);
  }, 0);

  return {
    totalTime: Math.round(totalTime),
    avgTimePerQuestion: Math.round(avgTimePerQuestion),
    timeSavedFromEfficient: Math.round(timeSaved),
    timeWastedFromZoningOut: Math.round(timeWasted),
    recommendations: generateRecommendations(responses, statusGroups),
    statusSummary: {
      efficient: efficientItems.length,
      unefficient: unefficientItems.length,
      zoningOut: zoningOutItems.length,
      guessing: (statusGroups['Guessing'] || []).length,
      normal: (statusGroups['Normal'] || []).length,
    },
  };
}

function generateRecommendations(responses, statusGroups) {
  const recs = [];
  const zoningOut = statusGroups['Zoning Out'] || [];
  const guessing = statusGroups['Guessing'] || [];
  const unefficient = statusGroups['Unefficient'] || [];

  if (zoningOut.length > 0) {
    const units = [...new Set(zoningOut.map(r => r.unit))];
    recs.push({
      type: 'warning',
      title: '집중력 저하 주의',
      description: `${units.join(', ')} 단원에서 과도한 시간을 소비했습니다. 해당 유형에서 ${Math.round(mean(zoningOut.map(r => r.response_time_sec)))}초 이상 소요 시 정답률이 급감합니다.`,
      suggestion: '해당 유형 문항에 3분 이상 소요 시 과감하게 넘어가는 전략을 권장합니다.',
    });
  }

  if (guessing.length > 0) {
    recs.push({
      type: 'caution',
      title: '추측 응답 감소 필요',
      description: `${guessing.length}개 문항에서 지나치게 빠른 응답이 감지되었습니다.`,
      suggestion: '최소 30초 이상 문제를 읽고 풀이를 시도한 후 답안을 제출하세요.',
    });
  }

  if (unefficient.length > 0) {
    const units = [...new Set(unefficient.map(r => r.unit))];
    recs.push({
      type: 'info',
      title: '학습 보강 필요 단원',
      description: `${units.join(', ')} 단원에서 시간 투자 대비 정답률이 낮습니다.`,
      suggestion: '해당 단원의 기본 개념 복습과 유형별 풀이법을 정리하세요.',
    });
  }

  return recs;
}

// === Summary Stats ===

export function calculateSessionSummary(responses) {
  const totalQuestions = responses.length;
  const correctCount = responses.filter(r => r.is_correct).length;
  const correctRate = totalQuestions > 0 ? correctCount / totalQuestions : 0;
  const totalTime = responses.reduce((s, r) => s + r.response_time_sec, 0);
  const avgTime = totalQuestions > 0 ? totalTime / totalQuestions : 0;
  const times = responses.map(r => r.response_time_sec);

  return {
    totalQuestions,
    correctCount,
    correctRate: parseFloat(correctRate.toFixed(2)),
    totalTime: Math.round(totalTime),
    avgTime: parseFloat(avgTime.toFixed(1)),
    maxTime: Math.max(...times),
    minTime: Math.min(...times),
    stddevTime: parseFloat(stddev(times).toFixed(1)),
  };
}
