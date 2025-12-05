import { NextRequest, NextResponse } from 'next/server';
import { processWebhookEvent } from '@/app/lib/services/webhook';
import { withErrorHandling } from '@/app/lib/utils/error-handler';
import type { WebhookPayload } from '@/app/types/pluggy';

export const runtime = 'nodejs';
export const maxDuration = 30;

// POST: Handle webhook events
async function handleWebhook(request: NextRequest) {
    const payload = (await request.json()) as WebhookPayload;

    console.log('📥 Webhook received:', {
      event: payload.event,
      eventId: payload.eventId,
      url: request.url,
      method: request.method,
    });

    if (!payload.event || !payload.eventId) {
      console.error('❌ Missing required fields in webhook payload:', payload);
      return NextResponse.json(
        { error: 'Missing required fields: event and eventId are required' },
        { status: 400 }
      );
    }

    // Process webhook event (don't await to avoid timeout - process async)
    processWebhookEvent(payload).catch((error) => {
      console.error(`❌ Error processing webhook event ${payload.event}:`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        event: payload.event,
        eventId: payload.eventId,
        payload: JSON.stringify(payload, null, 2),
      });
    });

    // Return success immediately to Pluggy
    return NextResponse.json({
      received: true,
      event: payload.event,
      eventId: payload.eventId,
    });
}

export const POST = withErrorHandling(handleWebhook);
