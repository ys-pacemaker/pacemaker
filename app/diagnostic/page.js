"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getDiagnosticQuestions } from "@/lib/questions";
import {
  saveBaseline,
  saveSession,
  generateSessionId,
} from "@/lib/storage";
import {
  assignStatusFlags,
  calculateZScores,
  calculateSessionSummary,
} from "@/lib/analysis";

export default function DiagnosticPage() {
  const router = useRouter();
  const [phase, setPhase] = useState("intro"); // intro | exam | complete
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const timerRef = useRef(null);
  const totalTimerRef = useRef(null);
  const questionStartRef = useRef(null);
  const sessionIdRef = useRef(generateSessionId());

  // Load questions
  useEffect(() => {
    getDiagnosticQuestions(20)
      .then(setQuestions)
      .catch(err => {
        console.error("Failed to load questions:", err);
        setError(err.message || "문항 데이터를 불러오는 중 오류가 발생했습니다.");
      });
  }, []);

  // Per-question timer
  useEffect(() => {
    if (phase !== "exam") return;
    questionStartRef.current = Date.now();
    setElapsedTime(0);
    timerRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - questionStartRef.current) / 1000));
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

  const startExam = () => {
    setPhase("exam");
  };

  const submitAnswer = useCallback(() => {
    if (!selectedAnswer) return;

    const question = questions[currentIndex];
    const responseTime = Math.max(1, Math.floor((Date.now() - questionStartRef.current) / 1000));

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

    const newResponses = [...responses, response];
    setResponses(newResponses);
    setSelectedAnswer("");

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Complete
      clearInterval(timerRef.current);
      clearInterval(totalTimerRef.current);
      finishSession(newResponses);
    }
  }, [selectedAnswer, currentIndex, questions, responses]);

  const finishSession = (allResponses) => {
    const withFlags = assignStatusFlags(allResponses);
    const withZScores = calculateZScores(withFlags);
    const summary = calculateSessionSummary(withZScores);

    const session = {
      session_id: sessionIdRef.current,
      session_type: "diagnostic",
      questions: questions.map(q => q.question_id),
      responses: withZScores,
      summary,
      started_at: new Date(Date.now() - totalElapsed * 1000).toISOString(),
      completed_at: new Date().toISOString(),
    };

    saveBaseline(session);
    saveSession(session);
    setPhase("complete");

    // Navigate to review after short delay
    setTimeout(() => {
      router.push(`/review?session=${sessionIdRef.current}`);
    }, 2000);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const currentQuestion = questions[currentIndex];

  // === Intro Phase ===
  if (phase === "intro") {
    return (
      <div className="page">
        <div className="container">
          <div style={styles.introWrapper} className="animate-fade-in-up">
            <div style={styles.introIcon}>🎯</div>
            <h1 className="heading-lg">진단 테스트</h1>
            <p className="text-secondary" style={styles.introDesc}>
              총 <strong style={{ color: "var(--accent-primary)" }}>20문항</strong>으로 구성된 진단 테스트를 통해
              기초 실력을 파악합니다. 문항별 응답 시간이 자동으로 측정됩니다.
            </p>

            <div style={styles.infoCards}>
              {[
                { icon: "⏱", label: "시간 측정", desc: "문항별 자동 기록" },
                { icon: "🔄", label: "랜덤 출제", desc: "DB에서 20문항 선별" },
                { icon: "📊", label: "즉시 분석", desc: "완료 후 리포트 제공" },
              ].map((info, i) => (
                <div key={i} className="glass-card" style={styles.infoCard}>
                  <span style={styles.infoIcon}>{info.icon}</span>
                  <strong>{info.label}</strong>
                  <span className="text-muted" style={{ fontSize: "0.85rem" }}>
                    {info.desc}
                  </span>
                </div>
              ))}
            </div>

            {error && (
              <div style={{ color: "var(--status-zoning-out)", marginTop: "var(--space-md)" }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ marginTop: "var(--space-lg)", padding: "var(--space-md)", background: "var(--bg-tertiary)", borderLeft: "4px solid var(--accent-primary)", borderRadius: "var(--radius-sm)", textAlign: "left" }}>
              <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-secondary)" }}>
                💡 <strong>안내:</strong> 세션이 시작되면 화면에 문항이 표시됩니다. 원활한 풀이를 위해 계산용 연습장과 필기도구를 미리 준비해 주세요.
              </p>
            </div>

            <button
              className="btn btn-primary btn-lg"
              onClick={startExam}
              disabled={questions.length === 0 || error}
              id="btn-start-diagnostic"
              style={{ marginTop: "var(--space-xl)" }}
            >
              {error ? "로딩 실패" : questions.length > 0 ? "테스트 시작하기 →" : "문항 로딩 중..."}
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
          <div style={styles.introWrapper} className="animate-fade-in-up">
            <div style={{ fontSize: "4rem", marginBottom: "var(--space-lg)" }}>🎉</div>
            <h1 className="heading-lg">진단 완료!</h1>
            <p className="text-secondary" style={{ marginTop: "var(--space-md)", fontSize: "1.1rem" }}>
              리뷰 페이지로 이동합니다...
            </p>
            <div className="animate-pulse" style={{ marginTop: "var(--space-lg)" }}>
              <div className="progress-bar" style={{ maxWidth: "300px", margin: "0 auto" }}>
                <div className="progress-bar-fill" style={{ width: "100%" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === Exam Phase ===
  if (!currentQuestion) return null;

  const progress = ((currentIndex + 1) / questions.length) * 100;
  const isMultipleChoice = currentQuestion.question_type === "객관식";

  return (
    <div className="page">
      <div className="container">
        {/* Top Bar */}
        <div style={styles.topBar} className="animate-fade-in">
          <div style={styles.progressInfo}>
            <span className="text-muted" style={{ fontSize: "0.85rem" }}>
              문항 {currentIndex + 1} / {questions.length}
            </span>
            <div className="progress-bar" style={{ width: "200px" }}>
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div style={styles.timerGroup}>
            <div style={styles.timerBox}>
              <span className="timer-label">현재 문항</span>
              <span className="timer-display" style={{ 
                fontSize: "1.5rem", 
                color: elapsedTime > 180 ? "var(--status-zoning-out)" : 
                       elapsedTime > 120 ? "var(--accent-caution)" : 
                       "var(--text-primary)" 
              }}>
                {formatTime(elapsedTime)}
              </span>
            </div>
            <div style={styles.timerBox}>
              <span className="timer-label">총 소요 시간</span>
              <span className="timer-display" style={{ fontSize: "1.5rem", color: "var(--text-secondary)" }}>
                {formatTime(totalElapsed)}
              </span>
            </div>
          </div>
        </div>

        {/* Question Card */}
        <div style={styles.questionCard} className="glass-card animate-slide-in-right" key={currentIndex}>
          <div style={styles.questionMeta}>
            <span className="badge badge-normal">
              {currentQuestion.unit}
            </span>
            <span className="text-muted" style={{ fontSize: "0.8rem" }}>
              {currentQuestion.exam_type} · {currentQuestion.year}학년도 · {currentQuestion.question_number}번
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
            <h3 className="heading-sm" style={{ marginBottom: "var(--space-md)" }}>
              답안 입력
            </h3>

            {isMultipleChoice ? (
              <div style={styles.choiceGrid}>
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    className={`btn ${selectedAnswer === String(num) ? "btn-primary" : "btn-secondary"}`}
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
                onKeyDown={(e) => {
                  if (e.key === "Enter" && selectedAnswer) {
                    submitAnswer();
                  }
                }}
                placeholder="정답 입력"
                style={styles.answerInput}
                id="answer-input"
                autoFocus
              />
            )}

            <button
              className="btn btn-primary btn-lg"
              onClick={submitAnswer}
              disabled={!selectedAnswer}
              style={{ marginTop: "var(--space-lg)", width: "100%" }}
              id="btn-submit-answer"
            >
              {currentIndex < questions.length - 1 ? "다음 문항 →" : "제출 완료 ✓"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  introWrapper: {
    maxWidth: "600px",
    margin: "80px auto 0",
    textAlign: "center",
  },
  introIcon: {
    fontSize: "4rem",
    marginBottom: "var(--space-lg)",
  },
  introDesc: {
    marginTop: "var(--space-md)",
    fontSize: "1.05rem",
    lineHeight: "1.8",
  },
  infoCards: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "var(--space-md)",
    marginTop: "var(--space-xl)",
  },
  infoCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "var(--space-xs)",
    padding: "var(--space-lg) var(--space-md)",
    textAlign: "center",
  },
  infoIcon: {
    fontSize: "1.5rem",
    marginBottom: "var(--space-xs)",
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
  questionCard: {
    maxWidth: "800px",
    margin: "0 auto",
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
};
