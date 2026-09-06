import assert from "node:assert/strict";
import test from "node:test";

const firstAnswer = {
  currentQuestionId: "monthly_average_sales",
  answer: "최근 3개월 월평균 매출은 2600만원입니다.",
  answers: [{ questionId: "monthly_average_sales", text: "최근 3개월 월평균 매출은 2600만원입니다." }],
};

async function worker() {
  const url = new URL("../dist/server/index.js", import.meta.url);
  url.searchParams.set("claude-turn-test", `${process.pid}-${Date.now()}-${Math.random()}`);
  return (await import(url.href)).default;
}

test("interview turn keeps the scenario sequence when Claude is not configured", async () => {
  const app = await worker();
  const response = await app.fetch(new Request("https://example.test/api/interview/turn", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://example.test" },
    body: JSON.stringify(firstAnswer),
  }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.provider, "framework");
  assert.equal(result.configured, false);
  assert.equal(result.nextQuestionId, "fixed_operating_costs");
  assert.match(result.nextQuestion, /운영비/);
});

test("interview turn rejects skipped or cross-origin answers", async () => {
  const app = await worker();
  const badSequence = await app.fetch(new Request("https://example.test/api/interview/turn", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://example.test" },
    body: JSON.stringify({ ...firstAnswer, currentQuestionId: "improvement_plan" }),
  }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
  assert.equal(badSequence.status, 400);

  const crossOrigin = await app.fetch(new Request("https://example.test/api/interview/turn", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://other.test" },
    body: JSON.stringify(firstAnswer),
  }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
  assert.equal(crossOrigin.status, 403);
});

test("interview turn applies Claude wording only for the server-selected next question", async () => {
  const previousKey = process.env.ANTHROPIC_API_KEY;
  const previousModel = process.env.DONGHAENG_ANTHROPIC_MODEL;
  const nativeFetch = globalThis.fetch;
  process.env.ANTHROPIC_API_KEY = "sk-ant-test-only-not-a-real-credential";
  process.env.DONGHAENG_ANTHROPIC_MODEL = "claude-sonnet-5";
  globalThis.fetch = async (input, init) => {
    if (String(input) === "https://api.anthropic.com/v1/messages") {
      const request = JSON.parse(String(init?.body));
      assert.equal(request.tool_choice.name, "write_interview_turn");
      return Response.json({ content: [{ type: "tool_use", name: "write_interview_turn", input: {
        acknowledgement: "최근 매출 규모를 알려주셔서 감사합니다.",
        nextQuestionId: "fixed_operating_costs",
        nextQuestion: "그럼 매달 반복해서 나가는 임차료와 인건비 같은 고정 운영비는 평균 얼마인가요?",
      } }] });
    }
    return nativeFetch(input, init);
  };
  try {
    const app = await worker();
    const response = await app.fetch(new Request("https://example.test/api/interview/turn", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://example.test" },
      body: JSON.stringify(firstAnswer),
    }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.provider, "claude");
    assert.equal(result.nextQuestionId, "fixed_operating_costs");
    assert.match(result.nextQuestion, /고정 운영비/);
  } finally {
    globalThis.fetch = nativeFetch;
    if (previousKey === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.DONGHAENG_ANTHROPIC_MODEL; else process.env.DONGHAENG_ANTHROPIC_MODEL = previousModel;
  }
});
