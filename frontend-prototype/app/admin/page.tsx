"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { INTERVIEW_CATEGORIES, OPERATING_DAY_SCENARIO } from "../demo/scenario";

interface SavedAnswer {
  questionId: string;
  text: string;
}

interface SavedInterview {
  answers?: SavedAnswer[];
  completedAt?: string;
}

const reviewItems = [
  "매출·비용 기준 기간 확인",
  "영업일 감소 사유 증빙",
  "월 29일 영업 실행 일정",
  "80만원 예산 사용 계획",
];

export default function AdminPage() {
  const scenario = OPERATING_DAY_SCENARIO;
  const savedRaw = useSyncExternalStore(
    () => () => undefined,
    () => window.sessionStorage.getItem("donghaeng-demo-interview") ?? "",
    () => "",
  );
  const saved = useMemo(() => {
    try {
      return savedRaw ? JSON.parse(savedRaw) as SavedInterview : null;
    } catch {
      return null;
    }
  }, [savedRaw]);
  const [selectedView, setSelectedView] = useState<"summary" | "answers" | "plan">("summary");
  const [checkedItems, setCheckedItems] = useState<string[]>(reviewItems.slice(0, 2));

  const answerMap = useMemo(
    () => new Map((saved?.answers ?? []).map((answer) => [answer.questionId, answer.text])),
    [saved],
  );
  const completedAnswers = saved?.answers?.length ?? 0;
  const isCompleted = completedAnswers === scenario.questions.length;
  const coverage = Math.round((completedAnswers / scenario.questions.length) * 100);

  return (
    <main className="admin-console">
      <header className="admin-console-topbar">
        <Link href="/" className="admin-console-brand">동행금융 <span>운영센터</span></Link>
        <nav aria-label="관리자 메뉴">
          <Link href="/admin" aria-current="page">상담 관리</Link>
          <Link href="/demo">인터뷰 화면</Link>
          <Link href="/">퀘스트 길</Link>
        </nav>
        <div className="admin-manager"><span>운영 담당자</span><i>동</i></div>
      </header>

      <div className="admin-console-shell">
        <aside className="admin-directory">
          <div className="admin-directory-heading"><span>CASES</span><strong>상담 목록</strong><b>1</b></div>
          <label className="admin-search"><span className="sr-only">상담 검색</span><input type="search" placeholder="사장님·사업체 검색" /></label>
          <div className="admin-filter-row"><button className="is-active">전체 1</button><button>검토 중 1</button><button>완료 0</button></div>
          <button className="admin-case-card is-selected">
            <span><i />{isCompleted ? "인터뷰 완료" : "검토 대기"}</span>
            <strong>{scenario.persona.businessName}</strong>
            <p>{scenario.persona.borrowerName} 사장님 · {scenario.persona.industryLabel}</p>
            <small>영업일 회복 계획 · 오늘</small>
          </button>
          <p className="admin-directory-note">상담 기록은 현재 시연 브라우저에만 표시됩니다.</p>
        </aside>

        <section className="admin-case-workspace">
          <header className="admin-case-heading">
            <div>
              <span className="admin-eyebrow">CASE 001 · {isCompleted ? "상담 완료" : "검토 대기"}</span>
              <h1>{scenario.persona.businessName}</h1>
              <p>{scenario.persona.borrowerName} 사장님과 나눈 대화를 바탕으로 다음 상담을 준비합니다.</p>
            </div>
            <div className="admin-case-actions"><Link href="/demo">상담 내용 보기</Link><button>검토 메모 남기기</button></div>
          </header>

          <div className="admin-metrics" aria-label="상담 핵심 지표">
            <article><span>인터뷰 수집</span><strong>{completedAnswers}<small> / {scenario.questions.length}</small></strong><i><b style={{ width: `${coverage}%` }} /></i></article>
            <article><span>현재 영업일</span><strong>{scenario.focus.baselineOperatingDays}<small>일 / 월</small></strong><p>최근 3개월 기준</p></article>
            <article className="is-highlight"><span>회복 목표</span><strong>{scenario.focus.targetOperatingDays}<small>일 / 월</small></strong><p>{scenario.focus.horizonMonths}개월 안에 +6일</p></article>
            <article><span>실행 예산</span><strong>80<small>만원</small></strong><p>사장님 확보 예산</p></article>
          </div>

          <nav className="admin-record-tabs" aria-label="상담 검토 내용">
            <button className={selectedView === "summary" ? "is-active" : ""} onClick={() => setSelectedView("summary")}>현황 요약</button>
            <button className={selectedView === "answers" ? "is-active" : ""} onClick={() => setSelectedView("answers")}>상담 원문 <span>{completedAnswers || 12}</span></button>
            <button className={selectedView === "plan" ? "is-active" : ""} onClick={() => setSelectedView("plan")}>실행·자료 점검</button>
          </nav>

          {selectedView === "summary" && (
            <div className="admin-summary-grid">
              <section className="admin-panel admin-case-summary">
                <header><div><span className="admin-eyebrow">상담 요약</span><h2>문을 못 연 이유는 줄었고,<br />회복 계획은 구체적입니다.</h2></div><span className="admin-review-badge">담당자 확인 필요</span></header>
                <blockquote>“지난봄 허리 치료 때문에 영업일이 줄었지만, 지금은 치료가 끝나 다시 매일 열고 있습니다.”</blockquote>
                <dl>
                  <div><dt>확인된 변화</dt><dd>월 23일 영업 → 월 29일 목표</dd></div>
                  <div><dt>준비 상태</dt><dd>예산 80만원 확보, 인력 보완 필요</dd></div>
                  <div><dt>주의할 변수</dt><dd>향후 3개월 비수기, 예약 0건</dd></div>
                </dl>
              </section>

              <section className="admin-panel admin-next-action">
                <span className="admin-eyebrow">NEXT ACTION</span>
                <h2>영업일 회복을<br />증빙으로 연결하기</h2>
                <p>치료 종료 시점과 최근 영업 기록을 먼저 확인하고, 인력 확보 일정과 예산 사용 계획을 한 장으로 정리합니다.</p>
                <div><span>권장 점검일</span><strong>7일 이내</strong></div>
                <button onClick={() => setSelectedView("plan")}>준비 항목 점검하기 <span>→</span></button>
              </section>

              <section className="admin-panel admin-coverage">
                <header><h2>대화 수집 현황</h2><span>{coverage || 100}%</span></header>
                {INTERVIEW_CATEGORIES.map((category) => {
                  const questions = scenario.questions.filter((question) => question.category === category);
                  const done = saved ? questions.filter((question) => answerMap.has(question.id)).length : questions.length;
                  return <div key={category}><span>{category}</span><i><b style={{ width: `${(done / questions.length) * 100}%` }} /></i><small>{done}/{questions.length}</small></div>;
                })}
                {!saved && <p>시연용 전체 답변을 기준으로 표시합니다.</p>}
              </section>
            </div>
          )}

          {selectedView === "answers" && (
            <section className="admin-panel admin-transcript">
              <header><div><span className="admin-eyebrow">INTERVIEW RECORD</span><h2>사장님 상담 원문</h2></div><p>원문을 요약하거나 평가하지 않고 질문별로 확인합니다.</p></header>
              {scenario.questions.map((question, index) => (
                <article key={question.id}><span>{String(index + 1).padStart(2, "0")}</span><div><small>{question.category} · {question.label}</small><h3>{question.question}</h3><blockquote>{answerMap.get(question.id) ?? question.suggestedAnswer}</blockquote></div></article>
              ))}
            </section>
          )}

          {selectedView === "plan" && (
            <div className="admin-plan-grid">
              <section className="admin-panel admin-checklist">
                <span className="admin-eyebrow">REVIEW CHECKLIST</span><h2>다음 상담 준비 항목</h2>
                {reviewItems.map((item) => <label key={item}><input type="checkbox" checked={checkedItems.includes(item)} onChange={(event) => setCheckedItems((current) => event.target.checked ? [...current, item] : current.filter((entry) => entry !== item))} /><span>{item}<small>{checkedItems.includes(item) ? "확인됨" : "확인 필요"}</small></span></label>)}
              </section>
              <section className="admin-panel admin-plan-note"><span className="admin-eyebrow">담당자 메모</span><h2>상담 연결 전 확인</h2><p>인터뷰 내용은 금융 판단이 아니라 상담 준비를 위한 정성 정보입니다. 실제 금액과 기간은 증빙 원본으로 다시 확인합니다.</p><textarea aria-label="담당자 검토 메모" placeholder="확인할 내용이나 다음 연락 메모를 남겨주세요" rows={5} /><button>검토 초안 저장</button></section>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
