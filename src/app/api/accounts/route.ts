import { NextRequest, NextResponse } from 'next/server';
import { accountsService } from '@/app/lib/services/accounts';
import { withErrorHandling } from '@/app/lib/utils/error-handler';
import { requireItemId } from '@/app/lib/utils/validation';

export const runtime = 'nodejs';
export const maxDuration = 30;

async function handleGetAccounts(request: NextRequest) {
  const itemId = requireItemId(request);

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
