"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import WorkspaceTopbar from "../components/WorkspaceTopbar";
import { INTERVIEW_CATEGORIES, OPERATING_DAY_SCENARIO } from "../demo/scenario";
import { requestRecord, REVIEW_ITEMS, type InterviewRecord } from "../demo/record";

const reviewItems = REVIEW_ITEMS;

export default function AdminPage() {
  const scenario = OPERATING_DAY_SCENARIO;
  const [saved, setSaved] = useState<InterviewRecord | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const dirty = useRef(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const focusNote = useRef(false);
  async function refresh() {
    try {
      const record = await requestRecord();
      setSaved(record);
      setError("");
      if (!dirty.current) { setNote(record.note); setCheckedItems(record.checklist); }
    } catch (e) { setError(e instanceof Error ? e.message : "기록을 불러오지 못했습니다."); }
  }
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 5000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);
  async function saveReview() {
    if (saving) return;
    setSaving(true); setNotice("");
    try {
      await requestRecord({ kind: "review", note, checklist: checkedItems });
      dirty.current = false;
      setNotice("메모와 점검 항목을 저장했습니다.");
    } catch (e) { setNotice(e instanceof Error ? e.message : "저장하지 못했습니다."); }
    finally { setSaving(false); }
  }
  const [selectedView, setSelectedView] = useState<"summary" | "answers" | "plan">("summary");
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  useEffect(() => { if (selectedView === "plan" && focusNote.current) { noteRef.current?.focus(); noteRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }); focusNote.current = false; } }, [selectedView]);

  const answerMap = useMemo(
    () => new Map((saved?.answers ?? []).map((answer) => [answer.questionId, answer.text])),
    [saved],
  );
  const completedAnswers = saved?.answers?.length ?? 0;
  const isCompleted = Boolean(saved?.completedAt);
  const coverage = Math.round((completedAnswers / scenario.questions.length) * 100);
  const status = isCompleted ? "인터뷰 완료" : completedAnswers ? "인터뷰 진행 중" : "인터뷰 대기";
  const matches = `${scenario.persona.businessName} ${scenario.persona.borrowerName}`.includes(query.trim()) && (filter === "all" || (filter === "completed" ? isCompleted : !isCompleted));
  const answerText = (id: string) => answerMap.get(id) ?? "아직 답변하지 않았습니다.";

  return (
    <main className="admin-console">
      <WorkspaceTopbar active="admin" />
      <div className="record-status" role="status">{error || (!saved ? "인터뷰 기록을 불러오는 중입니다." : saved.updatedAt ? `마지막 답변 저장: ${new Date(saved.updatedAt).toLocaleString("ko-KR")}` : "아직 저장된 인터뷰 답변이 없습니다.")}{error && <button onClick={refresh}>다시 불러오기</button>}</div>

      <div className="admin-console-shell">
        <aside className="admin-directory">
          <div className="admin-directory-heading"><span>CASES</span><strong>상담 목록</strong><b>1</b></div>
          <label className="admin-search"><span className="sr-only">상담 검색</span><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="사장님·사업체 검색" /></label>
          <div className="admin-filter-row">{[["all", "전체", 1], ["pending", "진행·대기", isCompleted ? 0 : 1], ["completed", "인터뷰 완료", isCompleted ? 1 : 0]].map(([key, label, count]) => <button key={key} aria-pressed={filter === key} className={filter === key ? "is-active" : ""} onClick={() => setFilter(String(key))}>{label} {count}</button>)}</div>
          {matches ? <button className="admin-case-card is-selected" onClick={() => { setSelectedView("summary"); document.getElementById("admin-workspace")?.scrollIntoView({ behavior: "smooth" }); }}>
            <span><i />{status}</span>
            <strong>{scenario.persona.businessName}</strong>
            <p>{scenario.persona.borrowerName} 사장님 · {scenario.persona.industryLabel}</p>
            <small>답변 {completedAnswers} / {scenario.questions.length}</small>
          </button> : <p className="record-status">검색 조건에 맞는 상담이 없습니다.</p>}
          <p className="admin-directory-note">저장된 인터뷰 답변을 자동으로 갱신합니다.</p>
        </aside>

        {!matches ? <section className="admin-case-workspace"><p>검색어나 상태 필터를 변경해 주세요.</p></section> : <section className="admin-case-workspace" id="admin-workspace">
          <header className="admin-case-heading">
            <div>
              <span className="admin-eyebrow">CASE 001 · {status}</span>
              <h1>{scenario.persona.businessName}</h1>
              <p>{scenario.persona.borrowerName} 사장님과 나눈 대화를 바탕으로 다음 상담을 준비합니다.</p>
            </div>
            <div className="admin-case-actions"><a href="/demo">인터뷰 이어보기</a><button onClick={() => { focusNote.current = true; setSelectedView("plan"); if (selectedView === "plan") { noteRef.current?.focus(); noteRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }); } }}>검토 메모 남기기</button></div>
          </header>

          <div className="admin-metrics" aria-label="상담 핵심 지표">
            <article><span>인터뷰 수집</span><strong>{completedAnswers}<small> / {scenario.questions.length}</small></strong><i><b style={{ width: `${coverage}%` }} /></i></article>
            <article className="admin-answer-metric"><span>월평균 매출 · 답변 원문</span><p>{answerText("monthly_average_sales")}</p></article>
            <article className="admin-answer-metric"><span>월 고정 운영비 · 답변 원문</span><p>{answerText("fixed_operating_costs")}</p></article>
            <article className="admin-answer-metric"><span>실행 준비도 · 답변 원문</span><p>{answerText("execution_readiness")}</p></article>
          </div>

          <nav className="admin-record-tabs" aria-label="상담 검토 내용">
            <button className={selectedView === "summary" ? "is-active" : ""} onClick={() => setSelectedView("summary")}>현황 요약</button>
            <button className={selectedView === "answers" ? "is-active" : ""} onClick={() => setSelectedView("answers")}>상담 원문 <span>{completedAnswers}</span></button>
            <button className={selectedView === "plan" ? "is-active" : ""} onClick={() => setSelectedView("plan")}>실행·자료 점검</button>
          </nav>

          {selectedView === "summary" && (
            <div className="admin-summary-grid">
              <section className="admin-panel admin-case-summary">
                <header><div><span className="admin-eyebrow">답변에서 확인할 내용</span><h2>사장님이 말씀하신 상황과 계획</h2></div><span className="admin-review-badge">{status}</span></header>
                <blockquote>{answerText("operating_day_drop_reason")}</blockquote>
                <dl>
                  <div><dt>사업 개선 계획</dt><dd>{answerText("improvement_plan")}</dd></div>
                  <div><dt>실행 준비도</dt><dd>{answerText("execution_readiness")}</dd></div>
                  <div><dt>향후 전망</dt><dd>{answerText("seasonality_outlook")}</dd></div>
                </dl>
              </section>

              <section className="admin-panel admin-next-action">
                <span className="admin-eyebrow">NEXT ACTION</span>
                <h2>영업일 회복을<br />증빙으로 연결하기</h2>
                <p>입력된 사유와 계획을 읽고, 확인한 증빙과 다음 상담에 필요한 내용을 기록해 주세요.</p>
                <div><span>점검 항목</span><strong>{checkedItems.length} / {reviewItems.length}</strong></div>
                <button onClick={() => setSelectedView("plan")}>준비 항목 점검하기 <span>→</span></button>
              </section>

              <section className="admin-panel admin-coverage">
                <header><h2>대화 수집 현황</h2><span>{coverage}%</span></header>
                {INTERVIEW_CATEGORIES.map((category) => {
                  const questions = scenario.questions.filter((question) => question.category === category);
                  const done = questions.filter((question) => answerMap.has(question.id)).length;
                  return <div key={category}><span>{category}</span><i><b style={{ width: `${(done / questions.length) * 100}%` }} /></i><small>{done}/{questions.length}</small></div>;
                })}
                <p>실제로 저장된 답변만 집계합니다.</p>
              </section>
            </div>
          )}

          {selectedView === "answers" && (
            <section className="admin-panel admin-transcript">
              <header><div><span className="admin-eyebrow">INTERVIEW RECORD</span><h2>사장님 상담 원문</h2></div><p>원문을 요약하거나 평가하지 않고 질문별로 확인합니다.</p></header>
              {scenario.questions.map((question, index) => (
                <article key={question.id}><span>{String(index + 1).padStart(2, "0")}</span><div><small>{question.category} · {question.label}</small><h3>{question.question}</h3><blockquote>{answerText(question.id)}</blockquote></div></article>
              ))}
            </section>
          )}

          {selectedView === "plan" && (
            <div className="admin-plan-grid">
              <section className="admin-panel admin-checklist">
                <span className="admin-eyebrow">REVIEW CHECKLIST</span><h2>다음 상담 준비 항목</h2>
                {reviewItems.map((item) => <label key={item}><input type="checkbox" disabled={!saved || saving} checked={checkedItems.includes(item)} onChange={(event) => { dirty.current = true; setNotice("변경한 점검 항목을 저장해 주세요."); setCheckedItems((current) => event.target.checked ? [...current, item] : current.filter((entry) => entry !== item)); }} /><span>{item}<small>{checkedItems.includes(item) ? "확인됨" : "확인 필요"}</small></span></label>)}
              </section>
              <section className="admin-panel admin-plan-note"><span className="admin-eyebrow">담당자 메모</span><h2>상담 연결 전 확인</h2><p>인터뷰 내용은 금융 판단이 아니라 상담 준비를 위한 정성 정보입니다. 실제 금액과 기간은 증빙 원본으로 다시 확인합니다.</p><textarea ref={noteRef} disabled={!saved || saving} value={note} maxLength={5000} onChange={(e) => { dirty.current = true; setNotice("저장하지 않은 변경 사항이 있습니다."); setNote(e.target.value); }} aria-label="담당자 검토 메모" placeholder="확인할 내용이나 다음 연락 메모를 남겨주세요" rows={5} /><button disabled={!saved || saving} onClick={saveReview}>{saving ? "저장 중…" : "검토 초안 저장"}</button><p role="status">{notice}</p></section>
            </div>
          )}
        </section>}
      </div>
    </main>
  );
}
