import { NextRequest, NextResponse } from 'next/server';
import { getPluggyClient } from '@/app/lib/pluggy/client';
import { withErrorHandling } from '@/app/lib/utils/error-handler';

export const runtime = 'nodejs';
export const maxDuration = 30;

async function handleToken(request: NextRequest) {
  const pluggyClient = getPluggyClient();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const tokenOptions: any = {};
  
  if (appUrl) {
    const webhookUrl = `${appUrl}/api/webhook`;
    if (webhookUrl.startsWith('https://') || process.env.ENABLE_HTTP_WEBHOOK === 'true') {
      tokenOptions.webhookUrl = webhookUrl;
    }
  }

  const connectToken = await pluggyClient.createConnectToken(
    undefined,
    Object.keys(tokenOptions).length > 0 ? tokenOptions : undefined
  );

  return NextResponse.json(connectToken);
}

export const POST = withErrorHandling(handleToken);