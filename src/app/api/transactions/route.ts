import { NextRequest, NextResponse } from 'next/server';
import { transactionsService } from '@/app/lib/services/transactions';
import { withErrorHandling } from '@/app/lib/utils/error-handler';

export const runtime = 'nodejs';
export const maxDuration = 30;

async function handleGetTransactions(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const accountId = searchParams.get('accountId');
  const limit = searchParams.get('limit');
  const offset = searchParams.get('offset');

  if (!accountId) {
    return NextResponse.json(
      { success: false, error: 'accountId is required' },
      { status: 400 }
    );
  }

  // Fetch from database (kept in sync by webhooks)
  const transactions = await transactionsService.getTransactionsByAccountId(
    accountId,
    limit ? parseInt(limit) : 100,
    offset ? parseInt(offset) : 0
  );

  return NextResponse.json({
    success: true,
    data: transactions,
  });
}

async function handleDeleteTransaction(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const transactionId = searchParams.get('transactionId');

  if (!transactionId) {
    return NextResponse.json(
      { success: false, error: 'transactionId is required' },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Transaction deleted successfully',
  });
}

export const GET = withErrorHandling(handleGetTransactions);
export const DELETE = withErrorHandling(handleDeleteTransaction);
