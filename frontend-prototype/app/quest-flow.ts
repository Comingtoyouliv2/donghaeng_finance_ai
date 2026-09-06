/** Pick the next unanswered stop, wrapping back when an earlier quest was skipped. */
export function nextUnansweredQuest(answers: readonly (string | null)[], current = -1): number {
  for (let step = 1; step <= answers.length; step++) {
    const index = (current + step) % answers.length;
    if (!answers[index]) return index;
  }
  return -1;
}
