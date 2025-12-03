import { NextRequest, NextResponse } from 'next/server';
import { getPluggyClient, hasPluggyCredentials } from '@/app/lib/pluggy/client';
import { investmentsService } from '@/app/lib/supabase/services/investments';

export const runtime = 'nodejs';
export const maxDuration = 30;

// GET: Fetch investments or investment transactions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');
    const investmentId = searchParams.get('investmentId');
    const fromDb = searchParams.get('fromDb') === 'true';
    const transactions = searchParams.get('transactions') === 'true';
    const page = searchParams.get('page');
    const pageSize = searchParams.get('pageSize');

    // Fetch investment transactions from database
    if (transactions && investmentId && fromDb) {
      const investmentTransactions = await investmentsService.getInvestmentsByItemId(
        investmentId
      );

      return NextResponse.json({
        success: true,
        data: {
          total: investmentTransactions.length,
          totalPages: 1,
          page: parseInt(page || '1'),
          results: investmentTransactions,
        },
      });
    }

    // Fetch investments from database
    if (itemId && fromDb) {
      const investments = await investmentsService.getInvestmentsByItemId(itemId);
      return NextResponse.json({
        success: true,
        data: investments,
      });
    }

    // Fetch from Pluggy API
    if (!hasPluggyCredentials()) {
      return NextResponse.json(
        { success: false, error: 'Missing Pluggy credentials' },
        { status: 500 }
      );
    }

    const pluggyClient = getPluggyClient();

    // Fetch investment transactions from Pluggy
    if (transactions && investmentId) {
      const transactionsResponse = await pluggyClient.fetchInvestmentTransactions(
        investmentId,
        {
          pageSize: pageSize ? parseInt(pageSize) : undefined,
        }
      );

      return NextResponse.json({
        success: true,
        data: transactionsResponse,
      });
    }

    // Fetch investments from Pluggy
    if (itemId) {
      const investmentsResponse = await pluggyClient.fetchInvestments(itemId);
      return NextResponse.json({
        success: true,
        data: investmentsResponse,
      });
    }

    return NextResponse.json(
      { success: false, error: 'itemId or investmentId is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error fetching investments:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch investments',
      },
      { status: 500 }
    );
  }
}

// POST: Save investments
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { investments } = body;

    if (!investments || !Array.isArray(investments)) {
      return NextResponse.json(
        { success: false, error: 'investments array is required' },
        { status: 400 }
      );
    }

    const savedInvestments = await investmentsService.upsertMultipleInvestments(
      investments
    );

    return NextResponse.json({
      success: true,
      data: savedInvestments,
    });
  } catch (error) {
    console.error('Error saving investments:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save investments',
      },
      { status: 500 }
    );
  }
}

// OPTIONS: Handle CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}