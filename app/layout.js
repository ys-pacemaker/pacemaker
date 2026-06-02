import "./globals.css";

export const metadata = {
  title: "PaceMaker - 수학 모의고사 맞춤형 분석",
  description: "데이터 기반 수학 모의고사 맞춤형 분석 및 학습 전략 솔루션. 문항별 응답 시간 분석, IQR 이상치 탐지, Z-score 비교로 최적의 시험 전략을 수립하세요.",
  keywords: "수학, 모의고사, 학습 분석, 시간 관리, 수능",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <nav className="navbar">
          <div className="navbar-content">
            <a href="/pacemaker" className="navbar-logo">
              ⚡ <span>PaceMaker</span>
            </a>
            <ul className="navbar-nav">
              <li><a href="/pacemaker/diagnostic">진단 테스트</a></li>
              <li><a href="/pacemaker/exam">시험 세션</a></li>
              <li><a href="/pacemaker/history">학습 이력</a></li>
            </ul>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
