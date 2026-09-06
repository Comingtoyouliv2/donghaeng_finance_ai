import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import test from "node:test";

const source = readFileSync(new URL("../app/quest-flow.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { nextUnansweredQuest } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);

test("arrival returns to the earliest missed quest for every completion combination", () => {
  for (let mask = 0; mask < 8; mask++) {
    const answers = [0, 1, 2].map(index => mask & (1 << index) ? "답변" : null);
    assert.equal(nextUnansweredQuest(answers), answers.findIndex(answer => !answer));
  }
});
test("finishing the last quest does not skip earlier unanswered quests", () => {
  assert.equal(nextUnansweredQuest([null, null, "답변"], 2), 0);
  assert.equal(nextUnansweredQuest(["답변", null, "답변"], 2), 1);
  assert.equal(nextUnansweredQuest(["답변", "답변", "답변"], 2), -1);
  assert.equal(nextUnansweredQuest(["답변", null, null], 0), 1);
});
