"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSessions, clearAllData } from "@/lib/storage";

export default function HistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    setSessions(getSessions());
  }, []);

  const handleClearAll = () => {
    if (confirm("모든 학습 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      clearAllData();
      setSessions([]);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="page">
      <div className="container">
        <div style={styles.header} className="animate-fade-in-up">
          <div>
            <h1 className="heading-lg">📚 학습 이력</h1>
            <p className="text-secondary" style={{ marginTop: "var(--space-xs)" }}>
              지금까지의 세션 기록과 성취를 확인하세요.
            </p>
          </div>
          {sessions.length > 0 && (
            <button
              className="btn btn-ghost"
              onClick={handleClearAll}
              style={{ color: "var(--status-zoning-out)" }}
              id="btn-clear-all"
            >
              🗑 전체 삭제
            </button>
          )}
        </div>

        {sessions.length === 0 ? (
          <div style={styles.emptyState} className="animate-fade-in-up stagger-1">
            <div style={{ fontSize: "4rem", marginBottom: "var(--space-lg)" }}>📭</div>
            <h2 className="heading-md">아직 학습 기록이 없습니다</h2>
            <p className="text-secondary" style={{ marginTop: "var(--space-sm)" }}>
              진단 테스트나 시험 세션을 시작하여 첫 기록을 만들어보세요.
            </p>
            <div style={{ display: "flex", gap: "var(--space-md)", marginTop: "var(--space-xl)" }}>
              <button
                className="btn btn-primary"
                onClick={() => router.push("/diagnostic")}
                id="btn-start-first-diagnostic"
              >
                🎯 진단 테스트 시작
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => router.push("/exam")}
                id="btn-start-first-exam"
              >
                📝 시험 세션 시작
              </button>
            </div>
          </div>
        ) : (
          <div style={styles.sessionList}>
            {[...sessions].reverse().map((session, i) => (
              <div
                key={session.session_id}
                className={`glass-card animate-fade-in-up stagger-${Math.min(i + 1, 5)}`}
                style={styles.sessionCard}
              >
                <div style={styles.sessionTop}>
                  <div style={styles.sessionMeta}>
                    <span
                      className={`badge ${
                        session.session_type === "diagnostic"
                          ? "badge-normal"
                          : "badge-efficient"
                      }`}
                    >
                      {session.session_type === "diagnostic" ? "진단" : "시험"}
                    </span>
                    <span className="text-muted" style={{ fontSize: "0.85rem" }}>
                      {formatDate(session.completed_at)}
                    </span>
                  </div>
                  <div style={styles.sessionActions}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => router.push(`/review?session=${session.session_id}`)}
                    >
                      🔍 리뷰
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => router.push(`/report?session=${session.session_id}`)}
                    >
                      📊 리포트
                    </button>
                  </div>
                </div>

                <div style={styles.sessionStats}>
                  <div style={styles.sessionStat}>
                    <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                      정답률
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "1.5rem",
                        fontWeight: "700",
                        color:
                          session.summary.correctRate >= 0.7
                            ? "var(--status-efficient)"
                            : session.summary.correctRate >= 0.4
                            ? "var(--accent-caution)"
                            : "var(--status-zoning-out)",
                      }}
                    >
                      {Math.round(session.summary.correctRate * 100)}%
                    </span>
                  </div>
                  <div style={styles.sessionStat}>
                    <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                      문항 수
                    </span>
                    <span style={styles.statVal}>{session.summary.totalQuestions}</span>
                  </div>
                  <div style={styles.sessionStat}>
                    <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                      총 소요 시간
                    </span>
                    <span style={styles.statVal}>{formatTime(session.summary.totalTime)}</span>
                  </div>
                  <div style={styles.sessionStat}>
                    <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                      평균 응답 시간
                    </span>
                    <span style={styles.statVal}>{formatTime(session.summary.avgTime)}</span>
                  </div>
                </div>

                {session.selected_units && session.selected_units.length > 0 && (
                  <div style={styles.unitTags}>
                    {session.selected_units.map((unit) => (
                      <span key={unit} style={styles.unitTag}>
                        {unit}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
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
  emptyState: {
    textAlign: "center",
    padding: "var(--space-4xl) 0",
  },
  sessionList: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-md)",
  },
  sessionCard: {
    padding: "var(--space-xl)",
  },
  sessionTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "var(--space-lg)",
    flexWrap: "wrap",
    gap: "var(--space-sm)",
  },
  sessionMeta: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-md)",
  },
  sessionActions: {
    display: "flex",
    gap: "var(--space-sm)",
  },
  sessionStats: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "var(--space-md)",
  },
  sessionStat: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  statVal: {
    fontFamily: "var(--font-display)",
    fontSize: "1.3rem",
    fontWeight: "700",
  },
  unitTags: {
    display: "flex",
    flexWrap: "wrap",
    gap: "var(--space-xs)",
    marginTop: "var(--space-md)",
    paddingTop: "var(--space-md)",
    borderTop: "1px solid var(--border-subtle)",
  },
  unitTag: {
    padding: "2px 10px",
    background: "rgba(108, 99, 255, 0.1)",
    borderRadius: "var(--radius-full)",
    fontSize: "0.75rem",
    color: "var(--accent-primary-light)",
  },
};
