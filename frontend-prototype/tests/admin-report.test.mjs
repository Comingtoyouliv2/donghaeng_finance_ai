import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import test from "node:test";
import worker from "../dist/server/index.js";

test("existing records survive the review migration; partial reports preserve missing answers and never use examples", async () => {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync(new URL("../drizzle/0000_pink_electro.sql", import.meta.url), "utf8"));
  const answer = "매출은 아직 정확히 모릅니다. <script>alert('unsafe')</script>";
  sqlite.prepare("INSERT INTO interviews (id, answers, revision, note, checklist) VALUES (?, ?, ?, ?, ?)").run("operating-day", JSON.stringify([{questionId:"monthly_average_sales", text:answer}]), 1, "기존 메모 보존", '["매출·비용 기준 기간 확인"]');
  for (const file of readdirSync(new URL("../drizzle/", import.meta.url)).filter(file => file.endsWith(".sql") && !file.startsWith("0000")).sort()) sqlite.exec(readFileSync(new URL(`../drizzle/${file}`, import.meta.url), "utf8"));
  const DB = { prepare(sql) { let args = []; return { bind(...values) {args = values; return this;}, async first() {return sqlite.prepare(sql).get(...args) ?? null;}, async run() {return {meta:{changes:Number(sqlite.prepare(sql).run(...args).changes)}};} }; } };
  try {
    const response = await worker.fetch(new Request("https://example.test/api/interview/report"), {DB}, {});
    assert.equal(response.status, 200);
    const report = await response.json();
    assert.equal(report.evidence.length, 12);
    assert.equal(report.evidence[0].originalText, answer);
    assert.equal(report.evidence[0].status, "SELF_REPORTED");
    assert.equal(report.evidence[1].originalText, null);
    assert.equal(report.evidence[1].status, "MISSING");
    assert.equal(report.missing.length, 11);
    assert.equal(report.stage, "IN_PROGRESS");
    assert.equal(report.review.note, "기존 메모 보존");
    assert.equal(report.review.disposition, "PENDING");
    assert.equal(report.review.revision, 0);
    assert.equal(report.review.checklist[0].checked, true);
    assert.equal(report.coverage.reduce((sum, group) => sum + group.answered, 0), 1);
    assert.equal(report.analysis.dictionarySize, 100);
    assert.equal(report.analysis.features.length, 100);
    assert.equal(report.analysis.features.find(item => item.name === "fin_sales_avg_3m").state, "MISSING");
    assert.equal(report.analysis.features.find(item => item.name === "crd_credit_score").value, null);
    assert.equal(report.analysis.snapshotHash, (await (await worker.fetch(new Request("https://example.test/api/interview/report"), {DB}, {})).json()).analysis.snapshotHash);
    assert.equal(JSON.stringify(report).includes("2600만원"), false);
    assert.equal((await worker.fetch(new Request("https://example.test/api/interview/report", {method:"PUT"}), {DB}, {})).status, 405);

    // Transpile in memory so QA does not depend on package files outside this project.
    const compile = path => ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {compilerOptions:{module:ts.ModuleKind.ESNext, target:ts.ScriptTarget.ES2022, jsx:ts.JsxEmit.ReactJSX}}).outputText;
    const asModule = text => `data:text/javascript;base64,${Buffer.from(text).toString("base64")}`;
    const recordModule = asModule(compile("../app/demo/record.ts"));
    const documentCode = compile("../app/admin/ReviewDocument.tsx").replace('"../demo/record"', JSON.stringify(recordModule)).replaceAll('"react/jsx-runtime"', JSON.stringify(import.meta.resolve("react/jsx-runtime")));
    const {default: Document} = await import(asModule(documentCode));
    const html = renderToStaticMarkup(createElement(Document, {report}));
    assert.match(html, /진행 중 자료/);
    assert.match(html, /기존 메모 보존/);
    assert.match(html, /미응답 11개/);
    assert.ok(html.includes("&lt;script&gt;"));
    assert.ok(!html.includes("<script>"));
    assert.match(html, /answer:operating-day:monthly_average_sales/);
    assert.match(html, /기관에 자동 전송하지 않습니다/);
  } finally { sqlite.close(); }
});
