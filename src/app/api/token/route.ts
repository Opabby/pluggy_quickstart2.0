import { NextRequest, NextResponse } from 'next/server';
import { pluggyClient } from '@/lib/pluggy/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemId, options } = body;

    const connectToken = await pluggyClient.createConnectToken({
      itemId: itemId || undefined,
      options: options || undefined,
    });

    return NextResponse.json({
      accessToken: connectToken.accessToken,
    });
  } catch (error) {
    console.error('Error creating connect token:', error);
    return NextResponse.json(
      { error: 'Failed to create connect token' },
      { status: 500 }
    );
  }
}