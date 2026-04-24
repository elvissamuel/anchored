import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { errorResponse, HTTP_STATUS, successResponse } from '@/lib/api-response';
import { verifySession } from '@/lib/session';

const prisma = new PrismaClient();

const generateToken = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 10; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
};

export async function POST(request: NextRequest) {
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
        errorResponse('Forbidden'),
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    const body = await request.json().catch(() => ({}));
    const expiresAtRaw = body?.expiresAt;
    const maxUsesRaw = body?.maxUses;

    const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;
    const maxUses = typeof maxUsesRaw === 'number' ? maxUsesRaw : null;

    let created;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const newToken = generateToken();
        created = await prisma.orgInviteLink.create({
          data: {
            token: newToken,
            organizationId: session.organizationId,
            createdById: session.userId,
            expiresAt,
            maxUses,
          },
          select: {
            token: true,
            expiresAt: true,
            maxUses: true,
            usedCount: true,
            createdAt: true,
          },
        });
        break;
      } catch (e: any) {
        if (e?.code === 'P2002') {
          continue;
        }
        throw e;
      }
    }

    if (!created) {
      return NextResponse.json(
        errorResponse('Failed to generate invite code'),
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    const inviteLink = `${request.nextUrl.origin}/auth/register?invite=${created.token}`;

    return NextResponse.json(
      successResponse({
        ...created,
        link: inviteLink,
      }, 'Invite link created'),
      { status: HTTP_STATUS.CREATED }
    );
  } catch (error) {
    console.error('[Organization Invite POST Error]', error);
    return NextResponse.json(
      errorResponse('Failed to create invite link'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}
