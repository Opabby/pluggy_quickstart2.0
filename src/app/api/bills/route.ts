import { NextRequest, NextResponse } from 'next/server';
import { creditCardBillsService } from '@/app/lib/supabase/services/credit-card-bills';

export const runtime = 'nodejs';
export const maxDuration = 30;

// GET: Fetch credit card bills
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const fromDb = searchParams.get('fromDb') === 'true';

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: 'accountId is required' },
        { status: 400 }
      );
    }

    if (fromDb) {
      const bills = await creditCardBillsService.getBillsByAccountId(accountId);
      return NextResponse.json({
        success: true,
        data: bills,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Only database queries supported for bills' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error fetching bills:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch bills',
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}