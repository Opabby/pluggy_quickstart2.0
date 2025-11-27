import { NextRequest, NextResponse } from 'next/server';
import { pluggyClient } from '@/lib/pluggy/client';
import { itemsService } from '@/lib/supabase/services/items';
import { accountsService } from '@/lib/supabase/services/accounts';
import { transactionsService } from '@/lib/supabase/services/transactions';


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const itemId = searchParams.get('itemId');

    if (itemId) {
      // Buscar item específico
      const item = await pluggyClient.fetchItem(itemId);
      return NextResponse.json({ success: true, data: item });
    }

    // Buscar todos os items
    const items = await itemsService.getItems(userId || undefined);
    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch items' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const savedItem = await itemsService.upsertItem(body);
    
    return NextResponse.json({ success: true, data: savedItem });
  } catch (error) {
    console.error('Error saving item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save item' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: 'Item ID is required' },
        { status: 400 }
      );
    }

    await pluggyClient.deleteItem(itemId);
    await itemsService.deleteItem(itemId);

    return NextResponse.json({ 
      success: true, 
      message: 'Item deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete item' },
      { status: 500 }
    );
  }
}