import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyPassword, AUTH_ERRORS } from '@/lib/auth';
import { createSession } from '@/lib/session';
import { successResponse, errorResponse, HTTP_STATUS } from '@/lib/api-response';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        errorResponse('Email and password are required'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        errorResponse(AUTH_ERRORS.INVALID_CREDENTIALS),
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        errorResponse(AUTH_ERRORS.INVALID_CREDENTIALS),
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    // Create session
    const token = await createSession({
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId,
      orgRole: user.orgRole as any,
      firstName: user.firstName,
      lastName: user.lastName,
    });

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
        'Login successful'
      ),
      { status: HTTP_STATUS.OK }
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
    console.error('[Login Error]', error);
    return NextResponse.json(
      errorResponse('Internal server error'),
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  } finally {
    await prisma.$disconnect();
  }
}
