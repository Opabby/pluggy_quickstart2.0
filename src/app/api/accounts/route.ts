import { NextRequest, NextResponse } from 'next/server';
import { accountsService } from '@/app/lib/services/accounts';
import { withErrorHandling } from '@/app/lib/utils/error-handler';

export const runtime = 'nodejs';
export const maxDuration = 30;

async function handleGetAccounts(request: NextRequest) {
  const { searchParams } = request.nextUrl;
    const itemId = searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: 'itemId is required' },
        { status: 400 }
      );
    }

  // Fetch from database (kept in sync by webhooks)
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

export const GET = withErrorHandling(handleGetAccounts);
