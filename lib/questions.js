/**
 * 문항 데이터 로더 및 유틸리티
 */

let questionsCache = null;

export async function loadQuestions() {
  if (questionsCache) return questionsCache;
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const res = await fetch(`${basePath}/data/questions.json`);
  if (!res.ok) {
    throw new Error(`Failed to fetch questions: HTTP ${res.status}`);
  }
  const data = await res.json();
  
  questionsCache = data.map(q => ({
    ...q,
    question_image: q.question_image.startsWith(basePath) 
      ? q.question_image 
      : basePath + q.question_image
  }));
  
  return questionsCache;
}

/**
 * 진단 세션용 랜덤 20문항 선별
 */
export async function getDiagnosticQuestions(count = 20) {
  const questions = await loadQuestions();
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, questions.length));
}

/**
 * 시험 세션용 문항 필터링
 * @param {Object} filters - { units: [], count: number }
 */
export async function getExamQuestions(filters = {}) {
  const questions = await loadQuestions();
  let filtered = questions;

  if (filters.units && filters.units.length > 0) {
    filtered = filtered.filter(q => filters.units.includes(q.unit));
  }

  if (filters.examTypes && filters.examTypes.length > 0) {
    filtered = filtered.filter(q => filters.examTypes.includes(q.exam_type));
  }

  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  const count = filters.count || 15;
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * 사용 가능한 단원 목록 조회
 */
export async function getAvailableUnits() {
  const questions = await loadQuestions();
  const unitMap = {};
  questions.forEach(q => {
    if (!unitMap[q.unit]) {
      unitMap[q.unit] = { name: q.unit, count: 0 };
    }
    unitMap[q.unit].count++;
  });
  return Object.values(unitMap).sort((a, b) => b.count - a.count);
}

/**
 * 사용 가능한 시험 유형 목록
 */
export async function getAvailableExamTypes() {
  const questions = await loadQuestions();
  const typeMap = {};
  questions.forEach(q => {
    if (!typeMap[q.exam_type]) {
      typeMap[q.exam_type] = { name: q.exam_type, count: 0 };
    }
    typeMap[q.exam_type].count++;
  });
  return Object.values(typeMap).sort((a, b) => b.count - a.count);
}
