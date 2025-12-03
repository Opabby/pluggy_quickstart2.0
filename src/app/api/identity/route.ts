import { NextRequest, NextResponse } from 'next/server';
import { getPluggyClient, hasPluggyCredentials } from '@/app/lib/pluggy/client';
import { identityService } from '@/app/lib/supabase/services/identity';

export const runtime = 'nodejs';
export const maxDuration = 30;

// GET: Fetch identity
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
      const identity = await identityService.getIdentityByItemId(itemId);

      if (!identity) {
        return NextResponse.json(
          { success: false, error: 'Identity not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: identity,
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

    try {
      const identity = await pluggyClient.fetchIdentityByItemId(itemId);

      if (!identity) {
        return NextResponse.json(
          { success: false, error: 'Identity not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: identity,
      });
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return NextResponse.json(
          { success: false, error: 'Identity not found for this item' },
          { status: 404 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error fetching identity:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch identity',
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