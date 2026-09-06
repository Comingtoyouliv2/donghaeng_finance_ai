"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import MosaicCurtain from "../components/MosaicCurtain";
import { INTERVIEW_CATEGORIES, OPERATING_DAY_SCENARIO } from "./scenario";

interface AcceptedAnswer {
  questionId: string;
  text: string;
}

const fallbackEvidence = ["사업 공백의 이유 확인", "조정 가능한 지출 확인", "준비 가능한 증빙 확인"];

export default function DemoPage() {
  const scenario = OPERATING_DAY_SCENARIO;
  const questions = scenario.questions;
  const threadRef = useRef<HTMLDivElement>(null);
  const replyTimerRef = useRef<number | null>(null);
  const [answers, setAnswers] = useState<AcceptedAnswer[]>([]);
  const [answer, setAnswer] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [checked, setChecked] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [evidence, setEvidence] = useState<string[]>([]);

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
      if (replyTimerRef.current) window.clearTimeout(replyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [answers.length, isReplying, isComplete]);

  function sendAnswer() {
    const message = answer.trim();
    if (!message || !current || isReplying || isComplete) return;

    setAnswers((items) => [...items, { questionId: current.id, text: message }]);
    setAnswer("");
    setChecked(false);
    setIsReplying(true);
    replyTimerRef.current = window.setTimeout(() => setIsReplying(false), 560);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendAnswer();
    }
  }

  function completeInterview() {
    if (!checked || answers.length !== questions.length) return;
    setIsComplete(true);
    try {
      window.sessionStorage.setItem("donghaeng-demo-interview", JSON.stringify({
        scenarioId: scenario.id,
        persona: scenario.persona,
        answers,
        completedAt: new Date().toISOString(),
      }));
    } catch {
      // Completion remains available even when browser storage is unavailable.
    }
  }

  return (
    <main className="human-call consultation-chat">
      <header className="human-call-sitebar consultation-topbar">
        <Link href="/" className="human-call-brand">동행금융</Link>
        <span>RECOVERY INTERVIEW</span>
        <nav aria-label="상담 화면 메뉴"><Link href="/admin">관리자 대시보드</Link><Link href="/">상담 나가기</Link></nav>
      </header>

      <div className="consultation-workspace">
        <section className="phone-shell consultation-thread-shell" aria-label="금융 상담 대화">
          <header className="phone-header">
            <Link href="/" className="phone-back" aria-label="퀘스트 길로 돌아가기">‹</Link>
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
                </div>
              );
            })}

            {current && !isReplying && (
              <div className="spoken incoming current">
                <Image src="/interviewer-yujin.png" alt="" width={42} height={42} />
                <div><p>{current.question}</p><small>{`${current.category} · ${current.label}`}</small></div>
              </div>
            )}
            {isReplying && <div className="spoken incoming compact"><Image src="/interviewer-yujin.png" alt="" width={42} height={42} /><div className="chat-typing" aria-label="유진이 다음 질문을 준비하고 있습니다"><i /><i /><i /></div></div>}
            {reviewing && !isComplete && <p className="reply-guide">모든 질문이 끝났습니다. 답변을 확인하고 인터뷰를 완료해 주세요.</p>}
            {isComplete && (
              <div className="spoken incoming current consultation-finish-message">
                <Image src="/interviewer-yujin.png" alt="" width={42} height={42} />
                <div><p>인터뷰가 기록됐어요. 영업일 감소 사유와 6개월 안에 월 29일 영업이라는 목표를 중심으로 다음 상담 자료를 준비하겠습니다.</p><small>유진 상담 매니저</small></div>
              </div>
            )}
          </div>

          <footer className="reply-dock">
            {current && !isReplying ? (
              <>
                <div className="scenario-reply" aria-label="시나리오 답변">
                  <span>시연 답변</span>
                  <button type="button" className={answer === current.suggestedAnswer ? "selected" : ""} onClick={() => setAnswer(current.suggestedAnswer)}>{current.suggestedAnswer}</button>
                </div>
                <label className="reply-input">
                  <span className="sr-only">상담 답변 입력</span>
                  <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} onKeyDown={handleComposerKeyDown} placeholder="상황을 편하게 적어주세요" rows={2} maxLength={3000} />
                  <button type="button" onClick={sendAnswer} disabled={!answer.trim()}>보내기</button>
                </label>
              </>
            ) : isReplying ? (
              <p className="consultation-wait">답변에서 필요한 내용을 정리하고 있습니다.</p>
            ) : !isComplete ? (
              <div className="consultation-review">
                <p>12개 답변을 원문 그대로 확인했습니다. 완료하면 이 기록으로 회복 근거를 정리합니다.</p>
                <label><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} /> 답변 내용이 맞는지 확인했어요.</label>
                <button type="button" onClick={completeInterview} disabled={!checked}>인터뷰 완료하기 →</button>
              </div>
            ) : (
              <div className="consultation-complete"><i aria-hidden="true">✓</i><div><strong>상담 대화가 안전하게 기록되었습니다</strong><span>이 기록을 바탕으로 결과와 다음 동행을 준비합니다.</span></div></div>
            )}
          </footer>
        </section>

        <aside className="consultation-context" aria-label="인터뷰 수집 현황">
          <header><span>DEMO SCENARIO</span><h1>{scenario.persona.businessName}</h1><p>{scenario.persona.borrowerName} 사장님 · {scenario.persona.industryLabel}</p></header>
          <section className="consultation-focus-card"><span>이번 인터뷰의 핵심</span><strong>문 여는 날을<br />다시 늘리는 계획</strong><dl><div><dt>현재</dt><dd>월 {scenario.focus.baselineOperatingDays}일</dd></div><div><dt>목표</dt><dd>월 {scenario.focus.targetOperatingDays}일</dd></div><div><dt>기간</dt><dd>{scenario.focus.horizonMonths}개월</dd></div><div><dt>예산</dt><dd>80만원</dd></div></dl></section>
          <section className="consultation-map"><div><span>BUSINESS MAP</span><b>{answers.length}/{questions.length}</b></div>{INTERVIEW_CATEGORIES.map((category) => { const total = questions.filter((item) => item.category === category).length; const done = answers.filter((item) => questions.find((question) => question.id === item.questionId)?.category === category).length; return <article key={category}><header><strong>{category}</strong><span>{done}/{total}</span></header><i aria-hidden="true"><b style={{ transform: `scaleX(${done / total})` }} /></i></article>; })}</section>
          <p className="consultation-score-note"><strong>시연 검증 기준</strong>같은 거래 데이터에서 사유와 목표가 확인되면 개선가능성은 30.0에서 67.5로 달라집니다. 신용등급이나 승인 판단은 아닙니다.</p>
        </aside>
      </div>

      <p className="human-call-note">입력한 답변은 다음 금융 상담을 준비하기 위한 근거입니다. 최종 금융 판단은 금융기관과 사람이 합니다.</p>
      <MosaicCurtain mode="reveal" />
    </main>
  );
}
