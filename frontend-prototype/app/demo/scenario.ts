export type InterviewCategory = "현재 상황" | "개선 계획" | "향후 전망" | "생활 여력";

export interface InterviewScenarioQuestion {
  id: string;
  label: string;
  category: InterviewCategory;
  question: string;
  suggestedAnswer: string;
}

/**
 * Source: itproanalysis/donghaeng_finance_ai, feature/demo-scenario.
 *
 * These sentences intentionally match the validated operating-day scenario:
 * the source repository's parsers and scorecard checks rely on the amounts,
 * time horizons, and operational details remaining exact.
 */
export const OPERATING_DAY_SCENARIO = {
  id: "operating-day",
  persona: {
    borrowerName: "표기웅",
    businessName: "느티나무감자탕",
    industryLabel: "음식점",
  },
  focus: {
    baselineOperatingDays: 23,
    targetOperatingDays: 29,
    horizonMonths: 6,
    planBudgetWon: 800_000,
  },
  questions: [
    {
      id: "monthly_average_sales",
      label: "월평균 매출",
      category: "현재 상황",
      question: "먼저 최근 매출 흐름부터 편하게 말씀해 주세요. 최근 3개월 기준 월평균 매출은 어느 정도인가요?",
      suggestedAnswer: "최근 3개월 월평균 매출은 2600만원입니다.",
    },
    {
      id: "fixed_operating_costs",
      label: "월 고정 운영비",
      category: "현재 상황",
      question: "임차료·인건비처럼 매달 반복되는 운영비는 평균 얼마인가요?",
      suggestedAnswer: "고정비는 월 1190만원입니다.",
    },
    {
      id: "operating_day_drop_reason",
      label: "영업일 감소 사유",
      category: "현재 상황",
      question: "최근 3개월은 문을 연 날이 줄어든 것으로 확인됩니다. 어떤 사정이 있었고, 지금은 해소됐나요?",
      suggestedAnswer: "지난봄에 허리를 다쳐서 자주 문을 닫았습니다. 지금은 치료가 끝나서 다시 매일 열고 있습니다.",
    },
    {
      id: "improvement_plan",
      label: "사업 개선 계획",
      category: "개선 계획",
      question: "지금 사업에서 가장 먼저 바꾸고 싶은 한 가지와 구체적인 목표를 알려주세요.",
      suggestedAnswer: "가장 큰 문제는 일손이 부족해서 가게 문을 못 여는 날이 생기는 것입니다. 여는 날을 지금 23일에서 6개월 안에 29일까지 늘리고, 장부로 매번 확인하겠습니다.",
    },
    {
      id: "execution_readiness",
      label: "실행 준비도",
      category: "개선 계획",
      question: "그 계획을 시작하려면 지금 준비된 것과 아직 막혀 있는 것은 무엇인가요?",
      suggestedAnswer: "예산 80만원은 확보했고 일정도 정했습니다. 아직 일손이 부족합니다.",
    },
    {
      id: "confirmed_reservations",
      label: "확정 예약 건수",
      category: "향후 전망",
      question: "앞으로 4주 안에 이미 확정된 예약이나 주문이 있다면 몇 건인가요?",
      suggestedAnswer: "앞으로 4주 안에 확정된 예약이나 주문은 0건입니다.",
    },
    {
      id: "seasonality_outlook",
      label: "계절성 전망",
      category: "향후 전망",
      question: "앞으로 3개월의 손님이나 주문 전망과 그렇게 생각한 이유를 알려주세요.",
      suggestedAnswer: "앞으로 3개월은 비수기라 작년 이맘때도 주문이 줄었고 올해도 줄 것 같습니다.",
    },
    {
      id: "essential_household_expenses",
      label: "월 필수 가계지출",
      category: "생활 여력",
      question: "주거비·교육비 등 꼭 필요한 가계지출은 한 달에 대략 얼마인가요?",
      suggestedAnswer: "필수 가계지출은 월 220만원입니다.",
    },
    {
      id: "emergency_buffer_months",
      label: "비상자금 보유기간",
      category: "생활 여력",
      question: "현재 비상자금으로 필수 생활비를 대략 몇 개월 감당할 수 있나요?",
      suggestedAnswer: "비상자금으로 필수 생활비를 3개월 감당할 수 있습니다.",
    },
    {
      id: "platform_fee_pressure",
      label: "플랫폼 비용부담",
      category: "현재 상황",
      question: "배달이나 온라인 플랫폼 수수료가 운영에 부담된 부분이 있었나요?",
      suggestedAnswer: "배달은 거의 안 해서 플랫폼 수수료 부담 없습니다.",
    },
    {
      id: "hall_customer_decline",
      label: "홀 손님 변화",
      category: "현재 상황",
      question: "최근 홀 손님이나 홀 매출에 변화가 있었나요?",
      suggestedAnswer: "홀 손님은 문을 못 연 날 말고는 그대로입니다.",
    },
    {
      id: "repeat_customer_share",
      label: "단골 매출 비중",
      category: "현재 상황",
      question: "최근 한 달 기준으로 단골 매출은 몇 퍼센트 정도인가요?",
      suggestedAnswer: "최근 한 달 기준 단골 매출은 45%입니다.",
    },
  ] satisfies InterviewScenarioQuestion[],
} as const;

export const INTERVIEW_CATEGORIES: InterviewCategory[] = ["현재 상황", "개선 계획", "향후 전망", "생활 여력"];
