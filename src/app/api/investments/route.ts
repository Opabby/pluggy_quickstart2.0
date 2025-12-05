import { NextRequest, NextResponse } from 'next/server';
import { investmentsService } from '@/app/lib/services/investments';
import { investmentTransactionsService } from '@/app/lib/services/investment-transactions';
import { withErrorHandling } from '@/app/lib/utils/error-handler';

export const runtime = 'nodejs';
export const maxDuration = 30;

async function handleGetInvestments(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const itemId = searchParams.get('itemId');
  const investmentId = searchParams.get('investmentId');
  const transactions = searchParams.get('transactions') === 'true';
  const limit = searchParams.get('limit');
  const offset = searchParams.get('offset');

  // Fetch investment transactions from database
  if (transactions && investmentId) {
    const investmentTransactions = await investmentTransactionsService.getTransactionsByInvestmentId(
      investmentId,
      limit ? parseInt(limit) : undefined,
      offset ? parseInt(offset) : undefined
    );

    return NextResponse.json({
      success: true,
      data: {
        total: investmentTransactions.length,
        totalPages: 1,
        page: offset ? Math.floor(parseInt(offset) / (parseInt(limit || '50') || 50)) + 1 : 1,
        results: investmentTransactions,
      },
    });
  }

  // Fetch investments from database
  if (itemId) {
    const investments = await investmentsService.getInvestmentsByItemId(itemId);
    return NextResponse.json({
      success: true,
      data: investments,
    });
  }

  return NextResponse.json(
    { success: false, error: 'itemId or investmentId is required' },
    { status: 400 }
  );
}

export const GET = withErrorHandling(handleGetInvestments);
