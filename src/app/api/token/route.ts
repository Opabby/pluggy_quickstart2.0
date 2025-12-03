import { NextRequest, NextResponse } from 'next/server';
import { getPluggyClient, hasPluggyCredentials } from '@/app/lib/pluggy/client';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    if (!hasPluggyCredentials()) {
      return NextResponse.json(
        { error: 'Missing Pluggy credentials in environment variables' },
        { status: 500 }
      );
    }

    const pluggyClient = getPluggyClient();

    let body: any = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch (parseError) {
      console.log('No body or invalid JSON, using empty object');
    }

    const { itemId, options } = body;

    const connectToken = await pluggyClient.createConnectToken(
      itemId || undefined,
      options || undefined
    );

    return NextResponse.json(connectToken);

  } catch (error) {
    console.error('Error creating connect token:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create connect token',
        details: error instanceof Error ? error.message : 'Unknown error'
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}