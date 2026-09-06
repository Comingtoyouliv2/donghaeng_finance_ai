import { OPERATING_DAY_SCENARIO as scenario, INTERVIEW_CATEGORIES } from "../demo/scenario";
import { REVIEW_ITEMS, type InterviewRecord } from "../demo/record";

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
  return {
    schemaVersion: "donghaeng_interview_review_v1",
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
    review: { disposition: record.disposition, note: record.note, revision: record.reviewRevision, updatedAt: record.reviewUpdatedAt, checklist: REVIEW_ITEMS.map(label => ({ label, checked: record.checklist.includes(label) })) },
    limitations: ["입력된 답변을 질문별로 정리한 자료입니다. 원본 증빙의 진위를 확인하지 않았습니다.", "거래자료·신용정보·94개 합성 변수·100개 분석 변수는 이 자료에 연결되어 있지 않습니다.", "신용등급·대출 승인·상환 가능액을 산정하지 않으며, 금융기관에 자동 전송하지 않습니다."],
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
