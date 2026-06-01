const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '..', 'data', 'images');
const ANSWERS_CSV = path.join(__dirname, '..', 'data', 'answers.csv');
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'data', 'questions.json');

const EXAM_TYPE_MAP = {
  '03': '3월 학력평가',
  '05': '5월 학력평가',
  '06': '6월 모의평가',
  '07': '7월 학력평가',
  '09': '9월 모의평가',
  '10': '10월 학력평가',
  '11': '수능',
};

// === CSV 파서 (answers.csv에서 정답/정답률 로드) ===
function loadAnswersCSV() {
  if (!fs.existsSync(ANSWERS_CSV)) {
    console.log('⚠️  answers.csv 파일이 없습니다. 랜덤 데이터를 사용합니다.');
    return {};
  }

  const content = fs.readFileSync(ANSWERS_CSV, 'utf-8');
  const lines = content.trim().split('\n');
  const answerMap = {};

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length < 3) continue;

    // NFC 정규화 적용 (CSV 데이터)
    const questionId = values[0].trim().normalize('NFC');
    answerMap[questionId] = {
      answer: values[1].trim(),
      average_correct_rate: parseFloat(values[2].trim()),
    };
  }

  console.log(`📋 answers.csv에서 ${Object.keys(answerMap).length}개 정답 데이터 로드`);
  return answerMap;
}

// Fallback: 시뮬레이션 정답 (CSV에 없는 문항용)
function generateFallbackAnswer(questionNumber, questionType) {
  if (questionType === '주관식') {
    return String(Math.floor(Math.random() * 999) + 1);
  }
  return String(Math.floor(Math.random() * 5) + 1);
}

function generateFallbackCorrectRate(questionNumber) {
  const base = 0.9 - (questionNumber / 22) * 0.6;
  const noise = (Math.random() - 0.5) * 0.1;
  return Math.max(0.05, Math.min(0.95, base + noise));
}

// 평균 풀이 시간 추정 (정답률 기반)
function estimateAvgSolvingTime(questionNumber, correctRate) {
  const baseDifficulty = 1 - correctRate;
  const baseTime = 40 + baseDifficulty * 350;
  const noise = (Math.random() - 0.5) * 30;
  return Math.round(baseTime + noise);
}

function parseFilename(filename, answerMap) {
  // Pattern: 25-대수-06-1-지수.png
  // macOS는 NFD 유니코드를 사용하므로 NFC로 정규화
  const nameWithoutExt = filename.replace('.png', '').normalize('NFC');
  const parts = nameWithoutExt.split('-');

  if (parts.length < 5) return null;

  const year = parseInt('20' + parts[0]);
  const subjectArea = parts[1];
  const examTypeCode = parts[2];
  const questionNumber = parseInt(parts[3]);
  const unit = parts.slice(4).join('-');

  const examType = EXAM_TYPE_MAP[examTypeCode] || examTypeCode;
  const questionType = questionNumber >= 22 ? '주관식' : '객관식';

  // CSV에서 실제 데이터 가져오기, 없으면 fallback
  const csvData = answerMap[nameWithoutExt];
  const answer = csvData
    ? csvData.answer
    : generateFallbackAnswer(questionNumber, questionType);
  const correctRate = csvData
    ? csvData.average_correct_rate
    : parseFloat(generateFallbackCorrectRate(questionNumber).toFixed(2));

  return {
    question_id: nameWithoutExt,
    year,
    subject_area: subjectArea,
    exam_type: examType,
    exam_type_code: examTypeCode,
    question_number: questionNumber,
    unit,
    question_image: `/data/images/${encodeURIComponent(filename)}`,
    question_type: questionType,
    answer: String(answer),
    average_correct_rate: correctRate,
    average_solving_time_sec: estimateAvgSolvingTime(questionNumber, correctRate),
    has_real_data: !!csvData,
  };
}

function main() {
  // 1) CSV 로드
  const answerMap = loadAnswersCSV();

  // 2) 이미지 파일 스캔
  const files = fs.readdirSync(IMAGES_DIR).filter(f => f.endsWith('.png'));
  const questions = files.map(f => parseFilename(f, answerMap)).filter(Boolean);

  // Sort by year, exam type, question number
  questions.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    if (a.exam_type_code !== b.exam_type_code) return a.exam_type_code.localeCompare(b.exam_type_code);
    return a.question_number - b.question_number;
  });

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(questions, null, 2), 'utf-8');

  // 3) 결과 출력
  const realCount = questions.filter(q => q.has_real_data).length;
  const fallbackCount = questions.length - realCount;

  console.log(`\n✅ Generated ${questions.length} questions`);
  console.log(`   📌 실제 데이터: ${realCount}개`);
  console.log(`   🔀 시뮬레이션: ${fallbackCount}개`);
  console.log(`📁 Output: ${OUTPUT_FILE}`);

  const units = [...new Set(questions.map(q => q.unit))];
  const exams = [...new Set(questions.map(q => q.exam_type))];
  console.log(`\n📊 단원 (${units.length}개): ${units.join(', ')}`);
  console.log(`📊 시험 유형 (${exams.length}개): ${exams.join(', ')}`);

  // CSV에 없는 문항 경고
  const missingInCSV = questions.filter(q => !q.has_real_data);
  if (missingInCSV.length > 0) {
    console.log(`\n⚠️  ${missingInCSV.length}개 문항의 정답 데이터가 없어 시뮬레이션 값을 사용합니다.`);
    console.log(`   → data/answers.csv에 해당 문항을 추가해주세요.`);
  }
}

main();
