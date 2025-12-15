import { NextRequest, NextResponse } from 'next/server';
import { loansService } from '@/app/lib/services/loans';
import { withErrorHandling } from '@/app/lib/utils/error-handler';
import { requireItemId } from '@/app/lib/utils/validation';

export const runtime = 'nodejs';
export const maxDuration = 30;

async function handleGetLoans(request: NextRequest) {
  const itemId = requireItemId(request);

  // Fetch from database (kept in sync by webhooks)
  const loans = await loansService.getLoansByItemId(itemId);

  return NextResponse.json({
    success: true,
    data: loans,
  });
}

export const GET = withErrorHandling(handleGetLoans);
