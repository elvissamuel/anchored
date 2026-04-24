import type { Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

async function moveToNextOrFinish(
  db: Db,
  sessionId: string,
  session: {
    currentQuestionIndex: number;
    questions: { id: string }[];
  },
  now: Date
) {
  const idx = session.currentQuestionIndex;
  const nextIdx = idx + 1;
  if (nextIdx >= session.questions.length) {
    await db.gameSession.update({
      where: { id: sessionId },
      data: {
        status: 'FINISHED',
        finishedAt: now,
        questionStartedAt: null,
        pendingAdvanceAt: null,
      },
    });
  } else {
    await db.gameSession.update({
      where: { id: sessionId },
      data: {
        currentQuestionIndex: nextIdx,
        questionStartedAt: now,
        pendingAdvanceAt: null,
      },
    });
  }
}

/**
 * If the live question has timed out or everyone answered, advance to the next
 * question or finish the session. Safe to call on every poll.
 */
export async function advanceGameSessionIfNeeded(
  db: Db,
  sessionId: string
): Promise<void> {
  const now = new Date();

  const session = await db.gameSession.findFirst({
    where: { id: sessionId, status: 'LIVE' },
    include: {
      questions: {
        orderBy: { sortOrder: 'asc' },
        include: { gameQuestion: true },
      },
      participants: true,
    },
  });

  if (!session || !session.questionStartedAt) return;

  const idx = session.currentQuestionIndex;
  const sq = session.questions[idx];
  if (!sq) {
    await db.gameSession.update({
      where: { id: sessionId },
      data: {
        status: 'FINISHED',
        finishedAt: now,
        questionStartedAt: null,
        pendingAdvanceAt: null,
      },
    });
    return;
  }

  const gq = sq.gameQuestion;
  if (!gq) {
    console.error(
      '[advanceGameSessionIfNeeded] Missing gameQuestion for session',
      sessionId,
      'sortOrder index',
      idx
    );
    await db.gameSession.update({
      where: { id: sessionId },
      data: {
        status: 'FINISHED',
        finishedAt: now,
        questionStartedAt: null,
        pendingAdvanceAt: null,
      },
    });
    return;
  }

  const limitSec = Math.max(5, gq.timeLimitSeconds ?? 30);
  const endsAt = new Date(
    session.questionStartedAt.getTime() + limitSec * 1000
  );

  const answerCount = await db.gameSessionAnswer.count({
    where: { sessionId, gameQuestionId: gq.id },
  });

  const allAnswered =
    session.participants.length > 0 &&
    answerCount >= session.participants.length;
  const timedOut = now.getTime() >= endsAt.getTime();

  if (!allAnswered && !timedOut) {
    if (session.pendingAdvanceAt) {
      await db.gameSession.update({
        where: { id: sessionId },
        data: { pendingAdvanceAt: null },
      });
    }
    return;
  }

  if (timedOut) {
    if (session.pendingAdvanceAt) {
      await db.gameSession.update({
        where: { id: sessionId },
        data: { pendingAdvanceAt: null },
      });
    }
    await moveToNextOrFinish(db, sessionId, session, now);
    return;
  }

  // All answered before timer: wait ~2.5s so clients can show correct answers & scores
  const pauseMs = 2500;
  if (!session.pendingAdvanceAt) {
    await db.gameSession.update({
      where: { id: sessionId },
      data: {
        pendingAdvanceAt: new Date(now.getTime() + pauseMs),
      },
    });
    return;
  }

  if (now.getTime() < session.pendingAdvanceAt.getTime()) return;

  await db.gameSession.update({
    where: { id: sessionId },
    data: { pendingAdvanceAt: null },
  });
  await moveToNextOrFinish(db, sessionId, session, now);
}

/** Admin: skip timer and move to the next question (or finish). */
export async function forceAdvanceGameSession(
  db: Db,
  sessionId: string
): Promise<void> {
  const now = new Date();
  const session = await db.gameSession.findFirst({
    where: { id: sessionId, status: 'LIVE' },
    include: {
      questions: { orderBy: { sortOrder: 'asc' } },
    },
  });

  if (!session?.questionStartedAt) return;

  await moveToNextOrFinish(db, sessionId, session, now);
}
