import { INSTITUTIONS, RECOVERY_PLANS, REVIEW_STATES } from "../demo/record";
import type { ReviewReport } from "./report";

export function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" }) : "기록 없음";
}

export default function ReviewDocument({ report }: { report: ReviewReport }) {
  const selectedPlan = RECOVERY_PLANS.find(item => item.id === report.recovery.selectedPlan);
  const institution = INSTITUTIONS.find(item => item.id === report.consultation.institutionId);
  return <article className="review-document">
    <header><span>동행금융 · 상담 검토자료</span><p>{report.stage === "COMPLETED" ? "인터뷰 완료본" : "진행 중 자료"} · {REVIEW_STATES[report.review.disposition]}</p><h1>{report.persona.businessName}</h1><p>{report.persona.borrowerName} 사장님 · {report.persona.industryLabel} · {report.scope}</p><small>자료 조회 {formatDate(report.preparedAt)} (한국 시간) · 답변 버전 {report.answerRevision} · 검토 버전 {report.review.revision} · 분석 지문 {report.analysis.snapshotHash}</small></header>
    <section><h2>01. 사업 현황과 계획</h2><dl>{report.evidence.filter(item => ["monthly_average_sales", "fixed_operating_costs", "operating_day_drop_reason", "improvement_plan", "execution_readiness", "seasonality_outlook"].includes(item.questionId)).map(item => <div key={item.id}><dt>{item.label}</dt><dd>{item.originalText ?? "미응답"}<small>근거: {item.id} · {item.status === "MISSING" ? "미응답" : "본인 진술 · 증빙 미확인"}</small></dd></div>)}</dl></section>
    <section><h2>02. 보완할 정보와 점검 항목</h2><p>{report.missing.length ? `미응답 ${report.missing.length}개: ${report.missing.map(item => item.label).join(" · ")}` : "모든 질문에 답변이 있습니다. 답변 수집과 사실 확인은 별개입니다."}</p><ul>{report.review.checklist.map(item => <li key={item.label}>{item.checked ? "[담당자 확인]" : "[확인 필요]"} {item.label}</li>)}</ul><p>점검 표시는 담당자가 선택한 상태이며, 원본 자료의 자동 검증 결과가 아닙니다.</p></section>
    <section><h2>03. 분석 변수와 회복 기록</h2><p>feature_schema_v2 100개 중 {report.analysis.computedCount}개 산출 · {report.analysis.missingCount}개 MISSING</p><dl>{report.analysis.features.filter(item => item.state === "COMPUTED").map(item => <div key={item.name}><dt>{item.label}</dt><dd>{item.displayValue}<small>{item.name} · {item.evidenceIds.join(" · ")}</small></dd></div>)}</dl><p>선택 계획: {selectedPlan?.label ?? "미선택"}</p>{report.recovery.executionRecords.length ? <ul>{report.recovery.executionRecords.map(item => <li key={item.id}>{item.date} · {item.title}{item.note ? ` — ${item.note}` : ""}</li>)}</ul> : <p>저장된 실행 기록이 없습니다.</p>}</section>
    <section><h2>04. 기관 상담 준비</h2><p>상담 기관: {institution?.name ?? "미선택"}</p><p>담당: {report.consultation.owner} · 점검: {report.consultation.reviewPeriod}</p><ul>{report.consultation.documents.map(item => <li key={item}>{item}</li>)}</ul><p>{report.consultation.reviewed ? "준비 항목 검토 완료" : "준비 항목 검토 전"}</p></section>
    <section><h2>05. 담당자 검토 의견</h2><p>{REVIEW_STATES[report.review.disposition]} · 저장 {formatDate(report.review.updatedAt)}</p><blockquote>{report.review.note || "저장된 검토 의견이 없습니다."}</blockquote></section>
    <section><h2>06. 전체 인터뷰와 원문 근거</h2>{report.evidence.map(item => <div className="document-answer" key={item.id}><h3>{String(item.number).padStart(2, "0")}. {item.label}</h3><p>{item.question}</p><blockquote>{item.originalText ?? "미응답"}</blockquote><small>{item.id}</small></div>)}</section>
    <footer><h2>자료 범위</h2>{report.limitations.map(line => <p key={line}>{line}</p>)}</footer>
  </article>;
}
