"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { hasBaseline } from "@/lib/storage";

export default function HomePage() {
  const router = useRouter();
  const [baselineExists, setBaselineExists] = useState(false);

  useEffect(() => {
    setBaselineExists(hasBaseline());
  }, []);

  return (
    <div className="page">
      {/* Hero Section */}
      <section style={styles.hero}>
        <div className="container">
          {/* Decorative orbs */}
          <div style={styles.orbPurple} />
          <div style={styles.orbGreen} />
          
          <div style={styles.heroContent} className="animate-fade-in-up">
            <div style={styles.heroTag}>
              <span style={styles.heroTagDot} />
              데이터 기반 학습 전략 솔루션
            </div>
            
            <h1 className="heading-xl" style={styles.heroTitle}>
              당신의 시험 전략을
              <br />
              <span className="text-gradient">과학적으로 분석</span>합니다
            </h1>
            
            <p style={styles.heroDesc}>
              문항별 응답 시간, 정답률, 집중도를 종합 분석하여
              <br />
              최적의 시간 배분 전략과 맞춤형 학습 계획을 제공합니다.
            </p>
            
            <div style={styles.heroActions}>
              {!baselineExists ? (
                <button
                  className="btn btn-primary btn-lg"
                  onClick={() => router.push("/diagnostic")}
                  id="start-diagnostic"
                >
                  🎯 진단 테스트 시작하기
                </button>
              ) : (
                <button
                  className="btn btn-primary btn-lg"
                  onClick={() => router.push("/exam")}
                  id="start-exam"
                >
                  📝 시험 세션 시작하기
                </button>
              )}
              <button
                className="btn btn-secondary btn-lg"
                onClick={() => {
                  document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
                }}
                id="learn-more"
              >
                자세히 알아보기 ↓
              </button>
            </div>
          </div>

          {/* Stats */}
          <div style={styles.statsGrid} className="animate-fade-in-up stagger-2">
            {[
              { value: "52+", label: "문항 데이터베이스", icon: "📚" },
              { value: "4단계", label: "분석 세션", icon: "🔬" },
              { value: "IQR", label: "이상치 탐지", icon: "📊" },
              { value: "실시간", label: "응답 시간 측정", icon: "⏱" },
            ].map((stat, i) => (
              <div key={i} style={styles.statCard} className="glass-card">
                <span style={styles.statIcon}>{stat.icon}</span>
                <span style={styles.statValue}>{stat.value}</span>
                <span style={styles.statLabel}>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={styles.features}>
        <div className="container">
          <h2 className="heading-lg" style={styles.sectionTitle}>
            <span className="text-gradient">4단계 분석 세션</span>으로
            <br />
            학습 전략을 완성하세요
          </h2>

          <div style={styles.featureGrid}>
            {[
              {
                step: "01",
                title: "진단 세션",
                subtitle: "Diagnostic",
                desc: "20문항 랜덤 테스트로 기초 실력을 진단합니다. 문항별 응답 시간과 정오답을 기록하여 baseline 데이터를 형성합니다.",
                icon: "🎯",
                color: "var(--accent-primary)",
              },
              {
                step: "02",
                title: "시험 세션",
                subtitle: "Exam",
                desc: "원하는 단원과 문항 수를 선택하여 맞춤형 모의고사를 진행합니다. 실시간으로 응답 시간을 측정하고 Z-score를 추정합니다.",
                icon: "📝",
                color: "var(--accent-info)",
              },
              {
                step: "03",
                title: "리뷰 세션",
                subtitle: "Review",
                desc: "문항별 상태 인덱스(Zoning Out, Guessing, Efficient)를 확인하고, 자기진단 피드백으로 메타인지를 향상시킵니다.",
                icon: "🔍",
                color: "var(--accent-caution)",
              },
              {
                step: "04",
                title: "리포트 세션",
                subtitle: "Report",
                desc: "산점도, Z-score 분포, 단원별 강약점 등 심층 통계를 시각화하고 최적 시간 배분 전략을 제시합니다.",
                icon: "📊",
                color: "var(--accent-secondary)",
              },
            ].map((feature, i) => (
              <div
                key={i}
                style={{ ...styles.featureCard, '--feature-color': feature.color }}
                className={`glass-card animate-fade-in-up stagger-${i + 1}`}
              >
                <div style={styles.featureStep}>{feature.step}</div>
                <div style={styles.featureIcon}>{feature.icon}</div>
                <h3 className="heading-sm" style={styles.featureTitle}>
                  {feature.title}
                  <span style={styles.featureSubtitle}>{feature.subtitle}</span>
                </h3>
                <p style={styles.featureDesc}>{feature.desc}</p>
                <div style={{ ...styles.featureAccent, background: feature.color }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Analysis Section */}
      <section style={styles.analysisSection}>
        <div className="container">
          <h2 className="heading-lg" style={styles.sectionTitle}>
            핵심 <span className="text-gradient">통계 분석</span> 모듈
          </h2>
          
          <div style={styles.analysisGrid}>
            <div className="glass-card" style={styles.analysisCard}>
              <div style={{ ...styles.analysisBadge, background: 'rgba(255, 107, 107, 0.15)', color: 'var(--status-zoning-out)' }}>
                Zoning Out
              </div>
              <h3 className="heading-sm">IQR 이상치 탐지</h3>
              <p className="text-secondary" style={{ marginTop: 'var(--space-sm)' }}>
                응답 시간의 사분위 범위를 분석하여 집중력 저하(Zoning Out)와 추측(Guessing) 문항을 자동으로 식별합니다.
              </p>
              <div style={styles.formulaBox}>
                <code>상한선 = Q3 + 1.5 × IQR</code>
                <code>하한선 = Q1 - 1.5 × IQR</code>
              </div>
            </div>

            <div className="glass-card" style={styles.analysisCard}>
              <div style={{ ...styles.analysisBadge, background: 'rgba(108, 99, 255, 0.15)', color: 'var(--accent-primary)' }}>
                Z-Score
              </div>
              <h3 className="heading-sm">표준화 점수 비교</h3>
              <p className="text-secondary" style={{ marginTop: 'var(--space-sm)' }}>
                각 문항의 응답 시간을 전체 평균/표준편차와 비교하여 상대적 위치를 파악합니다.
              </p>
              <div style={styles.formulaBox}>
                <code>z = (x - μ) / σ</code>
              </div>
            </div>

            <div className="glass-card" style={styles.analysisCard}>
              <div style={{ ...styles.analysisBadge, background: 'rgba(0, 212, 170, 0.15)', color: 'var(--status-efficient)' }}>
                Efficiency
              </div>
              <h3 className="heading-sm">효율성 상관분석</h3>
              <p className="text-secondary" style={{ marginTop: 'var(--space-sm)' }}>
                피어슨 상관계수로 시간 투자와 정답률의 관계를 분석하여 효율적 학습 패턴을 도출합니다.
              </p>
              <div style={styles.formulaBox}>
                <code>r = Σ(xi-x̄)(yi-ȳ) / √(Σ(xi-x̄)²·Σ(yi-ȳ)²)</code>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={styles.ctaSection}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 className="heading-lg animate-fade-in-up">
            지금 바로 <span className="text-gradient">분석을 시작</span>하세요
          </h2>
          <p className="text-secondary animate-fade-in-up stagger-1" style={{ marginTop: 'var(--space-md)', fontSize: '1.1rem', maxWidth: '500px', margin: 'var(--space-md) auto 0' }}>
            직관에 의존하지 말고, 데이터로 증명하세요.
          </p>
          <div className="animate-fade-in-up stagger-2" style={{ marginTop: 'var(--space-xl)' }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => router.push(baselineExists ? "/exam" : "/diagnostic")}
              id="cta-start"
            >
              ⚡ 시작하기
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

const styles = {
  hero: {
    position: 'relative',
    paddingTop: '80px',
    paddingBottom: 'var(--space-4xl)',
    overflow: 'hidden',
  },
  orbPurple: {
    position: 'absolute',
    top: '-200px',
    right: '-100px',
    width: '500px',
    height: '500px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(108, 99, 255, 0.15) 0%, transparent 70%)',
    filter: 'blur(60px)',
    pointerEvents: 'none',
  },
  orbGreen: {
    position: 'absolute',
    bottom: '-200px',
    left: '-100px',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0, 212, 170, 0.1) 0%, transparent 70%)',
    filter: 'blur(60px)',
    pointerEvents: 'none',
  },
  heroContent: {
    textAlign: 'center',
    position: 'relative',
    zIndex: 1,
  },
  heroTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 16px',
    background: 'rgba(108, 99, 255, 0.1)',
    border: '1px solid rgba(108, 99, 255, 0.2)',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.85rem',
    color: 'var(--accent-primary-light)',
    marginBottom: 'var(--space-xl)',
  },
  heroTagDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--accent-primary)',
    animation: 'pulse 2s ease-in-out infinite',
  },
  heroTitle: {
    marginBottom: 'var(--space-lg)',
  },
  heroDesc: {
    fontSize: '1.15rem',
    lineHeight: '1.8',
    color: 'var(--text-secondary)',
    maxWidth: '600px',
    margin: '0 auto',
  },
  heroActions: {
    display: 'flex',
    gap: 'var(--space-md)',
    justifyContent: 'center',
    marginTop: 'var(--space-2xl)',
    flexWrap: 'wrap',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 'var(--space-md)',
    marginTop: 'var(--space-3xl)',
  },
  statCard: {
    textAlign: 'center',
    padding: 'var(--space-xl) var(--space-md)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-xs)',
  },
  statIcon: {
    fontSize: '1.5rem',
    marginBottom: 'var(--space-xs)',
  },
  statValue: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.5rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  statLabel: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
  },
  features: {
    paddingTop: 'var(--space-4xl)',
    paddingBottom: 'var(--space-4xl)',
  },
  sectionTitle: {
    textAlign: 'center',
    marginBottom: 'var(--space-3xl)',
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 'var(--space-lg)',
  },
  featureCard: {
    position: 'relative',
    overflow: 'hidden',
    padding: 'var(--space-2xl)',
  },
  featureStep: {
    fontFamily: 'var(--font-display)',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.15em',
    marginBottom: 'var(--space-md)',
  },
  featureIcon: {
    fontSize: '2.5rem',
    marginBottom: 'var(--space-md)',
  },
  featureTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
  },
  featureSubtitle: {
    fontSize: '0.85rem',
    fontWeight: '400',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-body)',
  },
  featureDesc: {
    color: 'var(--text-secondary)',
    marginTop: 'var(--space-sm)',
    lineHeight: '1.7',
    fontSize: '0.95rem',
  },
  featureAccent: {
    position: 'absolute',
    bottom: '0',
    left: '0',
    right: '0',
    height: '2px',
    opacity: 0.5,
  },
  analysisSection: {
    paddingTop: 'var(--space-4xl)',
    paddingBottom: 'var(--space-4xl)',
    background: 'var(--bg-secondary)',
  },
  analysisGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 'var(--space-lg)',
  },
  analysisCard: {
    padding: 'var(--space-2xl)',
  },
  analysisBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.75rem',
    fontWeight: '600',
    marginBottom: 'var(--space-md)',
  },
  formulaBox: {
    marginTop: 'var(--space-lg)',
    padding: 'var(--space-md)',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-xs)',
    fontFamily: "'Courier New', monospace",
    fontSize: '0.85rem',
    color: 'var(--accent-primary-light)',
  },
  ctaSection: {
    paddingTop: 'var(--space-4xl)',
    paddingBottom: 'var(--space-4xl)',
  },
};
