"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getExamQuestions, getAvailableUnits } from "@/lib/questions";
import {
  saveSession,
  generateSessionId,
} from "@/lib/storage";
import {
  assignStatusFlags,
  calculateZScores,
  calculateSessionSummary,
} from "@/lib/analysis";

export default function ExamPage() {
  const router = useRouter();
  const [phase, setPhase] = useState("setup"); // setup | exam | complete
  const [availableUnits, setAvailableUnits] = useState([]);
  const [selectedUnits, setSelectedUnits] = useState([]);
  const [questionCount, setQuestionCount] = useState(10);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [answeredMap, setAnsweredMap] = useState({});
  const timerRef = useRef(null);
  const totalTimerRef = useRef(null);
  const questionStartRef = useRef(null);
  const sessionIdRef = useRef(generateSessionId());

  useEffect(() => {
    getAvailableUnits().then(setAvailableUnits);
  }, []);

  const toggleUnit = (unitName) => {
    setSelectedUnits((prev) =>
      prev.includes(unitName)
        ? prev.filter((u) => u !== unitName)
        : [...prev, unitName]
    );
  };

  const startExam = async () => {
    const qs = await getExamQuestions({
      units: selectedUnits.length > 0 ? selectedUnits : undefined,
      count: questionCount,
    });
    if (qs.length === 0) {
      alert("선택한 조건에 맞는 문항이 없습니다.");
      return;
    }
    setQuestions(qs);
    setPhase("exam");
  };

  // Per-question timer
  useEffect(() => {
    if (phase !== "exam") return;
    questionStartRef.current = Date.now();
    setElapsedTime(0);

    // Restore answer if already answered
    const existing = answeredMap[currentIndex];
    if (existing) {
      setSelectedAnswer(existing.user_answer);
    } else {
      setSelectedAnswer("");
    }

    timerRef.current = setInterval(() => {
      setElapsedTime(
        Math.floor((Date.now() - questionStartRef.current) / 1000)
      );
    }, 100);
    return () => clearInterval(timerRef.current);
  }, [currentIndex, phase]);

  // Total timer
  useEffect(() => {
    if (phase !== "exam") return;
    const start = Date.now();
    totalTimerRef.current = setInterval(() => {
      setTotalElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(totalTimerRef.current);
  }, [phase]);

  const saveCurrentAnswer = useCallback(() => {
    if (!selectedAnswer) return;
    const question = questions[currentIndex];
    const responseTime = Math.max(
      1,
      Math.floor((Date.now() - questionStartRef.current) / 1000)
    );

    const response = {
      question_id: question.question_id,
      question_number: question.question_number,
      unit: question.unit,
      user_answer: selectedAnswer,
      is_correct: selectedAnswer === question.answer,
      response_time_sec: responseTime,
      average_solving_time_sec: question.average_solving_time_sec,
      average_correct_rate: question.average_correct_rate,
    };

    setAnsweredMap((prev) => ({ ...prev, [currentIndex]: response }));
  }, [selectedAnswer, currentIndex, questions]);

  const goToQuestion = (index) => {
    saveCurrentAnswer();
    setCurrentIndex(index);
  };

  const submitAll = () => {
    saveCurrentAnswer();

    // Build final responses from answeredMap
    setTimeout(() => {
      setAnsweredMap((prev) => {
        // Add current answer
        let finalMap = { ...prev };
        if (selectedAnswer) {
          const question = questions[currentIndex];
          const responseTime = Math.max(
            1,
            Math.floor((Date.now() - questionStartRef.current) / 1000)
          );
          finalMap[currentIndex] = {
            question_id: question.question_id,
            question_number: question.question_number,
            unit: question.unit,
            user_answer: selectedAnswer,
            is_correct: selectedAnswer === question.answer,
            response_time_sec: responseTime,
            average_solving_time_sec: question.average_solving_time_sec,
            average_correct_rate: question.average_correct_rate,
          };
        }

        const allResponses = Object.values(finalMap);
        const withFlags = assignStatusFlags(allResponses);
        const withZScores = calculateZScores(withFlags);
        const summary = calculateSessionSummary(withZScores);

        const session = {
          session_id: sessionIdRef.current,
          session_type: "exam",
          selected_units: selectedUnits,
          questions: questions.map((q) => q.question_id),
          responses: withZScores,
          summary,
          started_at: new Date(
            Date.now() - totalElapsed * 1000
          ).toISOString(),
          completed_at: new Date().toISOString(),
        };

        saveSession(session);
        clearInterval(timerRef.current);
        clearInterval(totalTimerRef.current);
        setPhase("complete");

        setTimeout(() => {
          router.push(`/review?session=${sessionIdRef.current}`);
        }, 2000);

        return finalMap;
      });
    }, 100);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // === Setup Phase ===
  if (phase === "setup") {
    return (
      <div className="page">
        <div className="container">
          <div style={styles.setupWrapper} className="animate-fade-in-up">
            <div style={{ fontSize: "3rem", marginBottom: "var(--space-md)" }}>
              📝
            </div>
            <h1 className="heading-lg">시험 세션</h1>
            <p
              className="text-secondary"
              style={{
                marginTop: "var(--space-sm)",
                fontSize: "1.05rem",
              }}
            >
              원하는 단원과 문항 수를 선택하여 맞춤형 모의고사를 진행하세요.
            </p>

            {/* Unit Selection */}
            <div style={styles.setupSection}>
              <h3 className="heading-sm">단원 선택</h3>
              <p className="text-muted" style={{ fontSize: "0.85rem", marginBottom: "var(--space-md)" }}>
                선택하지 않으면 전체 단원에서 출제됩니다
              </p>
              <div style={styles.unitGrid}>
                {availableUnits.map((unit) => (
                  <button
                    key={unit.name}
                    className={`btn ${
                      selectedUnits.includes(unit.name)
                        ? "btn-primary"
                        : "btn-secondary"
                    }`}
                    onClick={() => toggleUnit(unit.name)}
                    style={styles.unitChip}
                    id={`unit-${unit.name}`}
                  >
                    {unit.name}
                    <span
                      style={{
                        fontSize: "0.75rem",
                        opacity: 0.7,
                        marginLeft: "4px",
                      }}
                    >
                      ({unit.count})
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Question Count */}
            <div style={styles.setupSection}>
              <h3 className="heading-sm">문항 수</h3>
              <div style={styles.countBtns}>
                {[5, 10, 15, 20].map((count) => (
                  <button
                    key={count}
                    className={`btn ${
                      questionCount === count ? "btn-primary" : "btn-secondary"
                    }`}
                    onClick={() => setQuestionCount(count)}
                    style={styles.countBtn}
                    id={`count-${count}`}
                  >
                    {count}문항
                  </button>
                ))}
              </div>
            </div>

            <button
              className="btn btn-primary btn-lg"
              onClick={startExam}
              style={{ marginTop: "var(--space-xl)", width: "100%" }}
              id="btn-start-exam"
            >
              시험 시작하기 →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // === Complete Phase ===
  if (phase === "complete") {
    return (
      <div className="page">
        <div className="container">
          <div style={styles.setupWrapper} className="animate-fade-in-up">
            <div style={{ fontSize: "4rem", marginBottom: "var(--space-lg)" }}>
              ✅
            </div>
            <h1 className="heading-lg">시험 완료!</h1>
            <p
              className="text-secondary"
              style={{ marginTop: "var(--space-md)", fontSize: "1.1rem" }}
            >
              리뷰 페이지로 이동합니다...
            </p>
            <div
              className="animate-pulse"
              style={{ marginTop: "var(--space-lg)" }}
            >
              <div
                className="progress-bar"
                style={{ maxWidth: "300px", margin: "0 auto" }}
              >
                <div
                  className="progress-bar-fill"
                  style={{ width: "100%" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === Exam Phase ===
  const currentQuestion = questions[currentIndex];
  if (!currentQuestion) return null;

  const progress = ((currentIndex + 1) / questions.length) * 100;
  const isMultipleChoice = currentQuestion.question_type === "객관식";
  const answeredCount = Object.keys(answeredMap).length;

  return (
    <div className="page">
      <div className="container">
        {/* Top Bar */}
        <div style={styles.topBar} className="animate-fade-in">
          <div style={styles.progressInfo}>
            <span
              className="text-muted"
              style={{ fontSize: "0.85rem" }}
            >
              문항 {currentIndex + 1} / {questions.length} (
              {answeredCount}개 응답 완료)
            </span>
            <div className="progress-bar" style={{ width: "200px" }}>
              <div
                className="progress-bar-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div style={styles.timerGroup}>
            <div style={styles.timerBox}>
              <span className="timer-label">현재 문항</span>
              <span
                className="timer-display"
                style={{
                  fontSize: "1.5rem",
                  color:
                    elapsedTime > 180
                      ? "var(--status-zoning-out)"
                      : elapsedTime > 120
                      ? "var(--accent-caution)"
                      : "var(--text-primary)",
                }}
              >
                {formatTime(elapsedTime)}
              </span>
            </div>
            <div style={styles.timerBox}>
              <span className="timer-label">총 소요</span>
              <span
                className="timer-display"
                style={{
                  fontSize: "1.5rem",
                  color: "var(--text-secondary)",
                }}
              >
                {formatTime(totalElapsed)}
              </span>
            </div>
          </div>
        </div>

        <div style={styles.examLayout}>
          {/* Question Navigator */}
          <div style={styles.navigator} className="glass-card">
            <h4 style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "var(--space-md)" }}>
              문항 네비게이터
            </h4>
            <div style={styles.navGrid}>
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToQuestion(i)}
                  style={{
                    ...styles.navBtn,
                    background:
                      i === currentIndex
                        ? "var(--accent-primary)"
                        : answeredMap[i]
                        ? "var(--status-efficient)"
                        : "var(--bg-tertiary)",
                    color:
                      i === currentIndex || answeredMap[i]
                        ? "white"
                        : "var(--text-secondary)",
                  }}
                  id={`nav-q-${i + 1}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              className="btn btn-primary"
              onClick={submitAll}
              style={{ marginTop: "var(--space-lg)", width: "100%", fontSize: "0.9rem" }}
              id="btn-submit-all"
            >
              전체 제출 ({answeredCount}/{questions.length})
            </button>
          </div>

          {/* Question Card */}
          <div
            style={styles.questionCard}
            className="glass-card animate-slide-in-right"
            key={currentIndex}
          >
            <div style={styles.questionMeta}>
              <span className="badge badge-normal">
                {currentQuestion.unit}
              </span>
              <span
                className="text-muted"
                style={{ fontSize: "0.8rem" }}
              >
                {currentQuestion.exam_type} · {currentQuestion.year}학년도
                · {currentQuestion.question_number}번
              </span>
            </div>

            {/* Question Image */}
            <div style={styles.questionImageWrapper}>
              <img
                src={currentQuestion.question_image}
                alt={`문항 ${currentQuestion.question_number}`}
                style={styles.questionImage}
              />
            </div>

            {/* Answer Input */}
            <div style={styles.answerSection}>
              <h3
                className="heading-sm"
                style={{ marginBottom: "var(--space-md)" }}
              >
                답안 입력
              </h3>

              {isMultipleChoice ? (
                <div style={styles.choiceGrid}>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      className={`btn ${
                        selectedAnswer === String(num)
                          ? "btn-primary"
                          : "btn-secondary"
                      }`}
                      onClick={() => setSelectedAnswer(String(num))}
                      style={styles.choiceBtn}
                      id={`choice-${num}`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type="number"
                  value={selectedAnswer}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  placeholder="정답 입력"
                  style={styles.answerInput}
                  id="answer-input"
                />
              )}

              <div style={styles.navActions}>
                <button
                  className="btn btn-secondary"
                  onClick={() => goToQuestion(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                  id="btn-prev"
                >
                  ← 이전
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    saveCurrentAnswer();
                    if (currentIndex < questions.length - 1) {
                      setCurrentIndex(currentIndex + 1);
                    } else {
                      submitAll();
                    }
                  }}
                  disabled={!selectedAnswer}
                  id="btn-next"
                >
                  {currentIndex < questions.length - 1
                    ? "다음 →"
                    : "제출 완료 ✓"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  setupWrapper: {
    maxWidth: "600px",
    margin: "80px auto 0",
    textAlign: "center",
  },
  setupSection: {
    marginTop: "var(--space-2xl)",
    textAlign: "left",
  },
  unitGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "var(--space-sm)",
  },
  unitChip: {
    padding: "var(--space-sm) var(--space-md)",
    fontSize: "0.85rem",
    borderRadius: "var(--radius-full)",
  },
  countBtns: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "var(--space-sm)",
    marginTop: "var(--space-md)",
  },
  countBtn: {
    padding: "var(--space-md)",
    fontSize: "1rem",
    fontWeight: "600",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "60px",
    marginBottom: "var(--space-xl)",
    flexWrap: "wrap",
    gap: "var(--space-md)",
  },
  progressInfo: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-md)",
  },
  timerGroup: {
    display: "flex",
    gap: "var(--space-xl)",
  },
  timerBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "2px",
  },
  examLayout: {
    display: "grid",
    gridTemplateColumns: "200px 1fr",
    gap: "var(--space-lg)",
    alignItems: "start",
  },
  navigator: {
    padding: "var(--space-lg)",
    position: "sticky",
    top: "80px",
  },
  navGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "6px",
  },
  navBtn: {
    width: "36px",
    height: "36px",
    borderRadius: "var(--radius-sm)",
    border: "none",
    cursor: "pointer",
    fontSize: "0.8rem",
    fontWeight: "600",
    transition: "all var(--transition-fast)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  questionCard: {
    padding: "var(--space-2xl)",
  },
  questionMeta: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-md)",
    marginBottom: "var(--space-lg)",
    flexWrap: "wrap",
  },
  questionImageWrapper: {
    background: "rgba(255, 255, 255, 0.95)",
    borderRadius: "var(--radius-md)",
    padding: "var(--space-lg)",
    marginBottom: "var(--space-xl)",
    display: "flex",
    justifyContent: "center",
    maxHeight: "500px",
    overflow: "auto",
  },
  questionImage: {
    maxWidth: "100%",
    height: "auto",
    objectFit: "contain",
  },
  answerSection: {
    borderTop: "1px solid var(--border-subtle)",
    paddingTop: "var(--space-xl)",
  },
  choiceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: "var(--space-sm)",
  },
  choiceBtn: {
    padding: "var(--space-md)",
    fontSize: "1.1rem",
    fontWeight: "700",
  },
  answerInput: {
    width: "100%",
    padding: "var(--space-md) var(--space-lg)",
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border-medium)",
    borderRadius: "var(--radius-md)",
    fontSize: "1.2rem",
    fontWeight: "600",
    color: "var(--text-primary)",
    textAlign: "center",
  },
  navActions: {
    display: "flex",
    gap: "var(--space-md)",
    marginTop: "var(--space-lg)",
  },
};
