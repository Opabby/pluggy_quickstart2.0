import { NextRequest, NextResponse } from 'next/server';

type RouteHandler = (request: NextRequest) => Promise<NextResponse>;

export function withErrorHandling(handler: RouteHandler): RouteHandler {
  return async (request: NextRequest) => {
    try {
      return await handler(request);
    } catch (error: any) {
      console.error('❌ Route handler error:', {
        url: request.url,
        method: request.method,
        message: error?.message || String(error),
        stack: error?.stack,
        name: error?.name,
        response: error?.response?.data, // For Axios errors
        status: error?.response?.status, // For Axios errors
      });

      return NextResponse.json(
        {
          success: false,
          error: error?.message || 'Internal server error',
          details: error?.response?.data || (error instanceof Error ? error.message : 'Unknown error'),
        },
        { status: error?.response?.status || 500 }
      );
    }
  };
}
