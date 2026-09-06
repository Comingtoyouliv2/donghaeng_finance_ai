"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Full-page navigation is intentional for the hosted vinext app. */
/* eslint-disable jsx-a11y/label-has-associated-control -- All controls are nested in their visible labels; dynamic Korean labels are not understood by the static rule. */

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { flushSync } from "react-dom";
import WorkspaceTopbar from "../components/WorkspaceTopbar";
import { OPERATING_DAY_SCENARIO as scenario } from "../demo/scenario";
import { ANALYSIS_GROUP_LABELS, type AnalysisGroup } from "./analysis";
import { INSTITUTIONS, PREPARATION_DOCUMENTS, PREPARATION_OWNERS, RECOVERY_PLANS, requestRecord, REVIEW_ITEMS, REVIEW_PERIODS, REVIEW_STATES, type InterviewRecord, type ReviewDisposition } from "../demo/record";
import { buildReviewReport, requestReport, type ReviewEvidence, type ReviewReport } from "./report";
import ReviewDocument, { formatDate } from "./ReviewDocument";
import "./review.css";

type View = "summary" | "evidence" | "plan" | "review" | "report";
const views: [View, string][] = [["summary", "검토 요약"], ["evidence", "변수와 근거"], ["plan", "계획과 기록"], ["review", "담당자 의견"], ["report", "자료 내보내기"]];
const groups = Object.keys(ANALYSIS_GROUP_LABELS) as AnalysisGroup[];

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
  const [reviewDirty, setReviewDirty] = useState(false);
  const [workspaceDirty, setWorkspaceDirty] = useState(false);
  const [note, setNote] = useState("");
  const [checked, setChecked] = useState<string[]>([]);
  const [disposition, setDisposition] = useState<ReviewDisposition>("PENDING");
  const [planChoice, setPlanChoice] = useState<string | null>(null);
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<string[]>([]);
  const [owner, setOwner] = useState<string>(PREPARATION_OWNERS[0]);
  const [period, setPeriod] = useState<string>(REVIEW_PERIODS[0]);
  const [reviewed, setReviewed] = useState(false);
  const [executionDate, setExecutionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [executionTitle, setExecutionTitle] = useState("");
  const [executionNote, setExecutionNote] = useState("");
  const [printable, setPrintable] = useState<ReviewReport | null>(null);
  const dirtyRef = useRef(false);
  const busyRef = useRef(false);
  const reviewRevisionRef = useRef(0);
  const workspaceRevisionRef = useRef(0);
  const refreshSequence = useRef(0);

  const acceptRecord = useCallback((next: InterviewRecord, resetDraft = false) => {
    setRecord(next); setLoadedAt(new Date().toISOString()); setPrintable(null);
    reviewRevisionRef.current = next.reviewRevision; workspaceRevisionRef.current = next.workspace.revision;
    if (!dirtyRef.current || resetDraft) {
      setNote(next.note); setChecked(next.checklist); setDisposition(next.disposition);
      setPlanChoice(next.workspace.planChoice); setInstitutionId(next.workspace.institutionId); setDocuments(next.workspace.preparationDocuments); setOwner(next.workspace.preparationOwner); setPeriod(next.workspace.reviewPeriod); setReviewed(next.workspace.preparationReviewed);
      dirtyRef.current = false; setReviewDirty(false); setWorkspaceDirty(false);
    }
  }, []);
  const refresh = useCallback(async (resetDraft = false) => {
    if (busyRef.current) return;
    const sequence = ++refreshSequence.current;
    try { const next = await requestRecord(); if (sequence !== refreshSequence.current) return; acceptRecord(next, resetDraft); setError(""); }
    catch (e) { if (sequence === refreshSequence.current) setError(e instanceof Error ? e.message : "불러오지 못했습니다."); }
  }, [acceptRecord]);
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("section") as View | null;
    const routeViewTimer = requested && views.some(([key]) => key === requested) ? window.setTimeout(() => setView(requested), 0) : null;
    const initial = window.setTimeout(() => void refresh(), 0);
    const onFocus = () => void refresh();
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 5000);
    const leave = (event: BeforeUnloadEvent) => { if (dirtyRef.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("focus", onFocus); window.addEventListener("beforeunload", leave);
    return () => { if (routeViewTimer !== null) window.clearTimeout(routeViewTimer); window.clearTimeout(initial); window.clearInterval(timer); window.removeEventListener("focus", onFocus); window.removeEventListener("beforeunload", leave); };
  }, [refresh]);

  function selectView(next: View) { setView(next); const url = new URL(window.location.href); url.searchParams.set("section", next); window.history.replaceState(null, "", url); }
  function editReview() { dirtyRef.current = true; setReviewDirty(true); setPrintable(null); setNotice("저장하지 않은 담당자 의견이 있습니다."); }
  function editWorkspace() { dirtyRef.current = true; setWorkspaceDirty(true); setPrintable(null); setNotice("저장하지 않은 상담 준비 내용이 있습니다."); }
  async function saveReview() {
    if (busyRef.current || !record) return;
    busyRef.current = true; ++refreshSequence.current; setBusy(true); setNotice("");
    try { const next = await requestRecord({ kind: "review", note, checklist: checked, disposition, reviewRevision: reviewRevisionRef.current }); acceptRecord(next, true); setNotice("담당자 의견을 저장했습니다."); }
    catch (e) { setNotice(e instanceof Error ? e.message : "저장하지 못했습니다."); }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function saveWorkspace() {
    if (busyRef.current || !record) return;
    busyRef.current = true; ++refreshSequence.current; setBusy(true); setNotice("");
    try { const next = await requestRecord({ kind: "workspace", planChoice, institutionId, preparationDocuments: documents, preparationOwner: owner, reviewPeriod: period, preparationReviewed: reviewed, workspaceRevision: workspaceRevisionRef.current }); acceptRecord(next, true); setNotice("계획과 기관 상담 준비 내용을 저장했습니다."); }
    catch (e) { setNotice(e instanceof Error ? e.message : "저장하지 못했습니다."); }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function addExecution() {
    if (busyRef.current || !record || workspaceDirty || !executionTitle.trim()) return;
    busyRef.current = true; ++refreshSequence.current; setBusy(true); setNotice("");
    try { const next = await requestRecord({ kind: "execution", date: executionDate, title: executionTitle, note: executionNote, workspaceRevision: workspaceRevisionRef.current }); acceptRecord(next, true); setExecutionTitle(""); setExecutionNote(""); setNotice("실행 기록을 추가했습니다. 기존 기록은 그대로 보존됩니다."); }
    catch (e) { setNotice(e instanceof Error ? e.message : "실행 기록을 저장하지 못했습니다."); }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function exportReport(kind: "json" | "print") {
    if (dirtyRef.current || busyRef.current || !record?.answers.length) return;
    busyRef.current = true; ++refreshSequence.current; setBusy(true); setNotice("");
    try {
      const latest = await requestReport();
      if (kind === "json") { const url = URL.createObjectURL(new Blob([JSON.stringify(latest, null, 2)], { type: "application/json" })); const link = document.createElement("a"); link.href = url; link.download = `동행금융_느티나무감자탕_검토자료_${latest.preparedAt.slice(0, 10)}.json`; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); setNotice("서버의 최신 기록과 100개 변수 사전을 내려받았습니다."); }
      else { flushSync(() => setPrintable(latest)); window.print(); setNotice("인쇄 창에서 PDF로 저장할 수 있습니다."); }
    } catch (e) { setNotice(e instanceof Error ? e.message : "검토자료를 만들지 못했습니다."); }
    finally { busyRef.current = false; setBusy(false); }
  }
  function moveView(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const nextIndex = event.key === "ArrowRight" ? (index + 1) % views.length : event.key === "ArrowLeft" ? (index + views.length - 1) % views.length : event.key === "Home" ? 0 : event.key === "End" ? views.length - 1 : null;
    if (nextIndex === null) return; event.preventDefault(); const next = views[nextIndex][0]; selectView(next); document.getElementById(`review-tab-${next}`)?.focus();
  }

  const report = record && loadedAt ? buildReviewReport(record, loadedAt) : null;
  const count = record?.answers.length ?? 0;
  const interviewStatus = record?.completedAt ? "인터뷰 완료" : count ? "인터뷰 진행 중" : "인터뷰 대기";
  const matches = `${scenario.persona.businessName} ${scenario.persona.borrowerName}`.includes(query.trim()) && (filter === "all" || record?.disposition === filter);
  const selectedPlan = RECOVERY_PLANS.find(item => item.id === planChoice);
  const institution = INSTITUTIONS.find(item => item.id === institutionId);
  const dirty = reviewDirty || workspaceDirty;

  return <main className="review-desk"><div className="review-screen"><WorkspaceTopbar active="admin" saving={busy || dirty} /><div className="review-layout">
    <aside className="review-directory"><div className="review-directory-title"><span>상담 기록</span><span>1건</span></div><label className="review-search"><span className="sr-only">상담 검색</span><input type="search" placeholder="가게 또는 사장님 검색" value={query} onChange={e => setQuery(e.target.value)} /></label><label className="review-filter">검토 상태<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">전체 상담</option>{Object.entries(REVIEW_STATES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>{matches ? <button className="review-case" aria-current="true" onClick={() => selectView("summary")}><span>{interviewStatus}</span><strong>{scenario.persona.businessName}</strong><p>{scenario.persona.borrowerName} 사장님 · {scenario.persona.industryLabel}</p><footer><span>{REVIEW_STATES[record?.disposition ?? "PENDING"]}</span><span>{count} / 12</span></footer></button> : <p>조건에 맞는 상담이 없습니다.</p>}<div className="review-directory-foot"><p>인터뷰에서 시작된 이야기,<br />실행의 기록으로 이어집니다.</p><a href="/">골목으로 돌아가기 ↗</a></div></aside>
    <section className="review-workspace" id="review-workspace"><div className="review-sync" role="status">{error || (!record ? "상담 기록을 불러오고 있습니다." : record.updatedAt ? `답변 저장 ${formatDate(record.updatedAt)} · 한국 시간` : "저장된 답변이 없습니다. 인터뷰를 시작해 주세요.")}{error && <button onClick={() => void refresh()}>다시 불러오기</button>}</div>
      {!matches ? <div className="review-empty"><h1>찾는 상담이 없어요.</h1><p>검색어나 검토 상태를 바꿔주세요.</p><button onClick={() => { setQuery(""); setFilter("all"); }}>전체 상담 보기</button></div> : <><header className="review-heading"><div><p>상담 검토 · {interviewStatus}</p><h1>{scenario.persona.businessName}</h1><span>{scenario.persona.borrowerName} 사장님 · {scenario.persona.industryLabel}</span></div><a href="/demo">인터뷰 {record?.completedAt ? "확인" : "이어보기"} <span>↗</span></a></header>
        <div className="review-facts"><div><span>모인 답변</span><strong>{count}<small> / 12</small></strong></div><div><span>산출 변수</span><strong>{report?.analysis.computedCount ?? 0}<small> / 100</small></strong></div><div><span>담당자 검토</span><strong className="review-state-text">{REVIEW_STATES[record?.disposition ?? "PENDING"]}</strong></div></div>
        <div className="review-tabs" aria-label="상담 검토 내용" role="tablist">{views.map(([key, label], index) => <button key={key} id={`review-tab-${key}`} role="tab" aria-selected={view === key} aria-controls={`review-panel-${key}`} tabIndex={view === key ? 0 : -1} onKeyDown={event => moveView(event, index)} onClick={() => selectView(key)}>{label}</button>)}</div>
        {!report ? <p className="review-empty">기록을 불러오는 중입니다.</p> : <div className="review-content-grid"><div className="review-panels">
          <SummaryPanel report={report} hidden={view !== "summary"} />
          <EvidencePanel report={report} hidden={view !== "evidence"} />
          <section hidden={view !== "plan"} className="review-view" id="review-panel-plan" role="tabpanel" aria-labelledby="review-tab-plan" tabIndex={0}><PanelHeading eyebrow="계획과 기록" title={<>선택한 계획은 남기고,<br />실행은 차곡차곡.</>} description="실행 기록은 새 항목을 덧붙이는 방식으로 보존됩니다." /><div className="plan-choice-list">{RECOVERY_PLANS.map(plan => <label key={plan.id} data-selected={planChoice === plan.id}><input type="radio" name="plan" checked={planChoice === plan.id} onChange={() => { editWorkspace(); setPlanChoice(plan.id); }} /><span><strong>{plan.label}</strong><small>{plan.description}</small></span></label>)}</div><div className="execution-ledger"><header><h3>실행 기록</h3><span>{record?.workspace.executionRecords.length ?? 0}건</span></header>{record?.workspace.executionRecords.length ? <ol>{record.workspace.executionRecords.map(item => <li key={item.id}><time>{item.date}</time><div><strong>{item.title}</strong><p>{item.note || "메모 없음"}</p><small>{item.id}</small></div></li>)}</ol> : <p className="review-boundary">아직 실행 기록이 없습니다. 첫 행동을 아래에 남겨주세요.</p>}<div className="execution-form"><label>실행일<input type="date" value={executionDate} onChange={e => setExecutionDate(e.target.value)} /></label><label>무엇을 했나요<input value={executionTitle} maxLength={100} onChange={e => setExecutionTitle(e.target.value)} placeholder="예: 주말 보조 인력 구인 공고 등록" /></label><label>확인 메모<textarea rows={3} maxLength={1000} value={executionNote} onChange={e => setExecutionNote(e.target.value)} placeholder="결과나 다음에 확인할 내용을 적어주세요." /></label><button className="review-primary" onClick={() => void addExecution()} disabled={busy || workspaceDirty || !executionTitle.trim()}>실행 기록 추가</button>{workspaceDirty && <small>계획 변경을 먼저 저장해 주세요.</small>}</div></div><div className="review-editor-actions"><button className="review-primary" onClick={() => void saveWorkspace()} disabled={busy || !workspaceDirty}>계획 저장</button></div></section>
          <section hidden={view !== "review"} className="review-view" id="review-panel-review" role="tabpanel" aria-labelledby="review-tab-review" tabIndex={0}><PanelHeading eyebrow="담당자 의견" title={<>확인한 사실과<br />다음 상담의 메모.</>} description="점검 상태와 의견은 답변 원문과 분리해 저장합니다." /><div className="review-editor"><section><h3>자료 점검</h3>{REVIEW_ITEMS.map(item => <label className="review-check" key={item}><input type="checkbox" disabled={busy} checked={checked.includes(item)} onChange={e => { editReview(); setChecked(current => e.target.checked ? [...current, item] : current.filter(value => value !== item)); }} /><span>{item}</span><small>{checked.includes(item) ? "확인" : "대기"}</small></label>)}</section><section><label className="review-field">검토 상태<select value={disposition} disabled={busy} onChange={e => { editReview(); setDisposition(e.target.value as ReviewDisposition); }}>{Object.entries(REVIEW_STATES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="review-field">담당자 의견<textarea rows={8} maxLength={5000} value={note} disabled={busy} onChange={e => { editReview(); setNote(e.target.value); }} placeholder="확인한 사실, 보완할 자료, 다음 상담에서 확인할 내용을 적어주세요." /></label><small>{note.length.toLocaleString()} / 5,000자 · 저장 {formatDate(record?.reviewUpdatedAt ?? null)}</small><div className="review-editor-actions"><button className="review-primary" onClick={() => void saveReview()} disabled={busy || !reviewDirty}>담당자 의견 저장</button></div></section></div></section>
          <section hidden={view !== "report"} className="review-view" id="review-panel-report" role="tabpanel" aria-labelledby="review-tab-report" tabIndex={0}><PanelHeading eyebrow="자료 내보내기" title={<>기관 상담 전,<br />준비를 한 번 더.</>} description="기관 선택은 상담 경로를 정리하는 단계이며 자동 전송이나 지원 승인을 뜻하지 않습니다." /><div className="institution-list">{INSTITUTIONS.map(item => <label key={item.id} data-selected={institutionId === item.id}><input type="radio" name="institution" checked={institutionId === item.id} onChange={() => { editWorkspace(); setInstitutionId(item.id); }} /><span><strong>{item.name}</strong><small>{item.category}</small><p>{item.description}</p></span></label>)}</div><div className="preparation-grid"><section><h3>준비 자료</h3>{PREPARATION_DOCUMENTS.map(item => <label className="review-check" key={item}><input type="checkbox" checked={documents.includes(item)} onChange={e => { editWorkspace(); setDocuments(current => e.target.checked ? [...current, item] : current.filter(value => value !== item)); }} /><span>{item}</span><small>{documents.includes(item) ? "준비" : "대기"}</small></label>)}</section><section><label className="review-field">함께 준비할 사람<select value={owner} onChange={e => { editWorkspace(); setOwner(e.target.value); }}>{PREPARATION_OWNERS.map(item => <option key={item}>{item}</option>)}</select></label><label className="review-field">다음 점검<select value={period} onChange={e => { editWorkspace(); setPeriod(e.target.value); }}>{REVIEW_PERIODS.map(item => <option key={item}>{item}</option>)}</select></label><label className="review-check final-check"><input type="checkbox" checked={reviewed} onChange={e => { editWorkspace(); setReviewed(e.target.checked); }} /><span>사장님과 준비 내용을 함께 확인했습니다.</span></label><button className="review-primary" onClick={() => void saveWorkspace()} disabled={busy || !workspaceDirty}>상담 준비 저장</button></section></div><div className="review-export"><div><strong>{record?.completedAt ? "인터뷰 완료본" : "진행 중 자료"}</strong><p>{dirty ? "저장하지 않은 내용이 있습니다. 먼저 저장해 주세요." : `100개 변수 · 실행 ${record?.workspace.executionRecords.length ?? 0}건 · 기관 ${institution?.name ?? "미선택"}`}</p></div><button disabled={busy || dirty || !count} onClick={() => void exportReport("json")}>JSON 받기 ↓</button><button className="review-primary" disabled={busy || dirty || !count} onClick={() => void exportReport("print")}>인쇄 · PDF</button></div><ReviewDocument report={report} /></section>
        </div><aside className="review-summary-rail"><span>현재 상담</span><h3>{REVIEW_STATES[record?.disposition ?? "PENDING"]}</h3><dl><div><dt>분석</dt><dd>{report.analysis.computedCount} / 100</dd></div><div><dt>선택 계획</dt><dd>{selectedPlan?.label ?? "미선택"}</dd></div><div><dt>실행 기록</dt><dd>{record?.workspace.executionRecords.length ?? 0}건</dd></div><div><dt>상담 기관</dt><dd>{institution?.name ?? "미선택"}</dd></div></dl><button onClick={() => selectView("report")}>상담 준비 열기 →</button><button onClick={() => void exportReport("print")} disabled={busy || dirty || !count}>검토자료 인쇄</button><p>기관에 자동 전송하지 않습니다.</p></aside></div>}
        <div className="review-notice" role="status">{notice}{dirty && <button onClick={() => selectView(workspaceDirty ? (view === "plan" ? "plan" : "report") : "review")}>변경 내용으로 이동 →</button>}</div></>}
    </section>
  </div></div><div className="review-print">{printable && !dirty ? <ReviewDocument report={printable} /> : <p>최신 자료를 인쇄하려면 먼저 변경 내용을 저장해 주세요.</p>}</div></main>;
}

function PanelHeading({ eyebrow, title, description }: { eyebrow: string; title: ReactNode; description: string }) { return <div className="review-section-heading"><div><span>{eyebrow}</span><h2>{title}</h2></div><p>{description}</p></div>; }
function SummaryPanel({ report, hidden }: { report: ReviewReport; hidden: boolean }) { return <section hidden={hidden} className="review-view" id="review-panel-summary" role="tabpanel" aria-labelledby="review-tab-summary" tabIndex={0}><PanelHeading eyebrow="검토 요약" title={<>말에서 근거로,<br />근거에서 다음 행동으로.</>} description="인터뷰 원문을 보존한 채 서버에서 산출 가능한 값만 연결했습니다." /><div className="analysis-ledger"><header><span>FINAL 분석 지문</span><code>{report.analysis.snapshotHash}</code></header><div className="analysis-count"><strong>{report.analysis.computedCount}</strong><span>산출</span><strong>{report.analysis.missingCount}</strong><span>MISSING</span></div></div><div className="signal-list">{report.analysis.features.filter(item => item.group === "improvement").map(item => <article key={item.name} data-state={item.state}><span>{item.state === "COMPUTED" ? "관측됨" : "자료 필요"}</span><div><h3>{item.label}</h3><p>{item.reason}</p><small>{item.displayValue} · {item.name}</small></div></article>)}</div><p className="review-boundary">이 신호는 신용점수나 개선 성공 확률이 아닙니다. 확보된 입력의 상태를 상담자가 설명하기 위한 값입니다.</p></section>; }
function EvidencePanel({ report, hidden }: { report: ReviewReport; hidden: boolean }) { return <section hidden={hidden} className="review-view" id="review-panel-evidence" role="tabpanel" aria-labelledby="review-tab-evidence" tabIndex={0}><PanelHeading eyebrow="변수와 근거" title={<>100개를 채우지 않고,<br />있는 것만 정확하게.</>} description="누락값은 0으로 바꾸지 않습니다. 산출값을 펼치면 원문 근거 번호와 계산식을 확인할 수 있습니다." />{groups.map(group => { const items = report.analysis.features.filter(item => item.group === group); const computedCount = items.filter(item => item.state === "COMPUTED").length; return <details className="feature-group" key={group} open={group === "financial" || group === "owner" || group === "improvement"}><summary><div><span>{ANALYSIS_GROUP_LABELS[group]}</span><strong>{computedCount} / {items.length}</strong></div><small>{items.length - computedCount}개 MISSING</small></summary><div className="feature-table">{items.map(item => <article key={item.name} data-state={item.state}><div><strong>{item.label}</strong><code>{item.name}</code></div><b>{item.displayValue}</b><p>{item.reason}{item.calculation ? ` · ${item.calculation}` : ""}</p><small>{item.evidenceIds.length ? item.evidenceIds.join(" · ") : `필요 원천: ${item.source}`}</small></article>)}</div></details>; })}<div className="review-section-heading compact"><div><span>Canonical 원문</span><h2>12개 질문 연결</h2></div></div>{report.evidence.map(item => <Evidence key={item.id} item={item} />)}</section>; }
