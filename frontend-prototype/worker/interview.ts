import { OPERATING_DAY_SCENARIO as scenario } from "../app/demo/scenario";
import { REVIEW_ITEMS } from "../app/demo/record";

export async function interviewApi(request: Request, db: D1Database) {
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
  const read = async () => {
    const row = await db.prepare("SELECT * FROM interviews WHERE id = ?").bind(scenario.id).first<{ answers: string; revision: number; completed_at: string | null; updated_at: string | null; note: string; checklist: string }>();
    return { answers: JSON.parse(row?.answers ?? "[]"), revision: row?.revision ?? 0, completedAt: row?.completed_at ?? null, updatedAt: row?.updated_at ?? null, note: row?.note ?? "", checklist: JSON.parse(row?.checklist ?? "[]") };
  };
  try {
    if (request.method === "GET") return json(await read());
    if (request.method !== "PUT") return json({ error: "지원하지 않는 요청입니다." }, 405);
    if (request.headers.get("Origin") && request.headers.get("Origin") !== new URL(request.url).origin) return json({ error: "허용되지 않은 요청입니다." }, 403);
    const raw = await request.text();
    if (raw.length > 50000) return json({ error: "입력 내용이 너무 깁니다." }, 413);
    const body = JSON.parse(raw);
    if (body.kind === "review") {
      if (typeof body.note !== "string" || body.note.length > 5000 || !Array.isArray(body.checklist) || body.checklist.some((v: unknown) => typeof v !== "string" || !REVIEW_ITEMS.includes(v))) return json({ error: "검토 내용을 확인해 주세요." }, 400);
      await db.prepare("INSERT INTO interviews (id, note, checklist) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET note = excluded.note, checklist = excluded.checklist").bind(scenario.id, body.note, JSON.stringify([...new Set(body.checklist)])).run();
    } else if (body.kind === "interview") {
      if (!Array.isArray(body.answers) || body.answers.length > scenario.questions.length || !Number.isInteger(body.revision) || typeof body.complete !== "boolean" || body.answers.some((a: {questionId?: unknown; text?: unknown} | null, i: number) => !a || a.questionId !== scenario.questions[i].id || typeof a.text !== "string" || !a.text.trim() || a.text.length > 3000) || (body.complete && body.answers.length !== scenario.questions.length)) return json({ error: "답변 내용을 확인해 주세요." }, 400);
      const current = await read();
      if (current.completedAt || body.revision !== current.revision || body.answers.length < current.answers.length || current.answers.some((a: {questionId: string; text: string}, i: number) => a.text !== body.answers[i].text)) return json({ error: "다른 화면에서 기록이 변경됐습니다. 새로고침해 최신 답변을 확인해 주세요." }, 409);
      const now = new Date().toISOString();
      await db.prepare("INSERT INTO interviews (id) VALUES (?) ON CONFLICT(id) DO NOTHING").bind(scenario.id).run();
      const result = await db.prepare("UPDATE interviews SET answers = ?, revision = revision + 1, completed_at = ?, updated_at = ? WHERE id = ? AND revision = ? AND completed_at IS NULL").bind(JSON.stringify(body.answers), body.complete ? now : null, now, scenario.id, body.revision).run();
      if (!result.meta.changes) return json({ error: "기록이 변경됐습니다. 새로고침 후 다시 시도해 주세요." }, 409);
    } else return json({ error: "요청 내용을 확인해 주세요." }, 400);
    return json(await read());
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: "요청 형식이 올바르지 않습니다." }, 400);
    return json({ error: "서버에 기록을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 503);
  }
}
