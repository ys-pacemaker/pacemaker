"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSessionById, getSessions } from "@/lib/storage";
import {
  detectOutliers,
  analyzeEfficiencyByUnit,
  generateTimeStrategy,
  calculateSessionSummary,
} from "@/lib/analysis";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Scatter, Bar, Doughnut, Radar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Tooltip,
  Legend,
  Filler
);

// Chart defaults
ChartJS.defaults.color = "#9999b3";
ChartJS.defaults.borderColor = "rgba(255, 255, 255, 0.06)";
ChartJS.defaults.font.family = "'Inter', sans-serif";

const STATUS_COLORS = {
  "Zoning Out": "#ff6b6b",
  "Guessing": "#ffa64d",
  "Efficient": "#00d4aa",
  "Unefficient": "#8b8b9e",
  "Normal": "#6c63ff",
};

function ReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  const [session, setSession] = useState(null);

  useEffect(() => {
    if (sessionId) {
      setSession(getSessionById(sessionId));
    } else {
      const sessions = getSessions();
      if (sessions.length > 0) {
        const latest = sessions[sessions.length - 1];
        setSession(latest);
      }
    }
  }, [sessionId]);

  if (!session) {
    return (
      <div className="page">
        <div className="container" style={{ textAlign: "center", paddingTop: "120px" }}>
          <p className="text-secondary">리포트 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const { responses, summary } = session;
  const outliers = detectOutliers(responses.map((r) => r.response_time_sec));
  const efficiencyByUnit = analyzeEfficiencyByUnit(responses);
  const timeStrategy = generateTimeStrategy(responses);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // === Chart Data ===

  // 1. Scatter: Response Time vs Correct Rate
  const scatterData = {
    datasets: [
      ...Object.entries(STATUS_COLORS).map(([status, color]) => ({
        label: status,
        data: responses
          .filter((r) => r.status_flag === status)
          .map((r) => ({
            x: r.response_time_sec,
            y: r.average_correct_rate * 100,
            label: r.unit,
          })),
        backgroundColor: color + "cc",
        borderColor: color,
        borderWidth: 2,
        pointRadius: 8,
        pointHoverRadius: 12,
      })),
    ],
  };

  const scatterOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const r = responses.find(
              (resp) =>
                resp.response_time_sec === ctx.parsed.x &&
                resp.average_correct_rate * 100 === ctx.parsed.y
            );
            return [
              `단원: ${r?.unit || ""}`,
              `응답 시간: ${formatTime(ctx.parsed.x)}`,
              `정답률: ${ctx.parsed.y.toFixed(0)}%`,
              `상태: ${r?.status_flag || ""}`,
            ];
          },
        },
        backgroundColor: "rgba(18, 18, 26, 0.95)",
        titleColor: "#e8e8f0",
        bodyColor: "#9999b3",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
      },
      legend: {
        position: "bottom",
        labels: {
          usePointStyle: true,
          pointStyle: "circle",
          padding: 20,
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "응답 시간 (초)",
          color: "#9999b3",
        },
        grid: { color: "rgba(255,255,255,0.04)" },
      },
      y: {
        title: {
          display: true,
          text: "평균 정답률 (%)",
          color: "#9999b3",
        },
        grid: { color: "rgba(255,255,255,0.04)" },
        min: 0,
        max: 100,
      },
    },
  };

  // 2. Z-Score Bar Chart
  const zScoreData = {
    labels: responses.map((_, i) => `Q${i + 1}`),
    datasets: [
      {
        label: "Z-Score",
        data: responses.map((r) => r.z_score),
        backgroundColor: responses.map((r) =>
          r.z_score > 1.5
            ? STATUS_COLORS["Zoning Out"] + "aa"
            : r.z_score < -1.5
            ? STATUS_COLORS["Guessing"] + "aa"
            : r.z_score > 0
            ? STATUS_COLORS["Unefficient"] + "aa"
            : STATUS_COLORS["Efficient"] + "aa"
        ),
        borderColor: responses.map((r) =>
          r.z_score > 1.5
            ? STATUS_COLORS["Zoning Out"]
            : r.z_score < -1.5
            ? STATUS_COLORS["Guessing"]
            : r.z_score > 0
            ? STATUS_COLORS["Unefficient"]
            : STATUS_COLORS["Efficient"]
        ),
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const zScoreOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (ctx) => {
            const idx = ctx[0].dataIndex;
            return `문항 ${idx + 1} - ${responses[idx].unit}`;
          },
          label: (ctx) => `Z-Score: ${ctx.parsed.y.toFixed(2)}`,
        },
        backgroundColor: "rgba(18, 18, 26, 0.95)",
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        title: { display: true, text: "Z-Score", color: "#9999b3" },
        grid: { color: "rgba(255,255,255,0.04)" },
      },
    },
  };

  // 3. Status Pie Chart
  const statusCounts = {};
  responses.forEach((r) => {
    statusCounts[r.status_flag] = (statusCounts[r.status_flag] || 0) + 1;
  });

  const doughnutData = {
    labels: Object.keys(statusCounts),
    datasets: [
      {
        data: Object.values(statusCounts),
        backgroundColor: Object.keys(statusCounts).map(
          (s) => STATUS_COLORS[s] + "cc"
        ),
        borderColor: Object.keys(statusCounts).map((s) => STATUS_COLORS[s]),
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "60%",
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          usePointStyle: true,
          pointStyle: "circle",
          padding: 16,
        },
      },
    },
  };

  // 4. Radar: Unit Performance
  const units = Object.keys(efficiencyByUnit);
  const radarData = {
    labels: units,
    datasets: [
      {
        label: "정답률",
        data: units.map((u) => efficiencyByUnit[u].correctRate * 100),
        backgroundColor: "rgba(0, 212, 170, 0.15)",
        borderColor: "#00d4aa",
        borderWidth: 2,
        pointBackgroundColor: "#00d4aa",
        pointBorderColor: "#00d4aa",
      },
      {
        label: "시간 효율",
        data: units.map((u) => {
          const corr = efficiencyByUnit[u].correlation;
          return Math.max(0, (corr + 1) * 50); // Normalize -1~1 to 0~100
        }),
        backgroundColor: "rgba(108, 99, 255, 0.15)",
        borderColor: "#6c63ff",
        borderWidth: 2,
        pointBackgroundColor: "#6c63ff",
        pointBorderColor: "#6c63ff",
      },
    ],
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        angleLines: { color: "rgba(255,255,255,0.06)" },
        grid: { color: "rgba(255,255,255,0.06)" },
        pointLabels: { color: "#9999b3", font: { size: 11 } },
        ticks: { display: false },
        suggestedMin: 0,
        suggestedMax: 100,
      },
    },
    plugins: {
      legend: {
        position: "bottom",
        labels: { usePointStyle: true, pointStyle: "circle", padding: 16 },
      },
    },
  };

  return (
    <div className="page">
      <div className="container">
        {/* Header */}
        <div style={styles.header} className="animate-fade-in-up">
          <div>
            <h1 className="heading-lg">📊 분석 리포트</h1>
            <p className="text-secondary" style={{ marginTop: "var(--space-xs)" }}>
              {session.session_type === "diagnostic" ? "진단" : "시험"} 세션의
              심층 통계 분석 결과입니다.
            </p>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => router.push(`/review?session=${session.session_id}`)}
            id="btn-back-review"
          >
            ← 리뷰로 돌아가기
          </button>
        </div>

        {/* Summary Row */}
        <div style={styles.summaryRow} className="animate-fade-in-up stagger-1">
          <div className="glass-card" style={styles.summaryBig}>
            <span className="text-muted" style={{ fontSize: "0.8rem" }}>
              종합 정답률
            </span>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "3rem",
                fontWeight: "800",
                color:
                  summary.correctRate >= 0.7
                    ? "var(--status-efficient)"
                    : summary.correctRate >= 0.4
                    ? "var(--accent-caution)"
                    : "var(--status-zoning-out)",
              }}
            >
              {Math.round(summary.correctRate * 100)}
              <span style={{ fontSize: "1.5rem", opacity: 0.7 }}>%</span>
            </span>
            <span className="text-muted" style={{ fontSize: "0.85rem" }}>
              {summary.correctCount} / {summary.totalQuestions} 정답
            </span>
          </div>

          {[
            { label: "평균 응답 시간", value: formatTime(summary.avgTime), icon: "⏱" },
            { label: "표준편차", value: `${summary.stddevTime}초`, icon: "📐" },
            { label: "IQR 상한선", value: formatTime(outliers.upperBound), icon: "🔴" },
            { label: "IQR 하한선", value: formatTime(Math.max(0, outliers.lowerBound)), icon: "🟡" },
          ].map((item, i) => (
            <div key={i} className="glass-card" style={styles.summaryMini}>
              <span style={{ fontSize: "1.5rem" }}>{item.icon}</span>
              <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                {item.label}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.3rem",
                  fontWeight: "700",
                }}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>

        {/* Charts Row 1: Scatter + Z-Score */}
        <div style={styles.chartRow} className="animate-fade-in-up stagger-2">
          <div className="glass-card" style={styles.chartCard}>
            <h3 className="heading-sm" style={styles.chartTitle}>
              응답 시간 vs 정답률 산점도
            </h3>
            <p className="text-muted" style={{ fontSize: "0.8rem", marginBottom: "var(--space-md)" }}>
              상태 인덱스별 색상으로 구분됩니다
            </p>
            <div style={{ height: "350px" }}>
              <Scatter data={scatterData} options={scatterOptions} />
            </div>
          </div>

          <div className="glass-card" style={styles.chartCard}>
            <h3 className="heading-sm" style={styles.chartTitle}>
              Z-Score 분포
            </h3>
            <p className="text-muted" style={{ fontSize: "0.8rem", marginBottom: "var(--space-md)" }}>
              평균 대비 응답 시간 표준화 점수
            </p>
            <div style={{ height: "350px" }}>
              <Bar data={zScoreData} options={zScoreOptions} />
            </div>
          </div>
        </div>

        {/* Charts Row 2: Doughnut + Radar */}
        <div style={styles.chartRow} className="animate-fade-in-up stagger-3">
          <div className="glass-card" style={styles.chartCard}>
            <h3 className="heading-sm" style={styles.chartTitle}>
              상태 인덱스 요약
            </h3>
            <p className="text-muted" style={{ fontSize: "0.8rem", marginBottom: "var(--space-md)" }}>
              문항별 상태 분류 비율
            </p>
            <div style={{ height: "300px", display: "flex", justifyContent: "center" }}>
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>
          </div>

          <div className="glass-card" style={styles.chartCard}>
            <h3 className="heading-sm" style={styles.chartTitle}>
              단원별 강약점 분석
            </h3>
            <p className="text-muted" style={{ fontSize: "0.8rem", marginBottom: "var(--space-md)" }}>
              정답률 및 시간 효율 비교
            </p>
            <div style={{ height: "300px" }}>
              <Radar data={radarData} options={radarOptions} />
            </div>
          </div>
        </div>

        {/* Time Strategy Section */}
        <div
          className="glass-card animate-fade-in-up stagger-4"
          style={{ marginTop: "var(--space-xl)", padding: "var(--space-2xl)" }}
        >
          <h3 className="heading-md" style={{ marginBottom: "var(--space-lg)" }}>
            ⚡ 최적 시간 배분 전략
          </h3>

          {/* Strategy Stats */}
          <div style={styles.strategyStats}>
            <div style={styles.strategyStat}>
              <span style={{ fontSize: "1.5rem" }}>⏰</span>
              <div>
                <div className="text-muted" style={{ fontSize: "0.8rem" }}>
                  총 소요 시간
                </div>
                <div style={{ fontSize: "1.3rem", fontWeight: "700" }}>
                  {formatTime(timeStrategy.totalTime)}
                </div>
              </div>
            </div>
            <div style={styles.strategyStat}>
              <span style={{ fontSize: "1.5rem" }}>✅</span>
              <div>
                <div className="text-muted" style={{ fontSize: "0.8rem" }}>
                  효율적 문항에서 절약
                </div>
                <div
                  style={{
                    fontSize: "1.3rem",
                    fontWeight: "700",
                    color: "var(--status-efficient)",
                  }}
                >
                  {formatTime(timeStrategy.timeSavedFromEfficient)}
                </div>
              </div>
            </div>
            <div style={styles.strategyStat}>
              <span style={{ fontSize: "1.5rem" }}>⚠️</span>
              <div>
                <div className="text-muted" style={{ fontSize: "0.8rem" }}>
                  집중력 저하로 낭비
                </div>
                <div
                  style={{
                    fontSize: "1.3rem",
                    fontWeight: "700",
                    color: "var(--status-zoning-out)",
                  }}
                >
                  {formatTime(timeStrategy.timeWastedFromZoningOut)}
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {timeStrategy.recommendations.length > 0 && (
            <div style={{ marginTop: "var(--space-xl)" }}>
              <h4 className="heading-sm" style={{ marginBottom: "var(--space-md)" }}>
                📋 개선 권장 사항
              </h4>
              <div style={styles.recsGrid}>
                {timeStrategy.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    style={{
                      ...styles.recCard,
                      borderLeft: `3px solid ${
                        rec.type === "warning"
                          ? "var(--status-zoning-out)"
                          : rec.type === "caution"
                          ? "var(--accent-caution)"
                          : "var(--accent-info)"
                      }`,
                    }}
                  >
                    <h5 style={{ fontWeight: "600", marginBottom: "var(--space-sm)" }}>
                      {rec.title}
                    </h5>
                    <p
                      className="text-secondary"
                      style={{ fontSize: "0.9rem", lineHeight: "1.6" }}
                    >
                      {rec.description}
                    </p>
                    <p
                      style={{
                        marginTop: "var(--space-sm)",
                        fontSize: "0.85rem",
                        color: "var(--accent-primary-light)",
                        fontWeight: "500",
                      }}
                    >
                      💡 {rec.suggestion}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unit Efficiency Table */}
          <div style={{ marginTop: "var(--space-xl)" }}>
            <h4 className="heading-sm" style={{ marginBottom: "var(--space-md)" }}>
              📊 단원별 효율성 분석
            </h4>
            <div style={styles.effTableWrapper}>
              <table style={styles.effTable}>
                <thead>
                  <tr>
                    <th style={styles.effTh}>단원</th>
                    <th style={styles.effTh}>문항 수</th>
                    <th style={styles.effTh}>평균 응답시간</th>
                    <th style={styles.effTh}>정답률</th>
                    <th style={styles.effTh}>상관계수</th>
                    <th style={styles.effTh}>효율성</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(efficiencyByUnit).map(([unit, data]) => (
                    <tr key={unit} style={styles.effTr}>
                      <td style={styles.effTd}>{unit}</td>
                      <td style={styles.effTd}>{data.count}</td>
                      <td style={styles.effTd}>
                        {data.avgTime ? formatTime(data.avgTime) : "-"}
                      </td>
                      <td style={styles.effTd}>
                        {data.correctRate !== undefined
                          ? `${Math.round(data.correctRate * 100)}%`
                          : "-"}
                      </td>
                      <td style={styles.effTd}>
                        <span
                          style={{
                            fontWeight: "600",
                            color:
                              data.correlation > 0.1
                                ? "var(--status-efficient)"
                                : data.correlation < -0.1
                                ? "var(--status-zoning-out)"
                                : "var(--text-muted)",
                          }}
                        >
                          {data.correlation.toFixed(3)}
                        </span>
                      </td>
                      <td style={styles.effTd}>
                        <span
                          className={`badge ${
                            data.label === "Efficient"
                              ? "badge-efficient"
                              : data.label === "Unefficient"
                              ? "badge-unefficient"
                              : "badge-normal"
                          }`}
                        >
                          {data.label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div style={styles.bottomActions} className="animate-fade-in-up stagger-5">
          <button
            className="btn btn-secondary btn-lg"
            onClick={() => router.push("/")}
            id="btn-home"
          >
            홈으로
          </button>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => router.push("/exam")}
            id="btn-new-exam"
          >
            📝 새 시험 세션 →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="page">
          <div className="container" style={{ textAlign: "center", paddingTop: "120px" }}>
            <p className="text-secondary">리포트를 생성하는 중...</p>
          </div>
        </div>
      }
    >
      <ReportContent />
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
  summaryRow: {
    display: "grid",
    gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr",
    gap: "var(--space-md)",
  },
  summaryBig: {
    textAlign: "center",
    padding: "var(--space-2xl) var(--space-lg)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "var(--space-xs)",
  },
  summaryMini: {
    textAlign: "center",
    padding: "var(--space-lg) var(--space-md)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "var(--space-xs)",
  },
  chartRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "var(--space-lg)",
    marginTop: "var(--space-xl)",
  },
  chartCard: {
    padding: "var(--space-2xl)",
  },
  chartTitle: {
    marginBottom: "var(--space-xs)",
  },
  strategyStats: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "var(--space-md)",
    padding: "var(--space-lg)",
    background: "rgba(0, 0, 0, 0.2)",
    borderRadius: "var(--radius-md)",
  },
  strategyStat: {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-md)",
  },
  recsGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-md)",
  },
  recCard: {
    padding: "var(--space-lg)",
    background: "rgba(0, 0, 0, 0.2)",
    borderRadius: "var(--radius-md)",
  },
  effTableWrapper: {
    overflowX: "auto",
    borderRadius: "var(--radius-md)",
    background: "rgba(0, 0, 0, 0.15)",
  },
  effTable: {
    width: "100%",
    borderCollapse: "collapse",
  },
  effTh: {
    padding: "var(--space-md) var(--space-lg)",
    textAlign: "left",
    fontSize: "0.75rem",
    fontWeight: "600",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: "1px solid var(--border-subtle)",
  },
  effTr: {
    borderBottom: "1px solid var(--border-subtle)",
  },
  effTd: {
    padding: "var(--space-md) var(--space-lg)",
    fontSize: "0.9rem",
  },
  bottomActions: {
    display: "flex",
    justifyContent: "center",
    gap: "var(--space-md)",
    marginTop: "var(--space-2xl)",
  },
};
