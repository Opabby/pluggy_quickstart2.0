import { NextRequest, NextResponse } from 'next/server';
import { getPluggyClient, hasPluggyCredentials } from '@/app/lib/pluggy/client';
import { loansService } from '@/app/lib/supabase/services/loans';

export const runtime = 'nodejs';
export const maxDuration = 30;

// GET: Fetch loans
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

    // Fetch from database
    if (fromDb) {
      const loans = await loansService.getLoansByItemId(itemId);
      return NextResponse.json({
        success: true,
        data: loans,
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
    const loansResponse = await pluggyClient.fetchLoans(itemId);

    return NextResponse.json({
      success: true,
      data: loansResponse,
    });
  } catch (error) {
    console.error('Error fetching loans:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch loans',
      },
      { status: 500 }
    );
  }
}

// POST: Save loans
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loans } = body;

    if (!loans || !Array.isArray(loans)) {
      return NextResponse.json(
        { success: false, error: 'loans array is required' },
        { status: 400 }
      );
    }

    const savedLoans = await loansService.upsertMultipleLoans(loans);

    return NextResponse.json({
      success: true,
      data: savedLoans,
    });
  } catch (error) {
    console.error('Error saving loans:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save loans',
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