import { NextRequest, NextResponse } from 'next/server';
import { investmentsService } from '@/app/lib/services/investments';
import { withErrorHandling } from '@/app/lib/utils/error-handler';
import { requireItemId } from '@/app/lib/utils/validation';

export const runtime = 'nodejs';
export const maxDuration = 30;

async function handleGetInvestments(request: NextRequest) {
  const itemId = requireItemId(request);

  const investments = await investmentsService.getInvestmentsByItemId(itemId);
  return NextResponse.json({
    success: true,
    data: investments,
  });
}

export const GET = withErrorHandling(handleGetInvestments);
