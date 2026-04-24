import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  successResponse,
  errorResponse,
  HTTP_STATUS,
  ApiError,
} from '@/lib/api-response';
import { verifySession } from '@/lib/session';

const prisma = new PrismaClient();

// GET - Fetch tasks with optional filters
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifySession(token) : null;
    const orgRole = session?.orgRole;
    const userId = session?.userId;
    const organizationId = session?.organizationId;

    if (!organizationId) {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const memberGroupIds =
      orgRole === 'MEMBER' && userId
        ? (
            await prisma.groupMember.findMany({
              where: { userId },
              select: { groupId: true },
            })
          ).map((gm) => gm.groupId)
        : [];

    const where: any = {
      organizationId,
    };

    if (orgRole === 'MEMBER' && userId) {
      where.OR = [
        { groupId: null, assignedToUserId: null },
        { assignedToUserId: userId },
        ...(memberGroupIds.length > 0
          ? [{ groupId: { in: memberGroupIds }, assignedToUserId: null }]
          : []),
      ];
    }

    const tasks = await prisma.task.findMany({
      skip,
      take: limit,
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        completions:
          orgRole === 'MEMBER' && userId
            ? {
                where: { userId },
              }
            : true,
      },
    });

    const total = await prisma.task.count({
      where,
    });

    return NextResponse.json(
      successResponse({
        tasks,
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
    console.error('[Tasks GET Error]', error);
    return NextResponse.json(
      errorResponse('Failed to fetch tasks'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST - Create new task (ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session || session.orgRole !== 'ADMIN') {
      return NextResponse.json(
        errorResponse('Unauthorized'),
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      content,
      resourceUrl,
      dueDate,
      assignScope,
      groupId,
      assignedToUserId,
    } = body;

    if (!title) {
      return NextResponse.json(
        errorResponse('Task title is required'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const scope = assignScope === 'GROUP' || assignScope === 'USER' ? assignScope : 'ORG';

    if (scope === 'GROUP') {
      if (!groupId) {
        return NextResponse.json(
          errorResponse('groupId is required for GROUP assignment'),
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }

      const group = await prisma.group.findFirst({
        where: { id: groupId, organizationId: session.organizationId },
        select: { id: true },
      });

      if (!group) {
        return NextResponse.json(
          errorResponse('Group not found'),
          { status: HTTP_STATUS.NOT_FOUND }
        );
      }
    }

    if (scope === 'USER') {
      if (!assignedToUserId) {
        return NextResponse.json(
          errorResponse('assignedToUserId is required for USER assignment'),
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }

      const user = await prisma.user.findFirst({
        where: { id: assignedToUserId, organizationId: session.organizationId },
        select: { id: true },
      });

      if (!user) {
        return NextResponse.json(
          errorResponse('User not found'),
          { status: HTTP_STATUS.NOT_FOUND }
        );
      }
    }

    const normalizedResourceUrl =
      typeof resourceUrl === 'string' && resourceUrl.trim() ? resourceUrl.trim() : null;

    const task = await prisma.task.create({
      data: {
        organizationId: session.organizationId,
        createdById: session.userId,
        title,
        description,
        content,
        resourceUrl: normalizedResourceUrl,
        dueDate: dueDate ? new Date(dueDate) : null,
        groupId: scope === 'GROUP' ? groupId : null,
        assignedToUserId: scope === 'USER' ? assignedToUserId : null,
      },
    });

    return NextResponse.json(
      successResponse(task, 'Task created successfully'),
      { status: HTTP_STATUS.CREATED }
    );
  } catch (error) {
    console.error('[Tasks POST Error]', error);
    return NextResponse.json(
      errorResponse('Failed to create task'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}
