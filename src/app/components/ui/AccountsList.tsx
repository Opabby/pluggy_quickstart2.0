'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  Text,
  Flex,
  Badge,
  Stack,
  Spinner,
  Button,
} from '@chakra-ui/react';
import { api } from '@/app/lib/utils/api';
import type { AccountRecord } from '@/app/types/pluggy';

interface AccountsListProps {
  itemId: string;
  onAccountSelect?: (account: AccountRecord) => void;
}

const formatCurrency = (amount: number, currency: string = 'BRL') => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(amount);
};

const getAccountTypeLabel = (type: string) => {
  switch (type) {
    case 'BANK':
      return 'Bank Account';
    case 'CREDIT':
      return 'Credit Card';
    case 'PAYMENT_ACCOUNT':
      return 'Payment Account';
    default:
      return type;
  }
};

const formatAccountSubtype = (subtype?: string) => {
  if (!subtype) return '';
  return subtype.replace(/_/g, ' ');
};

export function AccountsList({ itemId, onAccountSelect }: AccountsListProps) {
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      if (!itemId) {
        setIsLoading(false);
        setAccounts([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { data } = await api.get('/api/accounts', {
          params: { itemId },
        });
        
        // Handle both response formats (with results wrapper or direct array)
        const accountsData = data.data?.results || (Array.isArray(data.data) ? data.data : []);
        setAccounts(accountsData);
      } catch (err) {
        console.error('Error fetching accounts:', err);
        setError(err instanceof Error ? err.message : 'Failed to load accounts');
        setAccounts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccounts();
  }, [itemId]);

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
      </Card.Root>
    );
  }

  if (accounts.length === 0) {
    return (
      <Card.Root p={8}>
        <Text textAlign="center" color="gray.500">
          No accounts found for this item.
        </Text>
      </Card.Root>
    );
  }

  return (
    <Stack gap={4}>
      {accounts.map((account) => (
        <Card.Root key={account.id} p={4}>
          <Flex justify="space-between" align="start">
            <Box>
              <Flex gap={2} align="center" mb={2}>
                <Text fontWeight="bold" fontSize="lg">
                  {account.name}
                </Text>
                <Badge colorScheme={account.type === 'CREDIT' ? 'purple' : 'blue'}>
                  {account.subtype 
                    ? formatAccountSubtype(account.subtype)
                    : getAccountTypeLabel(account.type)}
                </Badge>
              </Flex>

              {account.marketing_name && (
                <Text fontSize="sm" color="gray.500" mb={1}>
                  {account.marketing_name}
                </Text>
              )}

              {account.number && (
                <Text fontSize="sm" color="gray.600">
                  Account: {account.number}
                </Text>
              )}

              {account.owner && (
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Owner: {account.owner}
                </Text>
              )}
            </Box>

            <Box textAlign="right">
              <Text fontSize="2xl" fontWeight="bold" color="brand.600">
                {formatCurrency(account.balance ?? 0, account.currency_code || 'BRL')}
              </Text>

              {account.credit_data?.credit_limit && (
                <Text fontSize="sm" color="gray.600" mt={1}>
                  Limit: {formatCurrency(
                    account.credit_data.credit_limit,
                    account.currency_code || 'BRL'
                  )}
                </Text>
              )}

              {account.credit_data?.available_credit_limit !== undefined && (
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Available: {formatCurrency(
                    account.credit_data.available_credit_limit,
                    account.currency_code || 'BRL'
                  )}
                </Text>
              )}
            </Box>
          </Flex>

          {onAccountSelect && (
            <Button
              size="sm"
              variant="outline"
              mt={4}
              onClick={() => onAccountSelect(account)}
            >
              {account.type === 'CREDIT' ? 'View Bills' : 'View Transactions'}
            </Button>
          )}
        </Card.Root>
      ))}
    </Stack>
  );
}