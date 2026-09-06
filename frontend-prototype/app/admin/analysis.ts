import { OPERATING_DAY_SCENARIO as scenario } from "../demo/scenario";
import type { InterviewRecord } from "../demo/record";

export type AnalysisGroup = "business" | "financial" | "credit" | "operation" | "owner" | "external" | "improvement";
export type AnalysisState = "COMPUTED" | "MISSING" | "NOT_CALCULABLE";
export type AnalysisValue = number | boolean | string | null;

type Definition = { name: string; label: string; group: AnalysisGroup; source: string };
const rows = (group: AnalysisGroup, source: string, entries: readonly (readonly [string, string])[]): Definition[] => entries.map(([name, label]) => ({ name, label, group, source }));

/** The complete feature_schema_v2 dictionary used by service-review-completion. */
export const FEATURE_DICTIONARY = [
  ...rows("business", "사업 프로필·매출 이력", [
    ["biz_industry_code", "업종 코드"], ["biz_business_age_months", "사업 업력(개월)"], ["biz_store_count", "사업장 수"], ["biz_employee_count", "종업원 수"],
    ["biz_active_months_12m", "최근 12개월 영업월 수"], ["biz_sales_active_month_ratio_12m", "최근 12개월 매출 발생월 비율"], ["biz_zero_sales_month_count_12m", "최근 12개월 매출 0월 수"], ["biz_consecutive_active_months", "연속 영업 개월"],
    ["biz_recent_activity_flag", "최근 영업 활동 여부"], ["biz_sales_recovery_from_min_6m", "6개월 저점 대비 매출 회복률"], ["biz_positive_growth_month_count_6m", "6개월 양(+) 성장월 수"], ["biz_sales_cv_6m", "6개월 매출 변동계수"],
  ]),
  ...rows("financial", "거래·재무 자료", [
    ["fin_sales_avg_3m", "최근 3개월 평균 매출"], ["fin_sales_avg_6m", "최근 6개월 평균 매출"], ["fin_sales_avg_12m", "최근 12개월 평균 매출"], ["fin_sales_growth_3m", "최근 3개월 매출 증가율"], ["fin_sales_growth_6m", "최근 6개월 매출 증가율"], ["fin_sales_trend_slope_6m", "최근 6개월 매출 추세 기울기"], ["fin_sales_volatility_6m", "최근 6개월 매출 변동성"],
    ["fin_avg_month_end_balance_3m", "최근 3개월 월말 잔액 평균"], ["fin_min_month_end_balance_6m", "최근 6개월 월말 잔액 최저값"], ["fin_month_end_balance_growth_3m", "최근 3개월 월말 잔액 증가율"], ["fin_cash_inflow_avg_3m", "최근 3개월 현금 유입 평균"], ["fin_cash_outflow_avg_3m", "최근 3개월 현금 유출 평균"], ["fin_net_cashflow_avg_3m", "최근 3개월 순현금흐름 평균"], ["fin_net_cashflow_positive_month_ratio_6m", "최근 6개월 순현금흐름 양수월 비율"], ["fin_cashflow_trend_slope_6m", "최근 6개월 현금흐름 추세"], ["fin_cashflow_deficit_month_count_6m", "최근 6개월 현금흐름 적자월 수"], ["fin_cash_buffer_days_est", "추정 현금 버퍼 일수"],
    ["fin_fixed_cost_ratio", "고정비/매출 비율"], ["fin_marketing_cost_ratio", "마케팅비/매출 비율"], ["fin_interest_cost_ratio", "이자비용/매출 비율"], ["fin_fixed_cost_gap_peer", "유사업체 대비 고정비 비율 차이"], ["fin_marketing_cost_gap_peer", "유사업체 대비 마케팅비 비율 차이"], ["fin_cashflow_to_sales_ratio", "순현금흐름/매출 비율"],
  ]),
  ...rows("credit", "승인된 신용 자료", [
    ["crd_total_debt", "총 채무"], ["crd_high_interest_debt", "고금리 채무"], ["crd_monthly_debt_payment", "월 채무 상환액"], ["crd_delinquency_count_12m", "12개월 연체 횟수"], ["crd_delinquency_days_12m", "12개월 연체 일수"], ["crd_current_delinquency_flag", "현재 연체 여부"], ["crd_credit_utilization", "신용 한도 사용률"], ["crd_credit_score", "공식 신용점수 원천값"], ["crd_debt_to_sales_ratio", "채무/매출 비율"], ["crd_payment_to_sales_ratio", "상환액/매출 비율"], ["crd_total_debt_change_3m", "3개월 총 채무 변화"], ["crd_high_interest_debt_change_3m", "3개월 고금리 채무 변화"], ["crd_credit_utilization_change_3m", "3개월 한도 사용률 변화"], ["crd_delinquency_recovery_trend", "연체 회복 추세"], ["crd_consecutive_months_no_delinquency", "연속 무연체 개월"],
  ]),
  ...rows("operation", "운영 자료·인터뷰", [
    ["ops_sales_per_employee", "직원 1인당 매출"], ["ops_sales_per_store", "매장 1곳당 매출"], ["ops_labor_cost_efficiency", "인건비 효율"], ["ops_marketing_roi_proxy", "마케팅 ROI 대용치"], ["ops_repeat_customer_ratio", "반복고객 비중"], ["ops_online_sales_ratio", "온라인 매출 비중"], ["ops_digital_payment_ratio", "디지털 결제 비중"], ["ops_top_product_sales_ratio", "상위 상품 매출 비중"], ["ops_top_channel_sales_ratio", "상위 채널 매출 비중"], ["ops_business_personal_account_separation_ratio", "사업·개인 계좌 분리 비율"],
  ]),
  ...rows("owner", "구조화 인터뷰", [
    ["own_primary_problem_category", "주된 문제 범주"], ["own_secondary_problem_category", "부차 문제 범주"], ["own_problem_self_awareness_score", "문제 인식의 관측 구체성"], ["own_problem_cause_specificity", "원인 설명 구체성"], ["own_prior_action_count", "사전 실행 행동 수"], ["own_prior_action_success_count", "성공으로 확인된 사전 행동 수"], ["own_prior_action_failure_count", "실패로 확인된 사전 행동 수"], ["own_goal_category", "선택한 목표 범주"], ["own_goal_target_value", "목표 수치"], ["own_goal_target_unit", "목표 수치 단위"], ["own_goal_horizon_days", "목표 기간(일)"], ["own_goal_self_selected_flag", "직접 선택 목표 여부"], ["own_plan_action_category", "계획 행동 범주"], ["own_plan_start_date", "계획 시작일"], ["own_plan_horizon_days", "계획 기간(일)"], ["own_plan_budget", "실행 예산"], ["own_plan_weekly_time_hours", "주당 가용 실행시간"], ["own_plan_measurement_metric", "확인 지표"], ["own_plan_constraint_count", "실행 제약 수"], ["own_plan_specificity_score", "계획 요소 관측 충족도"],
  ]),
  ...rows("external", "외부 맥락", [
    ["ext_peer_sales_growth_3m", "유사업체 3개월 매출 성장"], ["ext_peer_sales_volatility_6m", "유사업체 6개월 매출 변동성"], ["ext_peer_marketing_cost_ratio", "유사업체 마케팅비 비율"], ["ext_peer_fixed_cost_ratio", "유사업체 고정비 비율"], ["ext_peer_repeat_customer_ratio", "유사업체 반복고객 비중"], ["ext_sales_growth_gap_peer", "유사업체 대비 매출 성장 차이"], ["ext_cost_ratio_gap_peer", "유사업체 대비 비용 비율 차이"], ["ext_foot_traffic_change_3m", "3개월 유동인구 변화"], ["ext_competitor_count_change_6m", "6개월 경쟁업체 수 변화"], ["ext_industry_growth_6m", "6개월 업종 성장"], ["ext_industry_volatility_12m", "12개월 업종 변동성"], ["ext_industry_seasonality", "업종 계절성"],
  ]),
  ...rows("improvement", "확보된 입력의 설명용 파생", [
    ["imp_recovery_momentum", "회복 모멘텀의 관측 신호"], ["imp_cashflow_stabilization", "현금흐름 안정화 관측 신호"], ["imp_cost_adjustment_headroom", "비용 조정 여지의 관측 신호"], ["imp_sales_recovery_potential", "매출 회복 가능성의 관측 신호"], ["imp_plan_specificity", "목표·기간·예산·측정·제약의 명시성"], ["imp_plan_feasibility", "계획 현실성 판단 입력 충족도"], ["imp_goal_problem_alignment", "문제와 목표의 관측된 범주 정합성"], ["imp_overall_improvement_signal", "개선가능성 설명용 종합 신호"],
  ]),
] as const;

export const ANALYSIS_GROUP_LABELS: Record<AnalysisGroup, string> = { business: "사업 현황", financial: "재무·거래", credit: "채무·신용", operation: "운영 효율", owner: "사장님 계획", external: "외부 환경", improvement: "개선 신호" };

function answerMap(record: InterviewRecord) { return new Map(record.answers.map(answer => [answer.questionId, answer.text.trim()])); }
function evidenceId(questionId: string) { return `answer:${scenario.id}:${questionId}`; }
function isUncertain(text: string | undefined) { return !text || /모르|확인\s*(?:안|못)|기억\s*(?:안|못)|불확실/.test(text); }
function numberFrom(text: string | undefined, pattern: RegExp): number | null {
  if (isUncertain(text)) return null;
  const match = text!.match(pattern);
  if (!match) return null;
  const value = Number(match[1].replaceAll(",", ""));
  return Number.isFinite(value) ? value : null;
}
function moneyFrom(text: string | undefined): number | null {
  if (isUncertain(text)) return null;
  const match = text!.match(/([0-9][0-9,]*(?:\.[0-9]+)?)\s*(억원|억|천만원|백만원|만원|원)/);
  if (!match) return null;
  const value = Number(match[1].replaceAll(",", ""));
  const multiplier = match[2] === "억원" || match[2] === "억" ? 100_000_000 : match[2] === "천만원" ? 10_000_000 : match[2] === "백만원" ? 1_000_000 : match[2] === "만원" ? 10_000 : 1;
  return Number.isFinite(value) ? value * multiplier : null;
}
function stableHash(text: string) {
  let a = 0x811c9dc5, b = 0x9e3779b9;
  for (let i = 0; i < text.length; i += 1) { a = Math.imul(a ^ text.charCodeAt(i), 0x01000193); b = Math.imul(b ^ text.charCodeAt(i), 0x85ebca6b); }
  return `fnv1a64:${(a >>> 0).toString(16).padStart(8, "0")}${(b >>> 0).toString(16).padStart(8, "0")}`;
}

export interface AnalysisFeature extends Definition {
  state: AnalysisState;
  value: AnalysisValue;
  displayValue: string;
  evidenceIds: string[];
  calculation: string | null;
  reason: string;
  modelCandidate: false;
}

export function buildAnalysis(record: InterviewRecord) {
  const answers = answerMap(record);
  const sales = moneyFrom(answers.get("monthly_average_sales"));
  const costs = moneyFrom(answers.get("fixed_operating_costs"));
  const repeat = numberFrom(answers.get("repeat_customer_share"), /([0-9]+(?:\.[0-9]+)?)\s*%/);
  const reservations = numberFrom(answers.get("confirmed_reservations"), /([0-9]+)\s*건/);
  const plan = answers.get("improvement_plan");
  const readiness = answers.get("execution_readiness");
  const dropReason = answers.get("operating_day_drop_reason");
  const dayValues = plan && !isUncertain(plan) ? [...plan.matchAll(/([0-9]+)\s*일/g)].map(match => Number(match[1])) : [];
  const horizonMonths = numberFrom(plan, /([0-9]+)\s*개월/);
  const budget = moneyFrom(readiness);
  const constraintCount = readiness && /부족|막혀|필요/.test(readiness) ? 1 : readiness ? 0 : null;
  const measurement = plan && /장부/.test(plan) ? "영업 장부" : null;
  const planParts = [dayValues.length >= 2, horizonMonths !== null, budget !== null, measurement !== null, constraintCount !== null].filter(Boolean).length;
  const planSpecificity = plan ? planParts / 5 : null;
  const planFeasibility = plan && readiness ? [horizonMonths !== null, budget !== null, constraintCount !== null].filter(Boolean).length / 3 : null;
  const resolved = dropReason ? /해소|치료가?\s*끝|다시\s*(?:매일|정상)/.test(dropReason) : null;

  const computed = new Map<string, { value: AnalysisValue; displayValue: string; evidenceIds: string[]; calculation?: string; reason: string }>();
  const set = (name: string, value: AnalysisValue, displayValue: string, ids: string[], reason: string, calculation?: string) => computed.set(name, { value, displayValue, evidenceIds: ids.map(evidenceId), reason, calculation });
  set("biz_industry_code", "RESTAURANT", scenario.persona.industryLabel, [], "상담 시나리오의 사업 프로필에 등록된 업종입니다.");
  if (sales !== null) set("fin_sales_avg_3m", sales, `${sales.toLocaleString("ko-KR")}원`, ["monthly_average_sales"], "최근 3개월 월평균 매출에 대한 본인 진술입니다.");
  if (sales !== null && costs !== null && sales > 0) set("fin_fixed_cost_ratio", costs / sales, `${((costs / sales) * 100).toFixed(1)}%`, ["monthly_average_sales", "fixed_operating_costs"], "같은 월 기준 답변 두 개로 계산했습니다. 좋고 나쁨을 판단하지 않습니다.", "월 고정 운영비 ÷ 월평균 매출");
  if (repeat !== null && repeat >= 0 && repeat <= 100) set("ops_repeat_customer_ratio", repeat / 100, `${repeat}%`, ["repeat_customer_share"], "최근 한 달 단골 매출 비중에 대한 본인 진술입니다.", "응답 백분율 ÷ 100");
  if (plan) {
    set("own_primary_problem_category", /일손|인력/.test(plan) ? "인력·영업 연속성" : "직접 진술 계획", plan.includes("일손") ? "인력·영업 연속성" : "직접 진술 계획", ["improvement_plan"], "계획 원문에서 직접 확인되는 문제 범주입니다.");
    if (dayValues.length >= 2) set("own_goal_target_value", dayValues[1], `${dayValues[1]}일`, ["improvement_plan"], "계획 원문에 명시된 목표 영업일입니다.");
    if (dayValues.length >= 2) set("own_goal_target_unit", "일/월", "일/월", ["improvement_plan"], "목표 수치의 단위입니다.");
    set("own_goal_category", /영업일|문을.*날|여는 날/.test(plan) ? "영업일 회복" : "사업 개선", /영업일|문을.*날|여는 날/.test(plan) ? "영업일 회복" : "사업 개선", ["improvement_plan"], "사장님이 말한 계획의 목표 범주입니다.");
    set("own_goal_self_selected_flag", true, "직접 선택", ["improvement_plan"], "인터뷰에서 사장님이 직접 말한 계획입니다.");
    set("own_plan_action_category", /일손|인력/.test(plan) ? "인력 확보·영업일 확대" : "직접 진술 행동", /일손|인력/.test(plan) ? "인력 확보·영업일 확대" : "직접 진술 행동", ["improvement_plan"], "원문에서 확인되는 실행 행동입니다.");
    if (horizonMonths !== null) { set("own_goal_horizon_days", horizonMonths * 30, `${horizonMonths * 30}일`, ["improvement_plan"], "원문 개월 수를 표시용 30일 기준으로 환산했습니다.", "개월 × 30일"); set("own_plan_horizon_days", horizonMonths * 30, `${horizonMonths * 30}일`, ["improvement_plan"], "원문 개월 수를 표시용 30일 기준으로 환산했습니다.", "개월 × 30일"); }
    if (measurement) set("own_plan_measurement_metric", measurement, measurement, ["improvement_plan"], "원문에 명시된 확인 방법입니다.");
  }
  if (budget !== null) set("own_plan_budget", budget, `${budget.toLocaleString("ko-KR")}원`, ["execution_readiness"], "실행 준비 답변에 명시된 예산입니다.");
  if (constraintCount !== null) set("own_plan_constraint_count", constraintCount, `${constraintCount}개`, ["execution_readiness"], "답변에 명시된 남은 장애물의 수입니다.");
  if (planSpecificity !== null) set("own_plan_specificity_score", planSpecificity, `${Math.round(planSpecificity * 100)}%`, ["improvement_plan", ...(readiness ? ["execution_readiness"] : [])], "목표·기간·예산·측정·제약 중 원문에 명시된 요소의 비율입니다.", "확인된 계획 요소 ÷ 5");
  if (planSpecificity !== null) set("imp_plan_specificity", planSpecificity, `${Math.round(planSpecificity * 100)}%`, ["improvement_plan", ...(readiness ? ["execution_readiness"] : [])], "계획의 성공 확률이 아니라 명시된 요소의 충족도입니다.", "확인된 계획 요소 ÷ 5");
  if (planFeasibility !== null) set("imp_plan_feasibility", planFeasibility, `${Math.round(planFeasibility * 100)}%`, ["improvement_plan", "execution_readiness"], "계획 현실성 판단에 필요한 입력이 얼마나 모였는지 나타냅니다.", "확인된 기간·예산·제약 ÷ 3");
  if (plan && dropReason) set("imp_goal_problem_alignment", /일손|인력|영업일|문/.test(plan + dropReason) ? 1 : 0, /일손|인력|영업일|문/.test(plan + dropReason) ? "직접 연결" : "추가 확인", ["operating_day_drop_reason", "improvement_plan"], "문제 사유와 목표가 같은 운영 주제를 다루는지 확인한 설명값입니다.");
  if (resolved !== null && plan) set("imp_recovery_momentum", resolved ? 1 : 0, resolved ? "해소 진술 있음" : "해소 확인 필요", ["operating_day_drop_reason", "improvement_plan"], "원인 해소 여부와 회복 계획을 함께 본 관측 신호이며 신용점수가 아닙니다.");
  if (reservations !== null || repeat !== null) set("imp_sales_recovery_potential", reservations === 0 && repeat !== null ? repeat / 100 : repeat !== null ? repeat / 100 : 0, reservations === 0 ? `예약 0건 · 단골 ${repeat ?? "미확인"}%` : "수요 근거 일부 확인", ["confirmed_reservations", ...(repeat !== null ? ["repeat_customer_share"] : [])], "확정 예약과 반복고객의 직접 진술만 묶은 설명값입니다.");

  const features: AnalysisFeature[] = FEATURE_DICTIONARY.map(definition => {
    const value = computed.get(definition.name);
    return value ? { ...definition, state: "COMPUTED", value: value.value, displayValue: value.displayValue, evidenceIds: value.evidenceIds, calculation: value.calculation ?? null, reason: value.reason, modelCandidate: false } : { ...definition, state: "MISSING", value: null, displayValue: "MISSING", evidenceIds: [], calculation: null, reason: `${definition.source}가 현재 상담 기록에 연결되지 않았습니다. 0으로 대체하지 않습니다.`, modelCandidate: false };
  });
  const computedCount = features.filter(feature => feature.state === "COMPUTED").length;
  const canonical = scenario.questions.map(question => ({ infoCode: question.id, label: question.label, state: answers.has(question.id) ? "PRESENT" as const : "MISSING" as const, rawText: answers.get(question.id) ?? null, evidenceId: evidenceId(question.id), verification: answers.has(question.id) ? "SELF_REPORTED" as const : null }));
  return { schemaVersion: "feature_schema_v2" as const, dictionarySize: FEATURE_DICTIONARY.length, computedCount, missingCount: FEATURE_DICTIONARY.length - computedCount, snapshotType: record.completedAt ? "FINAL" as const : "PREVIEW" as const, snapshotHash: stableHash(JSON.stringify({ scenarioId: scenario.id, revision: record.revision, answers: record.answers })), canonical, features };
}
