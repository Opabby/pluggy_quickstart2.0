'use client';

import { useState } from 'react';
import { Button } from '@chakra-ui/react';
import { api } from '@/app/lib/utils/api';

interface DeleteItemButtonProps {
  itemId: string;
  itemName?: string;
  onDeleteSuccess?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function DeleteItemButton({
  itemId,
  itemName,
  onDeleteSuccess,
  size = 'sm',
}: DeleteItemButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${itemName || 'this item'}? This action cannot be undone.`
    );

    if (!confirmed) return;

    setIsDeleting(true);

    try {
      await api.delete('/api/items', {
        params: { itemId },
      });

      onDeleteSuccess?.();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button
      size={size}
      colorScheme="red"
      variant="outline"
      onClick={handleDelete}
      isLoading={isDeleting}
      loadingText="Deleting..."
    >
      Delete
    </Button>
  );
}