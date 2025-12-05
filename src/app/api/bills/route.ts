import { NextRequest, NextResponse } from 'next/server';
import { creditCardBillsService } from '@/app/lib/services/credit-card-bills';
import { withErrorHandling } from '@/app/lib/utils/error-handler';

export const runtime = 'nodejs';
export const maxDuration = 30;

async function handleGetBills(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const accountId = searchParams.get('accountId');

  if (!accountId) {
    return NextResponse.json(
      { success: false, error: 'accountId is required' },
      { status: 400 }
    );
  }

  // Fetch from database (bills are synced via webhook)
  const bills = await creditCardBillsService.getBillsByAccountId(accountId);
  return NextResponse.json({
    success: true,
    data: bills,
  });
}

export const GET = withErrorHandling(handleGetBills);
