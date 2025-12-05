'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Heading,
  Text,
  Stack,
  Flex,
} from '@chakra-ui/react';
import { ConnectButton } from '@/app/components/ui/ConnectButton';
import { ItemsList } from '@/app/components/ui/ItemsList';

export default function HomePage() {
  const router = useRouter();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSuccess = () => {
    console.log('New item connected');
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleError = (message: string) => {
    console.error('Connection error:', message);
  };

  const handleItemSelect = (item: { item_id: string }) => {
    // Navigate to item accounts page (default view)
    router.push(`/item/${item.item_id}/accounts`);
  };

  return (
    <Box minH="100vh" bg="gray.50" py={8}>
      <Container maxW="container.xl">
        <Stack gap={8}>
          {/* Header */}
          <Flex justify="space-between" align="center">
            <Box>
              <Heading size="2xl" mb={2}>
                Pluggy Financial Dashboard
              </Heading>
              <Text color="gray.600">
                Connect and manage your financial accounts
              </Text>
            </Box>
            
            <ConnectButton
              onSuccess={handleSuccess}
              onError={handleError}
            />
          </Flex>

          {/* Main Content - Items List */}
          <ItemsList
            onItemSelect={handleItemSelect}
            refreshTrigger={refreshTrigger}
          />
        </Stack>
      </Container>
    </Box>
  );
}