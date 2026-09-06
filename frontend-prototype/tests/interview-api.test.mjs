import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import test from "node:test";
import worker from "../dist/server/index.js";

test("interview answers persist, validate, complete and keep review notes independently", async () => {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync(new URL("../drizzle/0000_pink_electro.sql", import.meta.url), "utf8"));
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
    assert.equal((await call({ kind: "review", note: "월 매출 증빙 확인 필요", checklist: ["매출·비용 기준 기간 확인"] })).status, 200);
    assert.equal((await call()).data.note, "월 매출 증빙 확인 필요");
    assert.equal((await call({ kind: "review", note: "x", checklist: [] }, "https://other.test")).status, 403);
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
    assert.equal((await call({ kind: "review", note: "검토 완료", checklist: [] })).status, 200);
    assert.ok((await call()).data.completedAt);
  } finally { sqlite.close(); }
});
