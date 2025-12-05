import { NextRequest, NextResponse } from 'next/server';
import { loansService } from '@/app/lib/services/loans';
import { withErrorHandling } from '@/app/lib/utils/error-handler';

export const runtime = 'nodejs';
export const maxDuration = 30;

async function handleGetLoans(request: NextRequest) {
  const { searchParams } = request.nextUrl;
    const itemId = searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: 'itemId is required' },
        { status: 400 }
      );
    }

  // Fetch from database (kept in sync by webhooks)
      const loans = await loansService.getLoansByItemId(itemId);

      return NextResponse.json({
        success: true,
        data: loans,
      });
    }

export const GET = withErrorHandling(handleGetLoans);
