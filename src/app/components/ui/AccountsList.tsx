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
      <Card.Root 
        p={8}
        borderRadius="xl"
        borderWidth="1px"
        borderColor="red.200"
        bg="red.50"
        textAlign="center"
      >
        <Text color="red.600" fontWeight="600" mb={2}>
          Erro ao carregar contas
        </Text>
        <Text color="red.500" fontSize="sm">
          {error}
        </Text>
      </Card.Root>
    );
  }

  if (accounts.length === 0) {
    return (
      <Card.Root 
        p={12}
        borderRadius="xl"
        borderWidth="2px"
        borderColor="gray.200"
        borderStyle="dashed"
        bg="gray.50"
        textAlign="center"
      >
        <Text textAlign="center" color="gray.500">
          No accounts found for this item.
        </Text>
      </Card.Root>
    );
  }

  return (
    <Stack gap={3}>
      {accounts.map((account) => (
        <Card.Root 
          key={account.id} 
          p={5}
          borderRadius="lg"
          borderWidth="1px"
          borderColor="gray.200"
          bg="white"
          shadow="sm"
          _hover={{
            shadow: "md",
            borderColor: "gray.300",
          }}
          transition="all 0.2s"
        >
          <Flex justify="space-between" align="start" gap={4}>
            <Box flex={1} minW={0}>
              <Flex gap={2} align="center" mb={2}>
                <Text fontWeight="600" fontSize="md" color="gray.900">
                  {account.name}
                </Text>
                <Badge 
                  colorScheme={account.type === 'CREDIT' ? 'purple' : 'blue'}
                  size="sm"
                  px={2}
                  py={0.5}
                  borderRadius="full"
                  fontWeight="600"
                >
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

            <Box textAlign="right" ml={4} minW="120px">
              <Text 
                fontSize="xl" 
                fontWeight="700"
                color="brand.600"
                mb={1}
              >
                {formatCurrency(account.balance ?? 0, account.currency_code || 'BRL')}
              </Text>

              {account.credit_data?.credit_limit && (
                <Text fontSize="xs" color="gray.500" fontWeight="500">
                  Limit: {formatCurrency(
                    account.credit_data.credit_limit,
                    account.currency_code || 'BRL'
                  )}
                </Text>
              )}

              {account.credit_data?.available_credit_limit !== undefined && (
                <Text fontSize="xs" color="gray.500" fontWeight="500">
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
              borderRadius="lg"
              fontWeight="600"
              _hover={{
                bg: "gray.50",
              }}
            >
              {account.type === 'CREDIT' ? 'View Bills' : 'View Transactions'}
            </Button>
          )}
        </Card.Root>
      ))}
    </Stack>
  );
}