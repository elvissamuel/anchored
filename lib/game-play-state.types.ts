export type PlayPhase = 'draft' | 'lobby' | 'question' | 'finished';

export interface PlayStatePayload {
  phase: PlayPhase;
  title: string;
  status: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  questionEndsAt: string | null;
  prompt: string | null;
  difficulty: string | null;
  timeLimitSeconds: number | null;
  options: Array<{ id: string; text: string; isCorrect?: boolean }>;
  revealSolution: boolean;
  questionStillOpen: boolean;
  myAnswer: {
    optionId: string;
    isCorrect: boolean;
    pointsAwarded: number;
    reactionTimeMs: number;
  } | null;
  participants: Array<{
    userId: string;
    firstName: string;
    lastName: string;
    totalScore: number;
    joinedAt: string | null;
    answeredCurrent: boolean;
  }>;
  progress: { answered: number; total: number };
  podium: Array<{
    rank: number;
    userId: string;
    firstName: string;
    lastName: string;
    totalScore: number;
  }>;
}
