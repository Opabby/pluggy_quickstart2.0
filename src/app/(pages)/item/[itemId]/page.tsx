'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Box,
  Container,
  Heading,
  Button,
  Flex,
  Stack,
  Tabs,
} from '@chakra-ui/react';
import { AccountsList } from '@/app/components/ui/AccountsList';
import { IdentityDisplay } from '@/app/components/ui/IdentityDisplay';
import { InvestmentsList } from '@/app/components/ui/InvestmentsList';
import { LoansList } from '@/app/components/ui/LoansList';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import { api } from '@/app/lib/utils/api';
import type { AccountRecord, InvestmentRecord, LoanRecord, PluggyItemRecord } from '@/app/types/pluggy';

export default function ItemDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const itemId = params?.itemId as string;
  const [item, setItem] = useState<PluggyItemRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (itemId) {
      fetchItem();
    }
  }, [itemId]);

  const fetchItem = async () => {
    try {
      const { data } = await api.get('/api/items');
      const items = Array.isArray(data.data) ? data.data : [];
      const foundItem = items.find((i: PluggyItemRecord) => i.item_id === itemId);
      setItem(foundItem || null);
    } catch (error) {
      console.error('Error fetching item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountSelect = (account: AccountRecord) => {
    router.push(`/item/${itemId}/account/${account.account_id}`);
  };

  const handleInvestmentSelect = (investment: InvestmentRecord) => {
    router.push(`/item/${itemId}/investments/${investment.investment_id}`);
  };

  const handleLoanSelect = (loan: LoanRecord) => {
    router.push(`/item/${itemId}/loans/${loan.loan_id}`);
  };

  if (isLoading) {
    return (
      <Box minH="100vh" bg="gray.50" py={8}>
        <Container maxW="container.xl">
          <Heading>Loading...</Heading>
        </Container>
      </Box>
    );
  }

  if (!itemId || !item) {
    return (
      <Box minH="100vh" bg="gray.50" py={8}>
        <Container maxW="container.xl">
          <Heading>Item not found</Heading>
          <Button onClick={() => router.push('/')} variant="ghost" mt={4}>
            Back to Items
          </Button>
        </Container>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50" py={8}>
      <Container maxW="container.xl">
        <Stack gap={8}>
          {/* Header */}
          <Flex justify="space-between" align="center">
            <Heading size="lg">
              {item.connector_name || 'Item Details'}
            </Heading>
            <Button onClick={() => router.push('/')} variant="ghost">
              Back to Items
            </Button>
          </Flex>

          {/* Tabs */}
          <ErrorBoundary>
            <Tabs.Root 
              defaultValue="accounts"
              value={typeof window !== 'undefined' ? window.location.pathname.split('/').pop() || 'accounts' : 'accounts'}
              onValueChange={(details) => {
                const value = typeof details === 'string' ? details : details.value;
                router.push(`/item/${itemId}/${value}`);
              }}
            >
              <Tabs.List>
                <Tabs.Trigger value="accounts">Accounts</Tabs.Trigger>
                <Tabs.Trigger value="investments">Investments</Tabs.Trigger>
                <Tabs.Trigger value="loans">Loans</Tabs.Trigger>
                <Tabs.Trigger value="identity">Identity</Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="accounts" pt={4}>
                <ErrorBoundary>
                  <AccountsList
                    itemId={item.item_id}
                    onAccountSelect={handleAccountSelect}
                  />
                </ErrorBoundary>
              </Tabs.Content>

              <Tabs.Content value="investments" pt={4}>
                <ErrorBoundary>
                  <InvestmentsList
                    itemId={item.item_id}
                    onInvestmentSelect={handleInvestmentSelect}
                  />
                </ErrorBoundary>
              </Tabs.Content>

              <Tabs.Content value="loans" pt={4}>
                <ErrorBoundary>
                  <LoansList
                    itemId={item.item_id}
                    onLoanSelect={handleLoanSelect}
                  />
                </ErrorBoundary>
              </Tabs.Content>

              <Tabs.Content value="identity" pt={4}>
                <ErrorBoundary>
                  <IdentityDisplay itemId={item.item_id} />
                </ErrorBoundary>
              </Tabs.Content>
            </Tabs.Root>
          </ErrorBoundary>
        </Stack>
      </Container>
    </Box>
  );
}
