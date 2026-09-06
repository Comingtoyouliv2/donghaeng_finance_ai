import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import worker from "../dist/server/index.js";

test("interview answers persist, validate, complete and keep review notes independently", async () => {
  const sqlite = new DatabaseSync(":memory:");
  for (const file of readdirSync(new URL("../drizzle/", import.meta.url)).filter(file => file.endsWith(".sql")).sort()) sqlite.exec(readFileSync(new URL(`../drizzle/${file}`, import.meta.url), "utf8"));
  const DB = { prepare(sql) { let values = []; return {
    bind(...args) { values = args; return this; },
    async first() { return sqlite.prepare(sql).get(...values) ?? null; },
    async run() { const result = sqlite.prepare(sql).run(...values); return { meta: { changes: Number(result.changes) } }; },
  }; } };
  async function call(body, origin = "https://example.test") {
    const response = await worker.fetch(new Request("https://example.test/api/interview", {
      method: body ? "PUT" : "GET", headers: { "Content-Type": "application/json", Origin: origin }, body: body ? JSON.stringify(body) : undefined,
    }), { DB }, { waitUntil() {} });
    return { status: response.status, data: await response.json() };
  }
  try {
    assert.deepEqual((await call()).data.answers, []);
    const answers = [{ questionId: "monthly_average_sales", text: "월평균 매출은 3100만원입니다." }];
    const first = await call({ kind: "interview", answers, revision: 0, complete: false });
    assert.equal(first.status, 200);
    assert.equal(first.data.revision, 1);
    assert.deepEqual((await call()).data.answers, answers);
    assert.equal((await call({ kind: "interview", answers, revision: 0, complete: false })).status, 409);
    assert.equal((await call({ kind: "interview", answers, revision: 1, complete: true })).status, 400);
    assert.equal((await call({ kind: "interview", answers: [{questionId: "bogus", text: "test"}], revision: 1, complete: false })).status, 400);
    assert.equal((await call({ kind: "review", note: "월 매출 증빙 확인 필요", checklist: ["매출·비용 기준 기간 확인"], disposition: "NEEDS_INFORMATION", reviewRevision: 0 })).status, 200);
    assert.equal((await call()).data.note, "월 매출 증빙 확인 필요");
    assert.equal((await call()).data.disposition, "NEEDS_INFORMATION");
    assert.equal((await call({ kind: "review", note: "stale", checklist: [], disposition: "HOLD", reviewRevision: 0 })).status, 409);
    assert.equal((await call({ kind: "review", note: "invalid", checklist: [], disposition: "APPROVED", reviewRevision: 1 })).status, 400);
    assert.equal((await call({ kind: "review", note: "x", checklist: [] }, "https://other.test")).status, 403);
    const workspace = await call({ kind: "workspace", planChoice: "operating-days", institutionId: "koreg", preparationDocuments: ["매출·비용 증빙 확인"], preparationOwner: "사장님 + 담당 상담사", reviewPeriod: "2주 후 점검", preparationReviewed: true, workspaceRevision: 0 });
    assert.equal(workspace.status, 200);
    assert.equal(workspace.data.workspace.planChoice, "operating-days");
    assert.equal(workspace.data.workspace.institutionId, "koreg");
    assert.equal(workspace.data.workspace.revision, 1);
    assert.equal((await call({ kind: "workspace", planChoice: null, institutionId: null, preparationDocuments: [], preparationOwner: "사장님 + 담당 상담사", reviewPeriod: "2주 후 점검", preparationReviewed: false, workspaceRevision: 0 })).status, 409);
    const execution = await call({ kind: "execution", date: "2026-09-06", title: "주말 보조 인력 공고 등록", note: "지원자 확인 예정", workspaceRevision: 1 });
    assert.equal(execution.status, 200);
    assert.equal(execution.data.workspace.executionRecords.length, 1);
    assert.equal(execution.data.workspace.revision, 2);
    assert.equal((await call({ kind: "execution", date: "bad", title: "x", note: "", workspaceRevision: 2 })).status, 400);
    const ids = ["fixed_operating_costs", "operating_day_drop_reason", "improvement_plan", "execution_readiness", "confirmed_reservations", "seasonality_outlook", "essential_household_expenses", "emergency_buffer_months", "platform_fee_pressure", "hall_customer_decline", "repeat_customer_share"];
    let revision = 1;
    for (const id of ids) {
      answers.push({ questionId: id, text: `직접 입력한 ${id} 답변` });
      const result = await call({ kind: "interview", answers, revision, complete: false });
      assert.equal(result.status, 200);
      revision = result.data.revision;
    }
    const final = await call({ kind: "interview", answers, revision, complete: true });
    assert.equal(final.status, 200);
    assert.ok(final.data.completedAt);
    assert.equal(final.data.answers.length, 12);
    assert.equal(final.data.note, "월 매출 증빙 확인 필요");
    assert.deepEqual(final.data.checklist, ["매출·비용 기준 기간 확인"]);
    assert.equal((await call({ kind: "interview", answers: [], revision: final.data.revision, complete: false })).status, 409);
    assert.equal((await call({ kind: "review", note: "검토 완료", checklist: [], disposition: "READY_FOR_REVIEW", reviewRevision: 1 })).status, 200);
    assert.ok((await call()).data.completedAt);
    const beforeExport = (await call()).data;
    const exported = await worker.fetch(new Request("https://example.test/api/interview/report"), { DB }, { waitUntil() {} });
    assert.equal(exported.status, 200);
    assert.equal(exported.headers.get("cache-control"), "no-store");
    const report = await exported.json();
    assert.equal(report.evidence[0].originalText, answers[0].text);
    assert.equal(report.evidence[0].id, "answer:operating-day:monthly_average_sales");
    assert.equal(report.evidence[0].verified, false);
    assert.equal(report.review.disposition, "READY_FOR_REVIEW");
    assert.equal(report.review.note, "검토 완료");
    assert.equal(report.review.revision, 2);
    assert.equal(report.missing.length, 0);
    assert.equal(report.stage, "COMPLETED");
    assert.equal(report.deliveryStatus, "NOT_SENT");
    assert.equal(report.analysis.dictionarySize, 100);
    assert.equal(report.analysis.features.length, 100);
    assert.equal(report.analysis.features.find(item => item.name === "crd_credit_score").state, "MISSING");
    assert.equal(report.recovery.executionRecords.length, 1);
    assert.equal(report.consultation.institutionId, "koreg");
    assert.deepEqual((await call()).data, beforeExport, "export must not mutate interview or review");
  } finally { sqlite.close(); }
});
