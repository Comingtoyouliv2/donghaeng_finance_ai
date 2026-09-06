export interface AcceptedAnswer { questionId: string; text: string }
export interface ExecutionRecord {
  id: string;
  date: string;
  title: string;
  note: string;
  createdAt: string;
}
export interface ConsultationWorkspace {
  planChoice: string | null;
  executionRecords: ExecutionRecord[];
  institutionId: string | null;
  preparationDocuments: string[];
  preparationOwner: string;
  reviewPeriod: string;
  preparationReviewed: boolean;
  revision: number;
  updatedAt: string | null;
}
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
  workspace: ConsultationWorkspace;
}
// Review vocabulary shared with service-review-completion's ModelingReviewDraft.
export const REVIEW_STATES = { PENDING: "검토 중", NEEDS_INFORMATION: "자료 보완 필요", READY_FOR_REVIEW: "기관 검토 준비", HOLD: "보류" } as const;
export type ReviewDisposition = keyof typeof REVIEW_STATES;
export const REVIEW_ITEMS = ["매출·비용 기준 기간 확인", "영업일 감소 사유 증빙", "회복 목표와 실행 일정 확인", "예산·인력 준비 상태 확인"];
export const RECOVERY_PLANS = [
  { id: "operating-days", label: "영업일 회복", description: "월 영업일을 23일에서 29일까지 늘리고 장부로 확인합니다." },
  { id: "staffing-first", label: "일손 확보 우선", description: "일손 부족을 먼저 해소한 뒤 영업일 확대를 시작합니다." },
] as const;
export const INSTITUTIONS = [
  { id: "semas", name: "소상공인시장진흥공단", category: "소상공인 지원·정책자금", description: "지원사업과 정책자금의 공고, 지역 상담 창구를 확인합니다." },
  { id: "koreg", name: "지역신용보증재단", category: "사업장 소재지의 보증 상담", description: "지역별 재단과 상담 경로를 확인합니다." },
  { id: "kodit", name: "신용보증기금", category: "기업 보증·경영지원", description: "보증과 경영지원 제도, 담당 영업점의 상담 경로를 확인합니다." },
] as const;
export const PREPARATION_DOCUMENTS = ["사업자등록 정보 확인", "매출·비용 증빙 확인", "기존 채무·상환 내역 확인", "자금 목적·필요 금액 정리"] as const;
export const PREPARATION_OWNERS = ["사장님 + 담당 상담사", "사장님 + 경영지원 담당자"] as const;
export const REVIEW_PERIODS = ["2주 후 점검", "4주 후 점검", "상담 시 일정 협의"] as const;
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
