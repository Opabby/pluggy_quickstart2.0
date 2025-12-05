import { NextRequest, NextResponse } from 'next/server';
import { getPluggyClient } from '@/app/lib/pluggy/client';
import { withErrorHandling } from '@/app/lib/utils/error-handler';

export const runtime = 'nodejs';
export const maxDuration = 30;

async function handleToken(request: NextRequest) {
  console.log('🔑 Token endpoint called');
  
  try {
    console.log('🔑 Getting Pluggy client...');
    const pluggyClient = getPluggyClient();
    console.log('✅ Pluggy client obtained');

    let body: any = {};
    try {
      body = await request.json();
      console.log('✅ Parsed request body:', body);
    } catch (error: any) {
      // If body is empty or not JSON, use empty object
      // This is fine - token creation doesn't require a body
      console.log('ℹ️ No body or invalid JSON, using empty object:', error?.message || 'No body');
      body = {};
    }

    const { itemId, options } = body;

    // Get webhook URL from environment or construct it
    // Only use webhook URL if it's HTTPS (Pluggy requires HTTPS for webhooks)
    let webhookUrl: string | undefined = undefined;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    
    if (appUrl) {
      const fullWebhookUrl = `${appUrl}/api/webhook`;
      // Only set webhook if it's HTTPS or if explicitly configured
      if (fullWebhookUrl.startsWith('https://')) {
        webhookUrl = fullWebhookUrl;
      } else if (process.env.ENABLE_HTTP_WEBHOOK === 'true') {
        // Allow HTTP only if explicitly enabled (for local dev with tunnel)
        webhookUrl = fullWebhookUrl;
      } else {
        console.log('⚠️ Skipping webhook URL (not HTTPS). Set ENABLE_HTTP_WEBHOOK=true for local dev or use HTTPS.');
      }
    }

    console.log('🔑 Webhook URL:', webhookUrl || '(skipped - not HTTPS)');

    // Merge webhook URL into options if not already provided
    const tokenOptions: any = {};
    if (options) {
      Object.assign(tokenOptions, options);
    }
    if (webhookUrl && !tokenOptions.webhookUrl) {
      tokenOptions.webhookUrl = webhookUrl;
    }

    console.log('🔑 Creating connect token with:', { 
      itemId: itemId || undefined, 
      hasOptions: Object.keys(tokenOptions).length > 0,
      tokenOptions: Object.keys(tokenOptions).length > 0 ? tokenOptions : undefined
    });

    const connectToken = await pluggyClient.createConnectToken(
      itemId || undefined,
      Object.keys(tokenOptions).length > 0 ? tokenOptions : undefined
    );

    console.log('✅ Connect token created successfully');
    return NextResponse.json(connectToken);
  } catch (error: any) {
    console.error('❌ Error in handleToken:', {
      message: error?.message || String(error),
      stack: error?.stack,
      name: error?.name,
      response: error?.response?.data,
      status: error?.response?.status,
      fullError: error,
    });
    
    // If it's a Pluggy SDK error, extract the actual message
    if (error?.response?.data) {
      const errorMessage = typeof error.response.data === 'string' 
        ? error.response.data 
        : error.response.data.message || JSON.stringify(error.response.data);
      throw new Error(errorMessage);
    }
    
    throw error;
  }
}

export const POST = withErrorHandling(handleToken);
