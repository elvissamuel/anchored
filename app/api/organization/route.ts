import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { errorResponse, HTTP_STATUS, successResponse } from '@/lib/api-response';
import { verifySession } from '@/lib/session';

const prisma = new PrismaClient();

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

    const organization = await prisma.organization.findUnique({
      where: { id: session.organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
        inviteLinks: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            token: true,
            expiresAt: true,
            maxUses: true,
            usedCount: true,
            createdAt: true,
          },
        },
      },
    });

    if (!organization) {
      return NextResponse.json(
        errorResponse('Organization not found'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    const invite = organization.inviteLinks?.[0] || null;
    const inviteLink = invite ? `${request.nextUrl.origin}/auth/register?invite=${invite.token}` : null;

    return NextResponse.json(
      successResponse({
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          createdAt: organization.createdAt,
          updatedAt: organization.updatedAt,
        },
        invite: invite
          ? {
              ...invite,
              link: inviteLink,
            }
          : null,
      }),
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    console.error('[Organization GET Error]', error);
    return NextResponse.json(
      errorResponse('Failed to fetch organization'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}
