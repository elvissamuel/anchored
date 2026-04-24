import type { PrismaClient } from '@prisma/client';
import { advanceGameSessionIfNeeded } from '@/lib/game-session-advance';
import type { PlayPhase, PlayStatePayload } from '@/lib/game-play-state.types';

export type { PlayPhase, PlayStatePayload };

export async function buildPlayState(
  prisma: PrismaClient,
  sessionId: string,
  viewerUserId: string | null
): Promise<PlayStatePayload | null> {
  await advanceGameSessionIfNeeded(prisma, sessionId);

  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: {
      questions: {
        orderBy: { sortOrder: 'asc' },
        include: {
          gameQuestion: {
            include: { options: { orderBy: { sortOrder: 'asc' } } },
          },
        },
      },
      participants: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!session) return null;

  const ordered = session.questions;
  const totalQuestions = ordered.length;

  let phase: PlayPhase = 'draft';
  if (session.status === 'LOBBY') phase = 'lobby';
  else if (session.status === 'LIVE') phase = 'question';
  else if (session.status === 'FINISHED') phase = 'finished';

  const currentSq = ordered[session.currentQuestionIndex];
  const gq = currentSq?.gameQuestion ?? null;
  const limitSec = gq ? Math.max(5, gq.timeLimitSeconds ?? 30) : 0;

  let questionEndsAt: string | null = null;
  if (session.status === 'LIVE' && session.questionStartedAt && gq) {
    const ends = new Date(
      session.questionStartedAt.getTime() + limitSec * 1000
    );
    questionEndsAt = ends.toISOString();
  }

  const now = Date.now();

  let currentAnswers: { userId: string }[] = [];
  if (gq) {
    currentAnswers = await prisma.gameSessionAnswer.findMany({
      where: { sessionId, gameQuestionId: gq.id },
      select: { userId: true },
    });
  }
  const answeredUserIds = new Set(currentAnswers.map((a) => a.userId));
  const progressAnswered = answeredUserIds.size;
  const progressTotal = session.participants.length;

  let revealSolution = false;
  if (session.status === 'FINISHED') {
    revealSolution = true;
  } else if (session.status === 'LIVE' && gq && session.questionStartedAt) {
    const endsMs = session.questionStartedAt.getTime() + limitSec * 1000;
    const timedOut = now >= endsMs;
    const allAnswered =
      progressTotal > 0 && progressAnswered >= progressTotal;
    revealSolution = timedOut || allAnswered;
  }

  const questionStillOpen = Boolean(
    session.status === 'LIVE' &&
      session.questionStartedAt &&
      gq &&
      now < session.questionStartedAt.getTime() + limitSec * 1000 &&
      !revealSolution
  );

  const options =
    gq?.options.map((o) => ({
      id: o.id,
      text: o.text,
      ...(revealSolution ? { isCorrect: o.isCorrect } : {}),
    })) ?? [];

  let myAnswer: PlayStatePayload['myAnswer'] = null;
  if (viewerUserId && gq) {
    const row = await prisma.gameSessionAnswer.findUnique({
      where: {
        sessionId_userId_gameQuestionId: {
          sessionId,
          userId: viewerUserId,
          gameQuestionId: gq.id,
        },
      },
    });
    if (row) {
      myAnswer = {
        optionId: row.optionId,
        isCorrect: row.isCorrect,
        pointsAwarded: row.pointsAwarded,
        reactionTimeMs: row.reactionTimeMs,
      };
    }
  }

  const participantsPayload: PlayStatePayload['participants'] =
    session.participants.map((p) => ({
      userId: p.userId,
      firstName: p.user.firstName,
      lastName: p.user.lastName,
      totalScore: p.totalScore,
      joinedAt: p.joinedAt ? p.joinedAt.toISOString() : null,
      answeredCurrent: gq ? answeredUserIds.has(p.userId) : false,
    }));

  const sorted = [...session.participants].sort(
    (a, b) => b.totalScore - a.totalScore
  );
  const podium = sorted.slice(0, 3).map((p, i) => ({
    rank: i + 1,
    userId: p.userId,
    firstName: p.user.firstName,
    lastName: p.user.lastName,
    totalScore: p.totalScore,
  }));

  return {
    phase,
    title: session.title,
    status: session.status,
    currentQuestionIndex: session.currentQuestionIndex,
    totalQuestions,
    questionEndsAt,
    prompt: gq?.prompt ?? null,
    difficulty: gq?.difficulty ?? null,
    timeLimitSeconds: gq?.timeLimitSeconds ?? null,
    options,
    revealSolution,
    questionStillOpen,
    myAnswer,
    participants: participantsPayload,
    progress: { answered: progressAnswered, total: progressTotal },
    podium,
  };
}
