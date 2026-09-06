import { OPERATING_DAY_SCENARIO } from "./scenario";

export interface InterviewTurnAnswer {
  questionId: string;
  text: string;
}

export interface InterviewTurnRequest {
  currentQuestionId: string;
  answer: string;
  answers: InterviewTurnAnswer[];
}

export interface InterviewTurnResponse {
  acknowledgement: string;
  nextQuestionId: string | null;
  nextQuestion: string | null;
  provider: "claude" | "framework";
  configured: boolean;
}

interface ClaudeToolUse {
  type?: unknown;
  name?: unknown;
  input?: unknown;
}

interface ClaudeMessageResponse {
  content?: ClaudeToolUse[];
}

interface TurnOptions {
  apiKey?: string;
  model?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-5";
const MAX_ACKNOWLEDGEMENT = 220;
const MAX_QUESTION = 520;

function cleanText(value: unknown, maximum: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/\s+/g, " ");
  return text.length >= 2 && text.length <= maximum ? text : null;
}

export function frameworkTurn(currentQuestionId: string, configured = false): InterviewTurnResponse {
  const questions = OPERATING_DAY_SCENARIO.questions;
  const currentIndex = questions.findIndex((question) => question.id === currentQuestionId);
  const current = questions[currentIndex];
  const next = currentIndex >= 0 ? questions[currentIndex + 1] : undefined;
  return {
    acknowledgement: current ? `${current.label}에 대해 말씀해주신 내용을 기록했습니다.` : "말씀해주신 내용을 기록했습니다.",
    nextQuestionId: next?.id ?? null,
    nextQuestion: next?.question ?? null,
    provider: "framework",
    configured,
  };
}

function validAnswers(answers: InterviewTurnAnswer[]): boolean {
  const questions = OPERATING_DAY_SCENARIO.questions;
  return answers.length <= questions.length && answers.every((answer, index) =>
    answer.questionId === questions[index]?.id &&
    typeof answer.text === "string" &&
    answer.text.trim().length > 0 &&
    answer.text.length <= 3000,
  );
}

export function validateInterviewTurnRequest(value: unknown): value is InterviewTurnRequest {
  if (!value || typeof value !== "object") return false;
  const input = value as Partial<InterviewTurnRequest>;
  if (typeof input.currentQuestionId !== "string" || typeof input.answer !== "string" || !Array.isArray(input.answers)) return false;
  if (input.answer.trim().length < 1 || input.answer.length > 3000 || !validAnswers(input.answers)) return false;
  const current = OPERATING_DAY_SCENARIO.questions[input.answers.length - 1];
  return current?.id === input.currentQuestionId && input.answers[input.answers.length - 1]?.text === input.answer;
}

export async function createInterviewTurn(input: InterviewTurnRequest, options: TurnOptions = {}): Promise<InterviewTurnResponse> {
  const apiKey = options.apiKey?.trim() ?? "";
  if (!apiKey) return frameworkTurn(input.currentQuestionId);

  const questions = OPERATING_DAY_SCENARIO.questions;
  const currentIndex = questions.findIndex((question) => question.id === input.currentQuestionId);
  const current = questions[currentIndex];
  const next = questions[currentIndex + 1];
  if (!current) return frameworkTurn(input.currentQuestionId, true);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 8_000);
  try {
    const response = await (options.fetchImpl ?? fetch)(API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": API_VERSION,
      },
      body: JSON.stringify({
        model: options.model?.trim() || DEFAULT_MODEL,
        max_tokens: 450,
        system: [
          "당신은 동행금융의 유진 상담 매니저입니다.",
          "서버가 정한 demo-scenario 질문 프레임워크를 절대 바꾸지 마세요.",
          "사장님의 마지막 답변을 짧고 따뜻하게 확인한 뒤, 다음 질문이 있으면 같은 정보 항목을 더 자연스럽게 묻습니다.",
          "다음 질문 ID는 제공된 값과 정확히 같아야 합니다. 질문 순서를 건너뛰거나 새 항목을 만들지 마세요.",
          "대출 승인, 거절, 신용등급, 점수 또는 자격을 판단하지 마세요. 답변에 없는 사실도 추정하지 마세요.",
          "존댓말을 쓰고 확인 문장은 한 문장, 다음 질문은 한두 문장으로 작성하세요.",
        ].join("\n"),
        messages: [{
          role: "user",
          content: JSON.stringify({
            persona: OPERATING_DAY_SCENARIO.persona,
            currentFramework: {
              id: current.id,
              label: current.label,
              purpose: current.purpose,
              mustCapture: current.mustCapture,
              answer: input.answer,
            },
            nextFramework: next ? {
              id: next.id,
              label: next.label,
              baselineQuestion: next.question,
              purpose: next.purpose,
              mustCapture: next.mustCapture,
            } : null,
            transcript: input.answers.slice(-5),
          }),
        }],
        tools: [{
          name: "write_interview_turn",
          description: "현재 답변을 확인하고 서버가 지정한 바로 다음 인터뷰 질문을 작성합니다. 질문 순서, 질문 ID, 수집 목적은 바꿀 수 없습니다. 다음 항목이 없으면 nextQuestionId와 nextQuestion에 빈 문자열을 반환합니다.",
          strict: true,
          input_schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              acknowledgement: { type: "string", description: "답변에 없는 사실을 덧붙이지 않는 짧고 따뜻한 확인 문장" },
              nextQuestionId: { type: "string", description: "제공된 다음 질문 ID 또는 마지막 질문이면 빈 문자열" },
              nextQuestion: { type: "string", description: "다음 프레임워크의 필수 정보를 모두 묻는 자연스러운 질문 또는 마지막 질문이면 빈 문자열" },
            },
            required: ["acknowledgement", "nextQuestionId", "nextQuestion"],
          },
        }],
        tool_choice: { type: "tool", name: "write_interview_turn" },
      }),
    });
    if (!response.ok) return frameworkTurn(input.currentQuestionId, true);
    const payload = await response.json() as ClaudeMessageResponse;
    const tool = payload.content?.find((item) => item.type === "tool_use" && item.name === "write_interview_turn");
    if (!tool?.input || typeof tool.input !== "object") return frameworkTurn(input.currentQuestionId, true);
    const result = tool.input as Record<string, unknown>;
    const acknowledgement = cleanText(result.acknowledgement, MAX_ACKNOWLEDGEMENT);
    const nextQuestionId = typeof result.nextQuestionId === "string" ? result.nextQuestionId.trim() : "";
    const nextQuestion = cleanText(result.nextQuestion, MAX_QUESTION);
    const expectedId = next?.id ?? "";
    if (!acknowledgement || nextQuestionId !== expectedId || (next ? !nextQuestion : Boolean(nextQuestion))) return frameworkTurn(input.currentQuestionId, true);
    return {
      acknowledgement,
      nextQuestionId: next?.id ?? null,
      nextQuestion: nextQuestion ?? null,
      provider: "claude",
      configured: true,
    };
  } catch {
    return frameworkTurn(input.currentQuestionId, true);
  } finally {
    clearTimeout(timer);
  }
}

export async function requestInterviewTurn(input: InterviewTurnRequest): Promise<InterviewTurnResponse> {
  const fallback = frameworkTurn(input.currentQuestionId);
  try {
    const response = await fetch("/api/interview/turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) return fallback;
    return await response.json() as InterviewTurnResponse;
  } catch {
    return fallback;
  }
}
