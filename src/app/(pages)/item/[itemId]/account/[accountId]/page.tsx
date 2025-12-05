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
  Spinner,
} from '@chakra-ui/react';
import { TransactionsList } from '@/app/components/ui/TransactionsList';
import { CreditCardBillsList } from '@/app/components/ui/CreditCardBillsList';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import { api } from '@/app/lib/utils/api';
import type { AccountRecord } from '@/app/types/pluggy';

export default function AccountDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const itemId = params?.itemId as string;
  const accountId = params?.accountId as string;
  const [account, setAccount] = useState<AccountRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (itemId && accountId) {
      fetchAccount();
    }
  }, [itemId, accountId]);

  const fetchAccount = async () => {
    try {
      // Fetch accounts for the specific item
      const { data: accountsData } = await api.get('/api/accounts', {
        params: { itemId },
      });
      const accounts = accountsData.data?.results || (Array.isArray(accountsData.data) ? accountsData.data : []);
      const foundAccount = accounts.find((a: AccountRecord) => a.account_id === accountId);
      if (foundAccount) {
        setAccount(foundAccount);
      }
    } catch (error) {
      console.error('Error fetching account:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Box minH="100vh" bg="gray.50" py={8}>
        <Container maxW="container.xl">
          <Flex justify="center" align="center" minH="200px">
            <Spinner size="xl" />
          </Flex>
        </Container>
      </Box>
    );
  }

  if (!accountId || !account || !itemId) {
    return (
      <Box minH="100vh" bg="gray.50" py={8}>
        <Container maxW="container.xl">
          <Heading>Account not found</Heading>
          <Button onClick={() => router.push(`/item/${itemId}/accounts`)} variant="ghost" mt={4}>
            Back to Accounts
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
              {account.name || 'Account'} - {account.type === 'CREDIT' ? 'Bills' : 'Transactions'}
            </Heading>
            <Button onClick={() => router.push(`/item/${itemId}/accounts`)} variant="ghost">
              Back to Accounts
            </Button>
          </Flex>

          {/* Transactions or Bills */}
          <ErrorBoundary>
            {account.type === 'CREDIT' ? (
              <CreditCardBillsList accountId={account.account_id} />
            ) : (
              <TransactionsList accountId={account.account_id} />
            )}
          </ErrorBoundary>
        </Stack>
      </Container>
    </Box>
  );
}
