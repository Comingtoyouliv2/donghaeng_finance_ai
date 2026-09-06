export interface AcceptedAnswer { questionId: string; text: string }
export interface InterviewRecord {
  answers: AcceptedAnswer[];
  revision: number;
  completedAt: string | null;
  updatedAt: string | null;
  note: string;
  checklist: string[];
  disposition: ReviewDisposition;
  reviewRevision: number;
  reviewUpdatedAt: string | null;
}
// Review vocabulary shared with service-review-completion's ModelingReviewDraft.
export const REVIEW_STATES = { PENDING: "검토 중", NEEDS_INFORMATION: "자료 보완 필요", READY_FOR_REVIEW: "기관 검토 준비", HOLD: "보류" } as const;
export type ReviewDisposition = keyof typeof REVIEW_STATES;
export const REVIEW_ITEMS = ["매출·비용 기준 기간 확인", "영업일 감소 사유 증빙", "회복 목표와 실행 일정 확인", "예산·인력 준비 상태 확인"];
export async function requestRecord(body?: unknown): Promise<InterviewRecord> {
  const response = await fetch("/api/interview", {
    method: body ? "PUT" : "GET",
    cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json() as InterviewRecord & { error?: string };
  if (!response.ok) throw new Error(data.error || "기록을 불러오지 못했습니다. 다시 시도해 주세요.");
  return data;
}
