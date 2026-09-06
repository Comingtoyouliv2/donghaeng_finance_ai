import { OPERATING_DAY_SCENARIO as scenario, INTERVIEW_CATEGORIES } from "../demo/scenario";
import { REVIEW_ITEMS, type InterviewRecord } from "../demo/record";
import { buildAnalysis } from "./analysis";

/** Adapted institution report flow from service-review-completion (c440f0b).
 * This adapter uses this site's interview record, never the upstream synthetic scorecard.
 * Raw statements are not treated as verified amounts or converted into credit scores.
 */
export function buildReviewReport(record: InterviewRecord, preparedAt: string) {
  const answers = new Map(record.answers.map(answer => [answer.questionId, answer.text]));
  const evidence = scenario.questions.map((question, index) => ({
    id: `answer:${scenario.id}:${question.id}`,
    number: index + 1,
    questionId: question.id,
    label: question.label,
    category: question.category,
    question: question.question,
    originalText: answers.get(question.id) ?? null,
    status: answers.has(question.id) ? "SELF_REPORTED" as const : "MISSING" as const,
    verified: false,
  }));
  const analysis = buildAnalysis(record);
  return {
    schemaVersion: "donghaeng_interview_review_v2",
    preparedAt,
    scenarioId: scenario.id,
    persona: scenario.persona,
    scope: "인터뷰 답변 기반 상담 검토자료 · 시연",
    deliveryStatus: "NOT_SENT",
    stage: record.completedAt ? "COMPLETED" : "IN_PROGRESS",
    answerRevision: record.revision,
    completedAt: record.completedAt,
    answerUpdatedAt: record.updatedAt,
    evidence,
    coverage: INTERVIEW_CATEGORIES.map(category => ({ category, total: evidence.filter(item => item.category === category).length, answered: evidence.filter(item => item.category === category && item.originalText !== null).length })),
    missing: evidence.filter(item => item.status === "MISSING").map(item => ({ id: item.id, label: item.label })),
    analysis,
    recovery: { selectedPlan: record.workspace.planChoice, executionRecords: record.workspace.executionRecords },
    consultation: { institutionId: record.workspace.institutionId, documents: record.workspace.preparationDocuments, owner: record.workspace.preparationOwner, reviewPeriod: record.workspace.reviewPeriod, reviewed: record.workspace.preparationReviewed, revision: record.workspace.revision, updatedAt: record.workspace.updatedAt },
    review: { disposition: record.disposition, note: record.note, revision: record.reviewRevision, updatedAt: record.reviewUpdatedAt, checklist: REVIEW_ITEMS.map(label => ({ label, checked: record.checklist.includes(label) })) },
    limitations: ["입력된 답변을 질문별로 정리한 자료입니다. 원본 증빙의 진위를 확인하지 않았습니다.", "100개 분석 변수 사전을 포함하지만 인터뷰에 없는 거래·신용·외부 값은 MISSING이며 0으로 추정하지 않습니다.", "산출값은 상담 설명을 위한 관측값입니다. 신용등급·대출 승인·상환 가능액을 산정하지 않으며, 금융기관에 자동 전송하지 않습니다."],
  };
}
export type ReviewReport = ReturnType<typeof buildReviewReport>;
export type ReviewEvidence = ReviewReport["evidence"][number];
export async function requestReport(): Promise<ReviewReport> {
  const response = await fetch("/api/interview/report", { cache: "no-store" });
  const data = await response.json() as ReviewReport & { error?: string };
  if (!response.ok) throw new Error(data.error || "검토자료를 불러오지 못했습니다.");
  return data;
}
