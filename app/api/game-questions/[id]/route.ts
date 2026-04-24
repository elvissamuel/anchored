import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  successResponse,
  errorResponse,
  HTTP_STATUS,
} from '@/lib/api-response';
import { verifySession } from '@/lib/session';

const prisma = new PrismaClient();

function validateOptions(
  options: Array<{ text?: string; isCorrect?: boolean }>
): asserts options is Array<{ text: string; isCorrect: boolean }> {
  if (!Array.isArray(options) || options.length < 2) {
    throw new Error('At least two options are required');
  }
  const correct = options.filter((o) => o.isCorrect === true);
  if (correct.length !== 1) {
    throw new Error('Exactly one option must be marked correct');
  }
  for (const o of options) {
    if (typeof o.text !== 'string' || !o.text.trim()) {
      throw new Error('Each option needs non-empty text');
    }
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session?.organizationId || session.orgRole !== 'ADMIN') {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    const { id } = await params;
    const q = await prisma.gameQuestion.findFirst({
      where: { id, organizationId: session.organizationId },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!q) {
      return NextResponse.json(
        errorResponse('Not found'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    return NextResponse.json(successResponse(q), { status: HTTP_STATUS.OK });
  } catch (error) {
    console.error('[Game question GET]', error);
    return NextResponse.json(
      errorResponse('Failed to load question'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session?.organizationId || session.orgRole !== 'ADMIN') {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    const { id } = await params;
    const existing = await prisma.gameQuestion.findFirst({
      where: { id, organizationId: session.organizationId },
    });

    if (!existing) {
      return NextResponse.json(
        errorResponse('Not found'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    const body = await request.json();
    const { prompt, difficulty, timeLimitSeconds, options } = body;

    if (options) {
      try {
        validateOptions(options);
      } catch (e: unknown) {
        return NextResponse.json(
          errorResponse(e instanceof Error ? e.message : 'Invalid options'),
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }
    }

    const tl =
      typeof timeLimitSeconds === 'number' && timeLimitSeconds >= 5
        ? Math.min(timeLimitSeconds, 300)
        : existing.timeLimitSeconds;

    await prisma.$transaction(async (tx) => {
      await tx.gameQuestion.update({
        where: { id },
        data: {
          ...(typeof prompt === 'string' && prompt.trim()
            ? { prompt: prompt.trim() }
            : {}),
          ...(difficulty === 'EASY' ||
          difficulty === 'MEDIUM' ||
          difficulty === 'HARD'
            ? { difficulty }
            : {}),
          timeLimitSeconds: tl,
        },
      });

      if (options) {
        await tx.gameBankOption.deleteMany({ where: { gameQuestionId: id } });
        await tx.gameBankOption.createMany({
          data: options.map(
            (o: { text: string; isCorrect: boolean }, i: number) => ({
              gameQuestionId: id,
              text: o.text.trim(),
              isCorrect: o.isCorrect,
              sortOrder: i,
            })
          ),
        });
      }
    });

    const q = await prisma.gameQuestion.findFirst({
      where: { id },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });

    return NextResponse.json(successResponse(q, 'Updated'), {
      status: HTTP_STATUS.OK,
    });
  } catch (error) {
    console.error('[Game question PATCH]', error);
    return NextResponse.json(
      errorResponse('Failed to update question'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session?.organizationId || session.orgRole !== 'ADMIN') {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    const { id } = await params;
    const existing = await prisma.gameQuestion.findFirst({
      where: { id, organizationId: session.organizationId },
    });

    if (!existing) {
      return NextResponse.json(
        errorResponse('Not found'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    const blocked = await prisma.gameSessionQuestion.findFirst({
      where: {
        gameQuestionId: id,
        session: { status: { not: 'DRAFT' } },
      },
    });

    if (blocked) {
      return NextResponse.json(
        errorResponse(
          'Question is used in a non-draft game session and cannot be deleted'
        ),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    await prisma.gameSessionQuestion.deleteMany({ where: { gameQuestionId: id } });
    await prisma.gameQuestion.delete({ where: { id } });

    return NextResponse.json(successResponse(null, 'Deleted'), {
      status: HTTP_STATUS.OK,
    });
  } catch (error) {
    console.error('[Game question DELETE]', error);
    return NextResponse.json(
      errorResponse('Failed to delete question'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}
