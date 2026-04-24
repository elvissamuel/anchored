import { NextRequest, NextResponse } from 'next/server';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  successResponse,
  errorResponse,
  HTTP_STATUS,
} from '@/lib/api-response';
import { verifySession } from '@/lib/session';

const prisma = new PrismaClient();

// GET - Fetch all users (ADMIN only)
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session?.organizationId) {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    if (session.orgRole !== 'ADMIN') {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    const search = searchParams.get('search') || '';

    const OR = search
      ? ([
          { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { firstName: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { lastName: { contains: search, mode: Prisma.QueryMode.insensitive } },
        ] satisfies Prisma.UserWhereInput[])
      : undefined;

    const where = {
      organizationId: session.organizationId,
      ...(OR ? { OR } : {}),
    } satisfies Prisma.UserWhereInput;

    const users = await prisma.user.findMany({
      skip,
      take: limit,
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        orgRole: true,
        createdAt: true,
        _count: {
          select: {
            taskCompletions: true,
            quizAttempts: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const total = await prisma.user.count({ where });

    return NextResponse.json(
      successResponse({
        users,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      }),
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error('[Users GET Error]', error);
    return NextResponse.json(
      errorResponse('Failed to fetch users'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}
