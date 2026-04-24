-- CreateEnum
CREATE TYPE "GameQuestionDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "GameSessionStatus" AS ENUM ('DRAFT', 'LOBBY', 'LIVE', 'FINISHED');

-- CreateTable
CREATE TABLE "GameQuestion" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "difficulty" "GameQuestionDifficulty" NOT NULL DEFAULT 'MEDIUM',
    "timeLimitSeconds" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameBankOption" (
    "id" TEXT NOT NULL,
    "gameQuestionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GameBankOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "GameSessionStatus" NOT NULL DEFAULT 'DRAFT',
    "currentQuestionIndex" INTEGER NOT NULL DEFAULT 0,
    "questionStartedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSessionQuestion" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "gameQuestionId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "GameSessionQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSessionParticipant" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3),

    CONSTRAINT "GameSessionParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSessionAnswer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameQuestionId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reactionTimeMs" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GameSessionAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameQuestion_organizationId_idx" ON "GameQuestion"("organizationId");

-- CreateIndex
CREATE INDEX "GameBankOption_gameQuestionId_idx" ON "GameBankOption"("gameQuestionId");

-- CreateIndex
CREATE INDEX "GameSession_organizationId_idx" ON "GameSession"("organizationId");

-- CreateIndex
CREATE INDEX "GameSession_status_idx" ON "GameSession"("status");

-- CreateIndex
CREATE INDEX "GameSessionQuestion_sessionId_idx" ON "GameSessionQuestion"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "GameSessionQuestion_sessionId_sortOrder_key" ON "GameSessionQuestion"("sessionId", "sortOrder");

-- CreateIndex
CREATE INDEX "GameSessionParticipant_sessionId_idx" ON "GameSessionParticipant"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "GameSessionParticipant_sessionId_userId_key" ON "GameSessionParticipant"("sessionId", "userId");

-- CreateIndex
CREATE INDEX "GameSessionAnswer_sessionId_idx" ON "GameSessionAnswer"("sessionId");

-- CreateIndex
CREATE INDEX "GameSessionAnswer_userId_idx" ON "GameSessionAnswer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GameSessionAnswer_sessionId_userId_gameQuestionId_key" ON "GameSessionAnswer"("sessionId", "userId", "gameQuestionId");

-- AddForeignKey
ALTER TABLE "GameQuestion" ADD CONSTRAINT "GameQuestion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameQuestion" ADD CONSTRAINT "GameQuestion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameBankOption" ADD CONSTRAINT "GameBankOption_gameQuestionId_fkey" FOREIGN KEY ("gameQuestionId") REFERENCES "GameQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSessionQuestion" ADD CONSTRAINT "GameSessionQuestion_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSessionQuestion" ADD CONSTRAINT "GameSessionQuestion_gameQuestionId_fkey" FOREIGN KEY ("gameQuestionId") REFERENCES "GameQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSessionParticipant" ADD CONSTRAINT "GameSessionParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSessionParticipant" ADD CONSTRAINT "GameSessionParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSessionAnswer" ADD CONSTRAINT "GameSessionAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSessionAnswer" ADD CONSTRAINT "GameSessionAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSessionAnswer" ADD CONSTRAINT "GameSessionAnswer_gameQuestionId_fkey" FOREIGN KEY ("gameQuestionId") REFERENCES "GameQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSessionAnswer" ADD CONSTRAINT "GameSessionAnswer_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "GameBankOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
