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

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session?.organizationId || session.orgRole !== 'ADMIN') {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    const questions = await prisma.gameQuestion.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        options: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { sessionQuestions: true } },
      },
    });

    return NextResponse.json(successResponse({ questions }), {
      status: HTTP_STATUS.OK,
    });
  } catch (error) {
    console.error('[Game questions GET]', error);
    return NextResponse.json(
      errorResponse('Failed to load questions'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session?.organizationId || session.orgRole !== 'ADMIN') {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    const body = await request.json();
    const { prompt, difficulty, timeLimitSeconds, options } = body;

    if (typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json(
        errorResponse('Prompt is required'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    try {
      validateOptions(options);
    } catch (e: unknown) {
      return NextResponse.json(
        errorResponse(e instanceof Error ? e.message : 'Invalid options'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const tl =
      typeof timeLimitSeconds === 'number' && timeLimitSeconds >= 5
        ? Math.min(timeLimitSeconds, 300)
        : 30;

    const q = await prisma.gameQuestion.create({
      data: {
        organizationId: session.organizationId,
        createdById: session.userId,
        prompt: prompt.trim(),
        difficulty:
          difficulty === 'EASY' || difficulty === 'HARD' ? difficulty : 'MEDIUM',
        timeLimitSeconds: tl,
        options: {
          create: options.map(
            (o: { text: string; isCorrect: boolean }, i: number) => ({
              text: o.text.trim(),
              isCorrect: o.isCorrect,
              sortOrder: i,
            })
          ),
        },
      },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });

    return NextResponse.json(successResponse(q, 'Question created'), {
      status: HTTP_STATUS.CREATED,
    });
  } catch (error) {
    console.error('[Game questions POST]', error);
    return NextResponse.json(
      errorResponse('Failed to create question'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}
