import { NextRequest, NextResponse } from 'next/server';
import { getPluggyClient, hasPluggyCredentials } from '@/app/lib/pluggy/client';
import { accountsService } from '@/app/lib/supabase/services/accounts';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');
    const fromDb = searchParams.get('fromDb') === 'true';

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: 'itemId is required' },
        { status: 400 }
      );
    }

    if (fromDb) {
      const accounts = await accountsService.getAccountsByItemId(itemId);
      return NextResponse.json({
        success: true,
        data: {
          total: accounts.length,
          totalPages: 1,
          page: 1,
          results: accounts,
        },
      });
    }

    if (!hasPluggyCredentials()) {
      return NextResponse.json(
        { success: false, error: 'Missing Pluggy credentials' },
        { status: 500 }
      );
    }

    const pluggyClient = getPluggyClient();
    const accountsResponse = await pluggyClient.fetchAccounts(itemId);

    return NextResponse.json({
      success: true,
      data: accountsResponse,
    });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch accounts',
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