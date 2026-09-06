import { OPERATING_DAY_SCENARIO as scenario } from "../app/demo/scenario";
import { INSTITUTIONS, PREPARATION_DOCUMENTS, PREPARATION_OWNERS, RECOVERY_PLANS, REVIEW_ITEMS, REVIEW_PERIODS, REVIEW_STATES, type AcceptedAnswer, type ExecutionRecord, type ReviewDisposition } from "../app/demo/record";
import { buildReviewReport } from "../app/admin/report";

export async function interviewApi(request: Request, db: D1Database) {
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
  const parseArray = <T>(value: string | null | undefined): T[] => { try { const parsed = JSON.parse(value ?? "[]"); return Array.isArray(parsed) ? parsed : []; } catch { return []; } };
  const read = async () => {
    const row = await db.prepare("SELECT * FROM interviews WHERE id = ?").bind(scenario.id).first<{ answers: string; revision: number; completed_at: string | null; updated_at: string | null; note: string; checklist: string; disposition: ReviewDisposition; review_revision: number; review_updated_at: string | null; plan_choice: string | null; execution_records: string; institution_id: string | null; preparation_documents: string; preparation_owner: string; review_period: string; preparation_reviewed: number; workspace_revision: number; workspace_updated_at: string | null }>();
    return { answers: parseArray<AcceptedAnswer>(row?.answers), revision: row?.revision ?? 0, completedAt: row?.completed_at ?? null, updatedAt: row?.updated_at ?? null, note: row?.note ?? "", checklist: parseArray<string>(row?.checklist), disposition: row?.disposition ?? "PENDING" as ReviewDisposition, reviewRevision: row?.review_revision ?? 0, reviewUpdatedAt: row?.review_updated_at ?? null, workspace: { planChoice: row?.plan_choice ?? null, executionRecords: parseArray<ExecutionRecord>(row?.execution_records), institutionId: row?.institution_id ?? null, preparationDocuments: parseArray<string>(row?.preparation_documents), preparationOwner: row?.preparation_owner ?? PREPARATION_OWNERS[0], reviewPeriod: row?.review_period ?? REVIEW_PERIODS[0], preparationReviewed: Boolean(row?.preparation_reviewed), revision: row?.workspace_revision ?? 0, updatedAt: row?.workspace_updated_at ?? null } };
  };
  try {
    if (new URL(request.url).pathname.endsWith("/report")) {
      if (request.method !== "GET") return json({ error: "검토자료는 읽기만 가능합니다." }, 405);
      return json(buildReviewReport(await read(), new Date().toISOString()));
    }
    if (request.method === "GET") return json(await read());
    if (request.method !== "PUT") return json({ error: "지원하지 않는 요청입니다." }, 405);
    if (request.headers.get("Origin") && request.headers.get("Origin") !== new URL(request.url).origin) return json({ error: "허용되지 않은 요청입니다." }, 403);
    const raw = await request.text();
    if (raw.length > 50000) return json({ error: "입력 내용이 너무 깁니다." }, 413);
    const body = JSON.parse(raw);
    if (!body || typeof body !== "object") return json({ error: "요청 형식이 올바르지 않습니다." }, 400);
    if (body.kind === "workspace") {
      const planIds = new Set(RECOVERY_PLANS.map(item => item.id));
      const institutionIds = new Set(INSTITUTIONS.map(item => item.id));
      if ((body.planChoice !== null && !planIds.has(body.planChoice)) || (body.institutionId !== null && !institutionIds.has(body.institutionId)) || !Array.isArray(body.preparationDocuments) || body.preparationDocuments.some((item: unknown) => typeof item !== "string" || !PREPARATION_DOCUMENTS.includes(item as typeof PREPARATION_DOCUMENTS[number])) || !PREPARATION_OWNERS.includes(body.preparationOwner) || !REVIEW_PERIODS.includes(body.reviewPeriod) || typeof body.preparationReviewed !== "boolean" || !Number.isInteger(body.workspaceRevision) || body.workspaceRevision < 0) return json({ error: "상담 준비 내용을 확인해 주세요." }, 400);
      const now = new Date().toISOString();
      await db.prepare("INSERT INTO interviews (id) VALUES (?) ON CONFLICT(id) DO NOTHING").bind(scenario.id).run();
      const result = await db.prepare("UPDATE interviews SET plan_choice = ?, institution_id = ?, preparation_documents = ?, preparation_owner = ?, review_period = ?, preparation_reviewed = ?, workspace_revision = workspace_revision + 1, workspace_updated_at = ? WHERE id = ? AND workspace_revision = ?").bind(body.planChoice, body.institutionId, JSON.stringify([...new Set(body.preparationDocuments)]), body.preparationOwner, body.reviewPeriod, body.preparationReviewed ? 1 : 0, now, scenario.id, body.workspaceRevision).run();
      if (!result.meta.changes) return json({ error: "다른 화면에서 상담 준비 내용이 변경됐습니다. 저장된 내용을 다시 불러와 주세요." }, 409);
    } else if (body.kind === "execution") {
      if (!Number.isInteger(body.workspaceRevision) || body.workspaceRevision < 0 || typeof body.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.date) || typeof body.title !== "string" || !body.title.trim() || body.title.length > 100 || typeof body.note !== "string" || body.note.length > 1000) return json({ error: "실행 기록을 확인해 주세요." }, 400);
      const current = await read();
      if (current.workspace.revision !== body.workspaceRevision) return json({ error: "다른 화면에서 상담 준비 내용이 변경됐습니다. 저장된 내용을 다시 불러와 주세요." }, 409);
      const now = new Date().toISOString();
      const execution: ExecutionRecord = { id: `execution:${scenario.id}:${current.workspace.revision + 1}`, date: body.date, title: body.title.trim(), note: body.note.trim(), createdAt: now };
      const nextRecords = [...current.workspace.executionRecords, execution];
      await db.prepare("INSERT INTO interviews (id) VALUES (?) ON CONFLICT(id) DO NOTHING").bind(scenario.id).run();
      const result = await db.prepare("UPDATE interviews SET execution_records = ?, workspace_revision = workspace_revision + 1, workspace_updated_at = ? WHERE id = ? AND workspace_revision = ?").bind(JSON.stringify(nextRecords), now, scenario.id, body.workspaceRevision).run();
      if (!result.meta.changes) return json({ error: "실행 기록이 변경됐습니다. 저장된 내용을 다시 불러와 주세요." }, 409);
    } else if (body.kind === "review") {
      if (typeof body.note !== "string" || body.note.length > 5000 || !Array.isArray(body.checklist) || body.checklist.some((v: unknown) => typeof v !== "string" || !REVIEW_ITEMS.includes(v))) return json({ error: "검토 내용을 확인해 주세요." }, 400);
      if (!Object.hasOwn(REVIEW_STATES, body.disposition ?? "") || !Number.isInteger(body.reviewRevision) || body.reviewRevision < 0) return json({ error: "검토 상태를 확인하고 새로고침해 주세요." }, 400);
      await db.prepare("INSERT INTO interviews (id) VALUES (?) ON CONFLICT(id) DO NOTHING").bind(scenario.id).run();
      const result = await db.prepare("UPDATE interviews SET note = ?, checklist = ?, disposition = ?, review_revision = review_revision + 1, review_updated_at = ? WHERE id = ? AND review_revision = ?").bind(body.note, JSON.stringify([...new Set(body.checklist)]), body.disposition, new Date().toISOString(), scenario.id, body.reviewRevision).run();
      if (!result.meta.changes) return json({ error: "다른 화면에서 검토 내용이 변경됐습니다. 작성한 메모를 복사한 뒤 저장된 검토를 다시 불러와 주세요." }, 409);
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
