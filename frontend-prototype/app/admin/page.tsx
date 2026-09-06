"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- This deployment uses full-page navigation to avoid vinext client routing failures. */

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import WorkspaceTopbar from "../components/WorkspaceTopbar";
import { OPERATING_DAY_SCENARIO as scenario } from "../demo/scenario";
import { requestRecord, REVIEW_ITEMS, REVIEW_STATES, type InterviewRecord, type ReviewDisposition } from "../demo/record";
import { buildReviewReport, requestReport, type ReviewEvidence, type ReviewReport } from "./report";
import ReviewDocument, { formatDate } from "./ReviewDocument";
import "./review.css";

type View = "summary" | "evidence" | "review" | "report";
const views: [View, string][] = [["summary", "사업 현황"], ["evidence", "답변과 근거"], ["review", "담당자 검토"], ["report", "최종 검토서"]];

function Evidence({ item }: { item: ReviewEvidence }) {
  return <details className="review-evidence" id={item.questionId}><summary><span>{String(item.number).padStart(2, "0")}</span><div><strong>{item.label}</strong><p>{item.originalText ?? "아직 답변하지 않았습니다."}</p></div><small>{item.status === "MISSING" ? "미응답" : "원문 보기"}</small><b aria-hidden="true">＋</b></summary><div><p className="review-question">{item.question}</p><blockquote>{item.originalText ?? "아직 답변하지 않았습니다."}</blockquote><small>{item.status === "MISSING" ? "연결된 답변이 없습니다." : "본인 진술 · 증빙 미확인"}</small><code>{item.id}</code></div></details>;
}

export default function AdminPage() {
  const [record, setRecord] = useState<InterviewRecord | null>(null);
  const [loadedAt, setLoadedAt] = useState<string | null>(null);
  const [view, setView] = useState<View>("summary");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [note, setNote] = useState("");
  const [checked, setChecked] = useState<string[]>([]);
  const [disposition, setDisposition] = useState<ReviewDisposition>("PENDING");
  const [printable, setPrintable] = useState<ReviewReport | null>(null);
  const dirtyRef = useRef(false);
  const busyRef = useRef(false);
  const revisionRef = useRef(0);
  const refreshSequence = useRef(0);

  const acceptRecord = useCallback((next: InterviewRecord, resetDraft = false) => {
    setRecord(next);
    setLoadedAt(new Date().toISOString());
    setPrintable(null);
    if (!dirtyRef.current || resetDraft) {
      setNote(next.note); setChecked(next.checklist); setDisposition(next.disposition);
      revisionRef.current = next.reviewRevision;
      dirtyRef.current = false; setDirty(false);
    }
  }, []);
  const refresh = useCallback(async (resetDraft = false) => {
    if (busyRef.current) return;
    const sequence = ++refreshSequence.current;
    try {
      const next = await requestRecord();
      if (sequence !== refreshSequence.current) return;
      acceptRecord(next, resetDraft); setError("");
    } catch (e) { if (sequence === refreshSequence.current) setError(e instanceof Error ? e.message : "불러오지 못했습니다."); }
  }, [acceptRecord]);
  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const onFocus = () => void refresh();
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 5000);
    window.addEventListener("focus", onFocus);
    const leave = (event: BeforeUnloadEvent) => { if (dirtyRef.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", leave);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); window.removeEventListener("focus", onFocus); window.removeEventListener("beforeunload", leave); };
  }, [refresh]);
  function edit() { dirtyRef.current = true; setDirty(true); setPrintable(null); setNotice("저장하지 않은 변경 사항이 있습니다."); }
  async function saveReview() {
    if (busyRef.current || !record) return;
    busyRef.current = true; ++refreshSequence.current; setBusy(true); setNotice("");
    try {
      const next = await requestRecord({ kind: "review", note, checklist: checked, disposition, reviewRevision: revisionRef.current });
      acceptRecord(next, true); setPrintable(null); setError(""); setNotice("검토 상태와 의견을 저장했습니다.");
    } catch (e) { setNotice(e instanceof Error ? e.message : "저장하지 못했습니다."); }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function exportReport(kind: "json" | "print") {
    if (dirtyRef.current || busyRef.current || !record?.answers.length) return;
    busyRef.current = true; ++refreshSequence.current; setBusy(true); setNotice("");
    try {
      const latest = await requestReport();
      if (!latest.evidence.some(item => item.originalText !== null)) throw new Error("저장된 답변이 없습니다.");
      if (kind === "json") {
        const url = URL.createObjectURL(new Blob([JSON.stringify(latest, null, 2)], { type: "application/json" }));
        const link = document.createElement("a"); link.href = url; link.download = `동행금융_느티나무감자탕_검토자료_${latest.preparedAt.slice(0, 10)}.json`;
        document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setNotice("최신 저장 기록으로 검토자료를 내려받았습니다.");
      } else {
        flushSync(() => setPrintable(latest)); window.print();
        setNotice("인쇄 창에서 PDF로 저장할 수 있습니다.");
      }
    } catch (e) { setNotice(e instanceof Error ? e.message : "검토자료를 만들지 못했습니다."); }
    finally { busyRef.current = false; setBusy(false); }
  }
  const report = record && loadedAt ? buildReviewReport(record, loadedAt) : null;
  const count = record?.answers.length ?? 0;
  const interviewStatus = record?.completedAt ? "인터뷰 완료" : count ? "인터뷰 진행 중" : "인터뷰 대기";
  const matches = `${scenario.persona.businessName} ${scenario.persona.borrowerName}`.includes(query.trim()) && (filter === "all" || record?.disposition === filter);

  return <main className="review-desk">
    <div className="review-screen"><WorkspaceTopbar active="admin" saving={busy} />
      <div className="review-layout">
        <aside className="review-directory">
          <div className="review-directory-title"><span>상담 기록</span><span>01</span></div>
          <label className="review-search"><span className="sr-only">상담 검색</span><input type="search" placeholder="가게 또는 사장님 검색" value={query} onChange={e => setQuery(e.target.value)} /></label>
          <label className="review-filter">검토 상태<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">전체 상담</option>{Object.entries(REVIEW_STATES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          {matches ? <button className="review-case" aria-current="true" onClick={() => { setView("summary"); document.getElementById("review-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}><span>{interviewStatus}</span><strong>느티나무감자탕</strong><p>표기웅 사장님 · 음식점</p><footer><span>{REVIEW_STATES[record?.disposition ?? "PENDING"]}</span><span>{count} / 12</span></footer></button> : <p>조건에 맞는 상담이 없습니다.</p>}
          <div className="review-directory-foot"><p>인터뷰에서 시작된 이야기,<br />검토 기록으로 이어집니다.</p><a href="/">골목으로 돌아가기 ↗</a></div>
        </aside>
        <section className="review-workspace" id="review-workspace">
          <div className="review-sync" role="status">{error || (!record ? "상담 기록을 불러오고 있습니다." : record.updatedAt ? `답변 저장 ${formatDate(record.updatedAt)} · 한국 시간` : "저장된 답변이 없습니다. 인터뷰를 시작해 주세요.")}{error && <button onClick={() => void refresh()}>다시 불러오기</button>}</div>
          {!matches ? <div className="review-empty"><h1>찾는 상담이 없어요.</h1><p>검색어나 검토 상태를 바꿔주세요.</p><button onClick={() => { setQuery(""); setFilter("all"); }}>전체 상담 보기</button></div> : <>
            <header className="review-heading"><div><p>상담 검토 · {interviewStatus}</p><h1>느티나무감자탕</h1><span>표기웅 사장님 · 음식점</span></div><a href="/demo">인터뷰 {record?.completedAt ? "확인" : "이어보기"} <span>↗</span></a></header>
            <div className="review-facts"><div><span>모인 답변</span><strong>{count}<small> / 12</small></strong></div><div><span>미응답</span><strong>{12 - count}<small>개</small></strong></div><div><span>담당자 검토</span><strong className="review-state-text">{REVIEW_STATES[record?.disposition ?? "PENDING"]}</strong></div></div>
            <nav className="review-tabs" aria-label="상담 검토 내용">{views.map(([key, label], index) => <button key={key} aria-current={view === key ? "page" : undefined} onClick={() => setView(key)}><small>0{index + 1}</small>{label}</button>)}</nav>
            {!report ? <p className="review-empty">{error ? "기록을 다시 불러온 뒤 검토할 수 있습니다." : "기록을 불러오는 중입니다."}</p> : <div className="review-view" key={view}>
              {view === "summary" && <><div className="review-section-heading"><div><span>01 / 사업 현황</span><h2>상황과 계획을 살펴봅니다.</h2></div><p>답변을 펼치면 질문과 원문을 함께 확인할 수 있습니다.</p></div><div className="review-overview"><section>{report.evidence.filter(item => ["monthly_average_sales", "fixed_operating_costs", "operating_day_drop_reason", "improvement_plan", "execution_readiness", "seasonality_outlook"].includes(item.questionId)).map(item => <Evidence key={item.id} item={item} />)}</section><aside className="review-context"><h3>확인할 정보</h3><p>답변 {count}개 수집 · 미응답 {report.missing.length}개</p>{report.missing.length ? <ul>{report.missing.slice(0, 5).map(item => <li key={item.id}>{item.label}</li>)}</ul> : <p>답변 수집을 마쳤습니다. 금액·기간과 증빙을 확인해 주세요.</p>}{report.missing.length > 5 && <small>외 {report.missing.length - 5}개 항목</small>}<button onClick={() => setView("evidence")}>전체 답변 확인 →</button><hr /><h3>담당자 의견</h3><p className="review-note-preview">{record?.note || "아직 남긴 의견이 없습니다."}</p><button onClick={() => setView("review")}>검토 의견 남기기 →</button></aside></div><p className="review-boundary">본인 진술을 질문별로 정리한 자료입니다. 답변 수집은 증빙 확인이나 금융 평가를 의미하지 않습니다.</p></>}
              {view === "evidence" && <><div className="review-section-heading"><div><span>02 / 답변과 근거</span><h2>사장님의 말, 그대로.</h2></div><p>각 답변에는 검토서와 연결되는 고유 근거 번호가 있습니다.</p></div>{report.coverage.map(group => <section className="review-evidence-group" key={group.category}><header><h3>{group.category}</h3><span>{group.answered} / {group.total}</span></header>{report.evidence.filter(item => item.category === group.category).map(item => <Evidence key={item.id} item={item} />)}</section>)}</>}
              {view === "review" && <><div className="review-section-heading"><div><span>03 / 담당자 검토</span><h2>확인한 내용과 다음 할 일.</h2></div><p>저장한 의견과 점검 상태가 최종 검토서에 포함됩니다.</p></div><div className="review-editor"><section><h3>자료 점검</h3><p>직접 확인한 항목만 표시해 주세요.</p>{REVIEW_ITEMS.map(item => <label className="review-check" key={item}><input type="checkbox" disabled={busy} checked={checked.includes(item)} onChange={e => { edit(); setChecked(current => e.target.checked ? [...current, item] : current.filter(value => value !== item)); }} /><span>{item}</span><small>{checked.includes(item) ? "확인" : "대기"}</small></label>)}<p className="review-boundary">미확인 항목이 있어도 검토자료를 만들 수 있습니다.</p></section><section><label className="review-field">검토 상태<select value={disposition} disabled={busy} onChange={e => { edit(); setDisposition(e.target.value as ReviewDisposition); }}>{Object.entries(REVIEW_STATES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="review-field">담당자 의견<textarea rows={7} maxLength={5000} value={note} disabled={busy} onChange={e => { edit(); setNote(e.target.value); }} placeholder="확인한 사실, 보완할 자료, 다음 상담에서 확인할 내용을 적어주세요." /></label><small>{note.length.toLocaleString()} / 5,000자 · 마지막 저장 {formatDate(record?.reviewUpdatedAt ?? null)}</small><div className="review-editor-actions"><button className="review-primary" onClick={saveReview} disabled={busy || !dirty}>{busy ? "저장 중…" : "검토 내용 저장"}</button>{dirty && <button onClick={() => { if (window.confirm("저장하지 않은 검토 변경을 버리고 서버의 기록을 불러올까요?")) { void refresh(true); setNotice(""); } }} disabled={busy}>저장된 검토 불러오기</button>}</div></section></div></>}
              {view === "report" && <><div className="review-section-heading"><div><span>04 / 최종 검토서</span><h2>상담을 위한 한 부의 기록.</h2></div><p>원문·미응답·담당자 의견을 함께 담습니다.</p></div><div className="review-export"><div><strong>{record?.completedAt ? "인터뷰 완료본" : "진행 중 자료"}</strong><p>{dirty ? "저장하지 않은 의견이 있습니다. 담당자 검토에서 먼저 저장해 주세요." : "내려받기 직전에 서버의 최신 저장 기록을 다시 확인합니다."}</p></div><button disabled={busy || dirty || !count} onClick={() => void exportReport("json")}>JSON 받기 ↓</button><button className="review-primary" disabled={busy || dirty || !count} onClick={() => void exportReport("print")}>인쇄 · PDF</button></div>{!count && <p className="review-boundary">저장된 답변이 있어야 내보낼 수 있습니다. 아래는 빈 검토서의 미리보기입니다.</p>}<ReviewDocument report={report} /></>}
            </div>}
            <div className="review-notice" role="status">{notice}{dirty && view !== "review" && <button onClick={() => setView("review")}>담당자 검토로 이동 →</button>}</div>
          </>}
        </section>
      </div>
    </div>
    <div className="review-print">{printable && !dirty ? <ReviewDocument report={printable} /> : <p>최신 검토자료를 인쇄하려면 최종 검토서의 ‘인쇄 · PDF’를 눌러주세요. 저장하지 않은 의견이 있으면 먼저 저장해 주세요.</p>}</div>
  </main>;
}
