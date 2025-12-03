import { NextRequest, NextResponse } from 'next/server';
import { getPluggyClient, hasPluggyCredentials } from '@/app/lib/pluggy/client';
import { transactionsService } from '@/app/lib/supabase/services/transactions';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const fromDb = searchParams.get('fromDb') === 'true';
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const page = searchParams.get('page');
    const pageSize = searchParams.get('pageSize');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    console.log('📥 Transaction request:', {
      accountId,
      fromDb,
      from,
      to,
      page,
      pageSize,
      limit,
      offset,
      fullUrl: request.url,
    });

    if (!accountId) {
      console.error('❌ Missing accountId');
      return NextResponse.json(
        { success: false, error: 'accountId is required' },
        { status: 400 }
      );
    }

    if (fromDb) {
      console.log('💾 Fetching from database...');
      const transactions = await transactionsService.getTransactionsByAccountId(
        accountId,
        limit ? parseInt(limit) : undefined,
        offset ? parseInt(offset) : undefined
      );

      console.log(`✅ Found ${transactions.length} transactions`);

      return NextResponse.json({
        success: true,
        data: transactions,
      });
    }

    // Fetch from Pluggy API
    console.log('🔌 Fetching from Pluggy API...');
    if (!hasPluggyCredentials()) {
      return NextResponse.json(
        { success: false, error: 'Missing Pluggy credentials' },
        { status: 500 }
      );
    }

    const pluggyClient = getPluggyClient();
    const transactionsResponse = await pluggyClient.fetchTransactions(accountId, {
      from: from || undefined,
      to: to || undefined,
      pageSize: pageSize ? parseInt(pageSize) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: transactionsResponse,
    });
  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch transactions',
      },
      { status: 500 }
    );
  }
}

// POST: Save transactions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactions } = body;

    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json(
        { success: false, error: 'transactions array is required' },
        { status: 400 }
      );
    }

    const savedTransactions = await transactionsService.upsertMultipleTransactions(
      transactions
    );

    return NextResponse.json({
      success: true,
      data: savedTransactions,
    });
  } catch (error) {
    console.error('Error saving transactions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save transactions',
      },
      { status: 500 }
    );
  }
}

// DELETE: Delete transaction
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');

    if (!transactionId) {
      return NextResponse.json(
        { success: false, error: 'transactionId is required' },
        { status: 400 }
      );
    }

    await transactionsService.deleteTransaction(transactionId);

    return NextResponse.json({
      success: true,
      message: 'Transaction deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete transaction',
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}