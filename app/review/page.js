"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSessionById, getSessions, saveSession } from "@/lib/storage";

const STATUS_CONFIG = {
  "Zoning Out": { badge: "badge-zoning-out", icon: "🔴", label: "집중력 저하" },
  "Guessing": { badge: "badge-guessing", icon: "🟡", label: "추측 의심" },
  "Efficient": { badge: "badge-efficient", icon: "🟢", label: "효율적" },
  "Unefficient": { badge: "badge-unefficient", icon: "⚪", label: "비효율적" },
  "Normal": { badge: "badge-normal", icon: "🔵", label: "정상" },
};

const SELF_REVIEW_OPTIONS = [
  { value: "confident", label: "확신 있었음", icon: "💪" },
  { value: "zoned_out", label: "집중력 떨어짐", icon: "😴" },
  { value: "guessed", label: "찍었음", icon: "🎲" },
  { value: "partial", label: "부분적으로 알았음", icon: "🤔" },
  { value: "careless", label: "실수함", icon: "😅" },
  { value: "unknown_concept", label: "개념 모름", icon: "❓" },
];

function ReviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  const [session, setSession] = useState(null);
  const [selfReviews, setSelfReviews] = useState({});
  const [expandedQuestion, setExpandedQuestion] = useState(null);

  useEffect(() => {
    if (sessionId) {
      const s = getSessionById(sessionId);
      setSession(s);
      // Load existing self reviews
      if (s && s.responses) {
        const existing = {};
        s.responses.forEach((r) => {
          if (r.user_review_flag) {
            existing[r.question_id] = r.user_review_flag;
          }
        });
        setSelfReviews(existing);
      }
    } else {
      // Load latest session
      const sessions = getSessions();
      if (sessions.length > 0) {
        const latest = sessions[sessions.length - 1];
        setSession(latest);
        router.replace(`/review?session=${latest.session_id}`);
      }
    }
  }, [sessionId]);

  const handleSelfReview = (questionId, value) => {
    setSelfReviews((prev) => ({ ...prev, [questionId]: value }));
  };

  const saveAllReviews = () => {
    if (!session) return;
    const updatedResponses = session.responses.map((r) => ({
      ...r,
      user_review_flag: selfReviews[r.question_id] || null,
    }));
    const updatedSession = { ...session, responses: updatedResponses };

    // Update in storage
    const sessions = getSessions();
    const idx = sessions.findIndex(
      (s) => s.session_id === session.session_id
    );
    if (idx !== -1) {
      sessions[idx] = updatedSession;
      localStorage.setItem("pacemaker_sessions", JSON.stringify(sessions));
    }
    setSession(updatedSession);
  };

  if (!session) {
    return (
      <div className="page">
        <div className="container" style={{ textAlign: "center", paddingTop: "120px" }}>
          <p className="text-secondary">세션 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const { responses, summary } = session;

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="page">
      <div className="container">
        {/* Header */}
        <div style={styles.header} className="animate-fade-in-up">
          <div>
            <h1 className="heading-lg">🔍 리뷰 세션</h1>
            <p className="text-secondary" style={{ marginTop: "var(--space-xs)" }}>
              {session.session_type === "diagnostic" ? "진단" : "시험"} 세션
              결과를 확인하고, 자기진단 피드백을 입력하세요.
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() =>
              router.push(`/report?session=${session.session_id}`)
            }
            id="btn-go-report"
          >
            📊 리포트 보기 →
          </button>
        </div>

        {/* Summary Cards */}
        <div style={styles.summaryGrid} className="animate-fade-in-up stagger-1">
          <div className="glass-card" style={styles.summaryCard}>
            <span className="text-muted" style={{ fontSize: "0.8rem" }}>
              정답률
            </span>
            <span
              style={{
                ...styles.summaryValue,
                color:
                  summary.correctRate >= 0.7
                    ? "var(--status-efficient)"
                    : summary.correctRate >= 0.4
                    ? "var(--accent-caution)"
                    : "var(--status-zoning-out)",
              }}
            >
              {Math.round(summary.correctRate * 100)}%
            </span>
            <span className="text-muted" style={{ fontSize: "0.8rem" }}>
              {summary.correctCount} / {summary.totalQuestions}
            </span>
          </div>

          <div className="glass-card" style={styles.summaryCard}>
            <span className="text-muted" style={{ fontSize: "0.8rem" }}>
              총 소요 시간
            </span>
            <span style={styles.summaryValue}>
              {formatTime(summary.totalTime)}
            </span>
            <span className="text-muted" style={{ fontSize: "0.8rem" }}>
              평균 {formatTime(Math.round(summary.avgTime))} / 문항
            </span>
          </div>

          <div className="glass-card" style={styles.summaryCard}>
            <span className="text-muted" style={{ fontSize: "0.8rem" }}>
              최대 응답 시간
            </span>
            <span
              style={{ ...styles.summaryValue, color: "var(--status-zoning-out)" }}
            >
              {formatTime(summary.maxTime)}
            </span>
          </div>

          <div className="glass-card" style={styles.summaryCard}>
            <span className="text-muted" style={{ fontSize: "0.8rem" }}>
              최소 응답 시간
            </span>
            <span
              style={{ ...styles.summaryValue, color: "var(--accent-caution)" }}
            >
              {formatTime(summary.minTime)}
            </span>
          </div>
        </div>

        {/* Response Table */}
        <div
          className="glass-card animate-fade-in-up stagger-2"
          style={{ marginTop: "var(--space-xl)", padding: "0", overflow: "hidden" }}
        >
          <div style={styles.tableHeader}>
            <h3 className="heading-sm">문항별 결과</h3>
            <button
              className="btn btn-secondary btn-sm"
              onClick={saveAllReviews}
              id="btn-save-reviews"
            >
              💾 자기진단 저장
            </button>
          </div>

          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>#</th>
                  <th style={styles.th}>단원</th>
                  <th style={styles.th}>정오답</th>
                  <th style={styles.th}>응답 시간</th>
                  <th style={styles.th}>평균 정답률</th>
                  <th style={styles.th}>Z-Score</th>
                  <th style={styles.th}>상태</th>
                  <th style={styles.th}>자기진단</th>
                </tr>
              </thead>
              <tbody>
                {responses.map((r, i) => {
                  const statusConfig =
                    STATUS_CONFIG[r.status_flag] || STATUS_CONFIG["Normal"];
                  const isExpanded = expandedQuestion === r.question_id;

                  return (
                    <tr
                      key={r.question_id}
                      style={{
                        ...styles.tr,
                        background: isExpanded
                          ? "rgba(108, 99, 255, 0.05)"
                          : "transparent",
                        cursor: "pointer",
                      }}
                      onClick={() =>
                        setExpandedQuestion(
                          isExpanded ? null : r.question_id
                        )
                      }
                    >
                      <td style={styles.td}>
                        <span style={{ fontWeight: "600" }}>{i + 1}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ fontSize: "0.85rem" }}>{r.unit}</span>
                      </td>
                      <td style={styles.td}>
                        <span
                          style={{
                            fontSize: "1.2rem",
                            fontWeight: "700",
                            color: r.is_correct
                              ? "var(--status-efficient)"
                              : "var(--status-zoning-out)",
                          }}
                        >
                          {r.is_correct ? "O" : "X"}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span
                          style={{
                            fontVariantNumeric: "tabular-nums",
                            fontWeight: "500",
                          }}
                        >
                          {formatTime(r.response_time_sec)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span className="text-muted">
                          {Math.round(r.average_correct_rate * 100)}%
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span
                          style={{
                            fontWeight: "600",
                            color:
                              r.z_score > 1
                                ? "var(--status-zoning-out)"
                                : r.z_score < -1
                                ? "var(--accent-caution)"
                                : "var(--text-primary)",
                          }}
                        >
                          {r.z_score > 0 ? "+" : ""}
                          {r.z_score?.toFixed(1)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span className={`badge ${statusConfig.badge}`}>
                          {statusConfig.icon} {statusConfig.label}
                        </span>
                      </td>
                      <td
                        style={styles.td}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          value={selfReviews[r.question_id] || ""}
                          onChange={(e) =>
                            handleSelfReview(r.question_id, e.target.value)
                          }
                          style={styles.selfReviewSelect}
                          id={`self-review-${i}`}
                        >
                          <option value="">선택...</option>
                          {SELF_REVIEW_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.icon} {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div style={styles.actions} className="animate-fade-in-up stagger-3">
          <button
            className="btn btn-secondary btn-lg"
            onClick={() => router.push("/")}
            id="btn-go-home"
          >
            홈으로
          </button>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => {
              saveAllReviews();
              router.push(`/report?session=${session.session_id}`);
            }}
            id="btn-go-report-bottom"
          >
            📊 리포트 보기 →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="page">
          <div className="container" style={{ textAlign: "center", paddingTop: "120px" }}>
            <p className="text-secondary">로딩 중...</p>
          </div>
        </div>
      }
    >
      <ReviewContent />
    </Suspense>
  );
}

const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: "60px",
    marginBottom: "var(--space-xl)",
    flexWrap: "wrap",
    gap: "var(--space-md)",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "var(--space-md)",
  },
  summaryCard: {
    textAlign: "center",
    padding: "var(--space-xl) var(--space-md)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "var(--space-xs)",
  },
  summaryValue: {
    fontFamily: "var(--font-display)",
    fontSize: "2rem",
    fontWeight: "700",
    fontVariantNumeric: "tabular-nums",
  },
  tableHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "var(--space-lg) var(--space-xl)",
    borderBottom: "1px solid var(--border-subtle)",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    padding: "var(--space-md) var(--space-lg)",
    textAlign: "left",
    fontSize: "0.75rem",
    fontWeight: "600",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: "1px solid var(--border-subtle)",
    whiteSpace: "nowrap",
  },
  tr: {
    borderBottom: "1px solid var(--border-subtle)",
    transition: "background var(--transition-fast)",
  },
  td: {
    padding: "var(--space-md) var(--space-lg)",
    fontSize: "0.9rem",
    whiteSpace: "nowrap",
  },
  selfReviewSelect: {
    padding: "6px 10px",
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border-medium)",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.8rem",
    color: "var(--text-primary)",
    cursor: "pointer",
    minWidth: "120px",
  },
  actions: {
    display: "flex",
    justifyContent: "center",
    gap: "var(--space-md)",
    marginTop: "var(--space-2xl)",
  },
};
