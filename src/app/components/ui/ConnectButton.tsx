'use client';

import { useState } from 'react';
import { Button } from '@chakra-ui/react';
import dynamic from 'next/dynamic';
import { api } from '@/app/lib/utils/api';

// Import dinâmico SEM tipo (para evitar SSR)
const PluggyConnect = dynamic(
  () => import('react-pluggy-connect').then((mod) => mod.PluggyConnect),
  { 
    ssr: false,
    loading: () => null,
  }
);

interface ConnectButtonProps {
  userId?: string;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export function ConnectButton({ userId, onSuccess, onError }: ConnectButtonProps) {
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenConnect = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.post('/api/token', 
        userId ? { userId } : {},
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      console.log('Token received:', data);
      setConnectToken(data.accessToken);
      setIsOpen(true);
    } catch (error) {
      console.error('Error creating token:', error);
      onError('Failed to create connect token');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccess = async (data: any) => {
    console.log('Pluggy success data:', data);
    
    try {
      // Extrair item do retorno do Pluggy
      const item = data.item;
      
      if (!item || !item.id) {
        console.error('Invalid item data:', data);
        onError('Invalid item data received from Pluggy');
        setIsOpen(false);
        return;
      }

      console.log('Saving item:', item);

      // Salvar item no backend
      const response = await api.post('/api/items', {
        item_id: item.id,
        connector_id: item.connector?.id,
        connector_name: item.connector?.name,
        connector_image_url: item.connector?.imageUrl,
        status: item.status,
        last_updated_at: item.lastUpdatedAt,
        created_at: item.createdAt,
        webhook_url: item.webhookUrl,
        user_id: userId,
      });

      console.log('Item saved:', response.data);
      
      setIsOpen(false);
      onSuccess();
    } catch (error) {
      console.error('Error saving item:', error);
      onError('Failed to save item');
      setIsOpen(false);
    }
  };

  const handleError = (error: any) => {
    console.error('Pluggy Connect error:', error);
    onError(error.message || 'Connection failed');
    setIsOpen(false);
  };

  const handleClose = () => {
    console.log('Pluggy widget closed');
    setIsOpen(false);
    setConnectToken(null);
  };

  return (
    <>
      <Button 
        onClick={handleOpenConnect} 
        colorScheme="brand" 
        size="lg"
        isLoading={isLoading}
        loadingText="Connecting..."
      >
        Connect New Account
      </Button>

      {typeof window !== 'undefined' && connectToken && isOpen && (
        <PluggyConnect
          connectToken={connectToken}
          includeSandbox={process.env.NEXT_PUBLIC_INCLUDE_SANDBOX === 'true'}
          onSuccess={handleSuccess}
          onError={handleError}
          onClose={handleClose}
        />
      )}
    </>
  );
}