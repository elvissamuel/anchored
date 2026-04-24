import { NextRequest, NextResponse } from 'next/server';
import { successResponse, HTTP_STATUS } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  const response = NextResponse.json(
    successResponse(null, 'Logout successful'),
    { status: HTTP_STATUS.OK }
  );

  response.cookies.delete('session');

  return response;
}
