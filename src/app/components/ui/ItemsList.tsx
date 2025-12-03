'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Card,
  Text,
  Flex,
  Badge,
  Stack,
  Spinner,
  Heading,
  Button,
  Image,
} from '@chakra-ui/react';
import { api } from '@/app/lib/utils/api';
import { DeleteItemButton } from './DeleteItemButton';
import type { PluggyItemRecord } from '@/app/types/pluggy';

interface ItemsListProps {
  userId?: string;
  onItemSelect?: (item: PluggyItemRecord) => void;
  refreshTrigger?: number;
}

export function ItemsList({ userId, onItemSelect, refreshTrigger }: ItemsListProps) {
  const [items, setItems] = useState<PluggyItemRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data } = await api.get('/api/items', {
        params: { userId },
      });
      
      setItems(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      console.error('Error fetching items:', err);
      setError(err instanceof Error ? err.message : 'Failed to load items');
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems, refreshTrigger]);

  const handleDeleteSuccess = () => {
    fetchItems();
  };

  if (isLoading) {
    return (
      <Flex justify="center" align="center" minH="200px">
        <Spinner size="xl" color="brand.500" />
      </Flex>
    );
  }

  if (error) {
    return (
      <Card.Root p={4}>
        <Text color="red.500">{error}</Text>
        <Button mt={2} onClick={fetchItems} size="sm">
          Retry
        </Button>
      </Card.Root>
    );
  }

  if (items.length === 0) {
    return (
      <Card.Root p={8}>
        <Text textAlign="center" color="gray.500">
          No items connected yet. Connect your first account to get started!
        </Text>
      </Card.Root>
    );
  }

  return (
    <Box>
      <Heading size="lg" mb={4}>
        Connected Items ({items.length})
      </Heading>
      
      <Stack gap={3}>
        {items.map((item) => (
          <Card.Root key={item.item_id} p={4}>
            <Flex justify="space-between" align="center">
              <Flex align="center" gap={3} flex={1}>
                {item.connector_image_url && (
                  <Image
                    src={item.connector_image_url}
                    alt={item.connector_name || 'Connector'}
                    width={10}
                    height={10}
                    borderRadius="8px"
                  />
                )}
                
                <Box flex={1}>
                  <Text fontWeight="semibold" fontSize="lg">
                    {item.connector_name || 'Unknown Connector'}
                  </Text>
                  
                  <Flex gap={2} align="center" mt={1}>
                    {item.status && (
                      <Badge
                        colorScheme={
                          item.status === 'UPDATED'
                            ? 'green'
                            : item.status === 'UPDATING'
                            ? 'blue'
                            : item.status === 'LOGIN_ERROR'
                            ? 'red'
                            : 'gray'
                        }
                        size="sm"
                      >
                        {item.status}
                      </Badge>
                    )}
                    
                    {item.last_updated_at && (
                      <Text fontSize="xs" color="gray.500">
                        Updated: {new Date(item.last_updated_at).toLocaleDateString()}
                      </Text>
                    )}
                  </Flex>
                </Box>
              </Flex>

              <Flex gap={2}>
                {onItemSelect && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onItemSelect(item)}
                  >
                    View Details
                  </Button>
                )}
                
                <DeleteItemButton
                  itemId={item.item_id}
                  itemName={item.connector_name}
                  onDeleteSuccess={handleDeleteSuccess}
                  size="sm"
                />
              </Flex>
            </Flex>
          </Card.Root>
        ))}
      </Stack>
    </Box>
  );
}