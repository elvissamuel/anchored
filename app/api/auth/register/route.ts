import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  hashPassword,
  validatePassword,
  validateEmail,
  AUTH_ERRORS,
} from '@/lib/auth';
import { createSession, setSessionCookie } from '@/lib/session';
import { successResponse, errorResponse, HTTP_STATUS } from '@/lib/api-response';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName, orgName, inviteToken } = body;

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        errorResponse('All fields are required'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (!inviteToken && !orgName) {
      return NextResponse.json(
        errorResponse('Organization name is required'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        errorResponse(AUTH_ERRORS.INVALID_EMAIL),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        errorResponse(passwordValidation.error!),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        errorResponse(AUTH_ERRORS.USER_EXISTS),
        { status: HTTP_STATUS.CONFLICT }
      );
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);

    const toSlug = (name: string) =>
      name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

    const user = await prisma.$transaction(async (tx) => {
      if (inviteToken) {
        const link = await tx.orgInviteLink.findUnique({
          where: { token: inviteToken },
        });

        const now = new Date();
        if (!link) {
          throw new Error('INVALID_INVITE');
        }
        if (link.expiresAt && link.expiresAt < now) {
          throw new Error('INVITE_EXPIRED');
        }
        if (link.maxUses !== null && link.maxUses !== undefined && link.usedCount >= link.maxUses) {
          throw new Error('INVITE_MAX_USES');
        }

        const createdUser = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            firstName,
            lastName,
            organizationId: link.organizationId,
            orgRole: 'MEMBER',
          },
        });

        await tx.orgInviteLink.update({
          where: { id: link.id },
          data: {
            usedCount: { increment: 1 },
          },
        });

        return createdUser;
      }

      const slugBase = toSlug(orgName);
      const organization = await tx.organization.create({
        data: {
          name: orgName,
          slug: slugBase,
        },
      });

      return tx.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          organizationId: organization.id,
          orgRole: 'ADMIN',
        },
      });
    });

    // Create session
    const token = await createSession({
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId,
      orgRole: user.orgRole as any,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    // Set session cookie
    const response = NextResponse.json(
      successResponse(
        {
          userId: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          organizationId: user.organizationId,
          orgRole: user.orgRole,
        },
        'Registration successful'
      ),
      { status: HTTP_STATUS.CREATED }
    );

    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'INVALID_INVITE') {
        return NextResponse.json(
          errorResponse('Invalid invite link'),
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }
      if (error.message === 'INVITE_EXPIRED') {
        return NextResponse.json(
          errorResponse('Invite link has expired'),
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }
      if (error.message === 'INVITE_MAX_USES') {
        return NextResponse.json(
          errorResponse('Invite link has reached max uses'),
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }
    }
    console.error('[Register Error]', error);
    return NextResponse.json(
      errorResponse('Internal server error'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}
