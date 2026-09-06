"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Full-page navigation is intentional for the deployed vinext app. */

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import WorkspaceTopbar from "../components/WorkspaceTopbar";
import { INTERVIEW_CATEGORIES, OPERATING_DAY_SCENARIO } from "./scenario";
import { requestRecord } from "./record";
import { requestInterviewTurn, type InterviewTurnResponse } from "./claude-turn";

interface AcceptedAnswer {
  questionId: string;
  text: string;
}

const fallbackEvidence = ["사업 공백의 이유 확인", "조정 가능한 지출 확인", "준비 가능한 증빙 확인"];

export default function DemoPage() {
  const scenario = OPERATING_DAY_SCENARIO;
  const questions = scenario.questions;
  const threadRef = useRef<HTMLDivElement>(null);
  const [answers, setAnswers] = useState<AcceptedAnswer[]>([]);
  const [managerReplies, setManagerReplies] = useState<Record<string, InterviewTurnResponse>>({});
  const [adaptiveQuestion, setAdaptiveQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [checked, setChecked] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [evidence, setEvidence] = useState<string[]>([]);
  const [revision, setRevision] = useState(0);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState("");

  const loadInterview = useCallback(async function loadInterview() {
    setError("");
    try {
      const startToken = new URLSearchParams(window.location.search).get("start");
      let appliedToken: string | null = null;
      try { appliedToken = window.sessionStorage.getItem("donghaeng-interview-start-token"); } catch { /* The start URL still creates a clean interview. */ }
      let record = startToken && startToken !== appliedToken
        ? await requestRecord({ kind: "reset", startToken })
        : await requestRecord();
      if (startToken && startToken !== appliedToken) {
        try { window.sessionStorage.setItem("donghaeng-interview-start-token", startToken); } catch { /* History replacement prevents an immediate duplicate reset. */ }
        window.history.replaceState(null, "", "/demo");
      }
      // Preserve completed interviews saved by the earlier browser-only demo.
      if (!startToken && record.answers.length === 0 && record.revision === 0) {
        let previous;
        try { previous = JSON.parse(sessionStorage.getItem("donghaeng-demo-interview") || "null"); } catch { /* No valid legacy record. */ }
        if (previous?.scenarioId === scenario.id && Array.isArray(previous.answers) && previous.answers.length) {
          record = await requestRecord({ kind: "interview", revision: record.revision, answers: previous.answers, complete: Boolean(previous.completedAt) });
        }
      }
      setAnswers(record.answers);
      setRevision(record.revision);
      setIsComplete(Boolean(record.completedAt));
      setReady(true);
    } catch (e) { setError(e instanceof Error ? e.message : "기록을 불러오지 못했습니다."); }
  }, [scenario.id]);

  useEffect(() => {
    const initial = window.setTimeout(() => void loadInterview(), 0);
    return () => window.clearTimeout(initial);
  }, [loadInterview]);

  const currentIndex = answers.length;
  const current = questions[currentIndex];
  const reviewing = answers.length === questions.length && !isReplying;
  const progress = answers.length / questions.length;
  const questEvidence = evidence.length ? evidence : fallbackEvidence;

  useEffect(() => {
    const evidenceTimer = window.setTimeout(() => {
      try {
        const stored = JSON.parse(window.sessionStorage.getItem("donghaeng-quest-evidence") || "[]") as Array<{ answer?: string }>;
        setEvidence(stored.map((item) => item.answer).filter((item): item is string => Boolean(item)));
      } catch {
        setEvidence([]);
      }
    }, 0);

    return () => {
      window.clearTimeout(evidenceTimer);
    };
  }, []);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [answers.length, isReplying, isComplete]);

  async function sendAnswer() {
    const message = answer.trim();
    if (!message || !current || isReplying || isComplete || !ready || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      const record = await requestRecord({ kind: "interview", revision, answers: [...answers, { questionId: current.id, text: message }], complete: false });
      setAnswers(record.answers);
      setRevision(record.revision);
      setAnswer("");
      setChecked(false);
      setIsReplying(true);
      const turn = await requestInterviewTurn({ currentQuestionId: current.id, answer: message, answers: record.answers });
      setManagerReplies((replies) => ({ ...replies, [current.id]: turn }));
      const next = questions[record.answers.length];
      setAdaptiveQuestion(turn.nextQuestionId === next?.id ? turn.nextQuestion : null);
      setIsReplying(false);
    } catch (e) { setError(e instanceof Error ? e.message : "답변 저장에 실패했습니다."); }
    finally { savingRef.current = false; setSaving(false); setIsReplying(false); }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      sendAnswer();
    }
  }

  async function completeInterview() {
    if (!checked || answers.length !== questions.length || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      const record = await requestRecord({ kind: "interview", revision, answers, complete: true });
      setRevision(record.revision);
      setIsComplete(Boolean(record.completedAt));
    } catch (e) { setError(e instanceof Error ? e.message : "완료 기록 저장에 실패했습니다."); }
    finally { savingRef.current = false; setSaving(false); }
  }

  return (
    <main className="human-call consultation-chat">
      <WorkspaceTopbar active="interview" saving={saving} />
      <div className="record-status" role="status">{error || (!ready ? "저장된 인터뷰를 불러오는 중입니다." : saving ? "답변 저장 중…" : "보낸 답변은 자동 저장되어 관리자 화면에 반영됩니다.")}{error && !ready && <button onClick={loadInterview}>다시 불러오기</button>}</div>

      <div className="consultation-workspace">
        <section className="phone-shell consultation-thread-shell" aria-label="금융 상담 대화">
          <header className="phone-header">
            <a href="/" className="phone-back" aria-label="퀘스트 길로 돌아가기">‹</a>
            <div className="caller-profile">
              <Image src="/interviewer-yujin.png" alt="" width={42} height={42} />
              <div><strong>유진 상담 매니저</strong><span>{scenario.persona.businessName} 회복 인터뷰</span></div>
            </div>
            <div className="call-duration"><i aria-hidden="true" /><span>{isComplete ? "기록 완료" : `${answers.length}/${questions.length}`}</span></div>
          </header>

          <div className="call-status consultation-status">
            <span>{current?.category ?? "INTERVIEW REVIEW"}</span><i aria-hidden="true" /><b>{current?.label ?? "답변 확인"}</b>
            <div aria-hidden="true"><i style={{ transform: `scaleX(${progress})` }} /></div>
          </div>

          <div className="call-thread" ref={threadRef} aria-live="polite">
            <div className="spoken incoming current">
              <Image src="/interviewer-yujin.png" alt="" width={42} height={42} />
              <div>
                <p>안녕하세요, {scenario.persona.borrowerName} 사장님. 골목에서 모은 세 가지 생각을 바탕으로 {scenario.persona.businessName}의 회복 이야기를 차근차근 정리해볼게요.</p>
                <small>유진 상담 매니저</small>
              </div>
            </div>

            <details className="consultation-quest-context">
              <summary>골목에서 연결된 회복 근거 {questEvidence.length}개</summary>
              {questEvidence.map((item, index) => <p key={`${item}-${index}`}><span>0{index + 1}</span>{item}</p>)}
            </details>

            {answers.map((item, index) => {
              const question = questions.find((entry) => entry.id === item.questionId) ?? questions[index];
              return (
                <div className="consultation-exchange" key={item.questionId}>
                  <div className="spoken incoming compact"><Image src="/interviewer-yujin.png" alt="" width={42} height={42} /><div><p>{question.question}</p><small>{question.label}</small></div></div>
                  <div className="spoken outgoing"><p>{item.text}</p><small>{scenario.persona.borrowerName} 사장님</small></div>
                  {managerReplies[item.questionId] && <div className="spoken incoming compact consultation-manager-reply"><Image src="/interviewer-yujin.png" alt="" width={42} height={42} /><div><p>{managerReplies[item.questionId].acknowledgement}</p><small>{managerReplies[item.questionId].provider === "claude" ? "Claude로 정리한 응답" : managerReplies[item.questionId].configured ? "질문 기준선으로 안전하게 이어진 응답" : "Claude 연결 전 · 질문 기준선 응답"}</small></div></div>}
                </div>
              );
            })}

            {current && !isReplying && (
              <div className="spoken incoming current">
                <Image src="/interviewer-yujin.png" alt="" width={42} height={42} />
                <div><p>{adaptiveQuestion ?? current.question}</p><small>{`${current.category} · ${current.label}`}</small></div>
              </div>
            )}
            {isReplying && <div className="spoken incoming compact"><Image src="/interviewer-yujin.png" alt="" width={42} height={42} /><div className="chat-typing" aria-label="유진이 다음 질문을 준비하고 있습니다"><i /><i /><i /></div></div>}
            {reviewing && !isComplete && <p className="reply-guide">모든 질문이 끝났습니다. 답변을 확인하고 인터뷰를 완료해 주세요.</p>}
            {isComplete && (
              <div className="spoken incoming current consultation-finish-message">
                <Image src="/interviewer-yujin.png" alt="" width={42} height={42} />
                <div><p>인터뷰가 기록됐어요. 말씀해 주신 현재 상황과 계획을 관리자 대시보드에서 확인할 수 있습니다.</p><small>유진 상담 매니저</small></div>
              </div>
            )}
          </div>

          <footer className="reply-dock">
            {current && !isReplying ? (
              <>
                <div className="scenario-reply" aria-label="시나리오 답변">
                  <span>시연 답변</span>
                  <button type="button" disabled={!ready || saving} className={answer === current.suggestedAnswer ? "selected" : ""} onClick={() => setAnswer(current.suggestedAnswer)}>{current.suggestedAnswer}</button>
                </div>
                <label className="reply-input">
                  <span className="sr-only">상담 답변 입력</span>
                  <textarea disabled={!ready || saving} value={answer} onChange={(event) => setAnswer(event.target.value)} onKeyDown={handleComposerKeyDown} placeholder="상황을 편하게 적어주세요" rows={2} maxLength={3000} />
                  <button type="button" onClick={sendAnswer} disabled={!answer.trim() || !ready || saving}>{saving ? "저장 중" : "보내기"}</button>
                </label>
              </>
            ) : isReplying ? (
              <p className="consultation-wait">답변에서 필요한 내용을 정리하고 있습니다.</p>
            ) : !isComplete ? (
              <div className="consultation-review">
                <p>12개 답변을 원문 그대로 확인했습니다. 완료하면 이 기록으로 회복 근거를 정리합니다.</p>
                <label><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} /> 답변 내용이 맞는지 확인했어요.</label>
                <button type="button" onClick={completeInterview} disabled={!checked || saving}>{saving ? "저장 중…" : "인터뷰 완료하기 →"}</button>
              </div>
            ) : (
              <div className="consultation-complete"><i aria-hidden="true">✓</i><div><strong>상담 대화가 저장되었습니다</strong><a href="/admin">관리자 대시보드에서 기록 확인 →</a></div></div>
            )}
          </footer>
        </section>

        <aside className="consultation-context" aria-label="인터뷰 수집 현황">
          <header><span>회복 인터뷰</span><h1>{scenario.persona.businessName}</h1><p>{scenario.persona.borrowerName} 사장님 · {scenario.persona.industryLabel}</p></header>
          <section className="consultation-focus-card"><span>함께 확인할 계획</span><strong>문 여는 날을<br />다시 늘리는 일</strong><dl><div><dt>현재</dt><dd>월 {scenario.focus.baselineOperatingDays}일</dd></div><div><dt>목표</dt><dd>월 {scenario.focus.targetOperatingDays}일</dd></div><div><dt>기간</dt><dd>{scenario.focus.horizonMonths}개월</dd></div><div><dt>준비 예산</dt><dd>80만원</dd></div></dl></section>
          <section className="consultation-map"><div><span>답변 기록</span><b>{answers.length}/{questions.length}</b></div>{INTERVIEW_CATEGORIES.map((category) => { const total = questions.filter((item) => item.category === category).length; const done = answers.filter((item) => questions.find((question) => question.id === item.questionId)?.category === category).length; return <article key={category}><header><strong>{category}</strong><span>{done}/{total}</span></header><i aria-hidden="true"><b style={{ transform: `scaleX(${done / total})` }} /></i></article>; })}</section>
          <p className="consultation-context-note">서두르지 않아도 괜찮습니다. 남긴 답변은 그대로 저장되고, 대화가 끝나면 담당자가 다음 상담을 준비합니다.</p>
        </aside>
      </div>

      <p className="human-call-note">입력한 답변은 다음 금융 상담을 준비하기 위한 근거입니다. 최종 금융 판단은 금융기관과 사람이 합니다.</p>
    </main>
  );
}
