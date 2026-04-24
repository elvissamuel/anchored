/**
 * Points favor correct answers answered quickly within the time limit.
 * Correct: between 100 and 1500 points. Wrong: 0.
 */
export function scoreTimedAnswer(
  questionOpenedAt: Date,
  answeredAt: Date,
  timeLimitSeconds: number,
  isCorrect: boolean
): { pointsAwarded: number; reactionTimeMs: number } {
  const limitMs = Math.max(1000, timeLimitSeconds * 1000);
  const elapsed = Math.max(0, answeredAt.getTime() - questionOpenedAt.getTime());
  const reactionTimeMs = Math.min(elapsed, limitMs);

  if (!isCorrect) {
    return { pointsAwarded: 0, reactionTimeMs: elapsed };
  }

  const speedRatio = Math.min(1, elapsed / limitMs);
  const points = Math.round(100 + (1 - speedRatio) * 1400);
  return { pointsAwarded: Math.max(100, points), reactionTimeMs: elapsed };
}
