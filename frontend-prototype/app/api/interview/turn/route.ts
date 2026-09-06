import { createInterviewTurn, validateInterviewTurnRequest } from "../../../demo/claude-turn";

export async function POST(request: Request) {
  if (request.headers.get("Origin") && request.headers.get("Origin") !== new URL(request.url).origin) {
    return Response.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });
  }
  const raw = await request.text();
  if (raw.length > 50_000) return Response.json({ error: "입력 내용이 너무 깁니다." }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }
  if (!validateInterviewTurnRequest(body)) return Response.json({ error: "인터뷰 흐름을 확인해 주세요." }, { status: 400 });

  const result = await createInterviewTurn(body, {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.DONGHAENG_ANTHROPIC_MODEL,
  });
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
