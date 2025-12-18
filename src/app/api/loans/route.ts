import { NextRequest, NextResponse } from 'next/server';
import { loansService } from '@/app/lib/services/loans';
import { withErrorHandling } from '@/app/lib/utils/error-handler';
import { requireItemId } from '@/app/lib/utils/validation';

export const runtime = 'nodejs';
export const maxDuration = 30;

async function handleGetLoans(request: NextRequest) {
  const itemId = requireItemId(request);

  const loans = await loansService.getLoansByItemId(itemId);

  return NextResponse.json({
  success: true,
  data: {
    results: loans,
    page: 1,
    pageSize: loans.length,
    totalPages: 1,
    totalRecords: loans.length,
  },
});
}

export const GET = withErrorHandling(handleGetLoans);
