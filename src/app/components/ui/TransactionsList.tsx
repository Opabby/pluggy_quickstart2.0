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
import type { TransactionRecord } from '@/app/types/pluggy';

interface TransactionsListProps {
  accountId: string;
}

const formatCurrency = (amount: number, currency: string = 'BRL') => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export function TransactionsList({ accountId }: TransactionsListProps) {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!accountId) {
      setIsLoading(false);
      setTransactions([]);
      return;
    }

    const fetchTransactions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data } = await api.get('/api/transactions', {
          params: { accountId, limit, offset },
        });
        
        // Data comes directly as array from database
        setTransactions(Array.isArray(data.data) ? data.data : []);
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load transactions');
        setTransactions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [accountId, limit, offset]);

  const loadMore = () => {
    setOffset((prev) => prev + limit);
  };

  const loadPrevious = () => {
    setOffset((prev) => Math.max(0, prev - limit));
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
      </Card.Root>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card.Root p={8}>
        <Text textAlign="center" color="gray.500">
          No transactions found for this account.
        </Text>
      </Card.Root>
    );
  }

  return (
    <Box>
      <Stack gap={3}>
        {transactions.map((transaction) => (
          <Card.Root key={transaction.transaction_id} p={4}>
            <Flex justify="space-between" align="start">
              <Box flex={1}>
                <Text fontWeight="medium" mb={1}>
                  {transaction.description || 'No description'}
                </Text>
                
                {transaction.description_raw && transaction.description_raw !== transaction.description && (
                  <Text fontSize="xs" color="gray.500" mb={2}>
                    {transaction.description_raw}
                  </Text>
                )}
                
                <Flex gap={2} align="center" flexWrap="wrap">
                  <Text fontSize="sm" color="gray.600">
                    {formatDate(transaction.date)}
                  </Text>
                  
                  {transaction.category && (
                    <Badge size="sm" colorScheme="blue">
                      {transaction.category}
                    </Badge>
                  )}
                  
                  {transaction.status && (
                    <Badge 
                      size="sm" 
                      colorScheme={transaction.status === 'POSTED' ? 'green' : 'orange'}
                    >
                      {transaction.status}
                    </Badge>
                  )}
                </Flex>
              </Box>

              <Box textAlign="right" ml={4}>
                <Text 
                  fontSize="lg" 
                  fontWeight="bold"
                  color={transaction.amount < 0 ? 'red.600' : 'green.600'}
                >
                  {formatCurrency(transaction.amount, transaction.currency_code || 'BRL')}
                </Text>
                
                {transaction.balance !== undefined && transaction.balance !== null && (
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    Balance: {formatCurrency(transaction.balance, transaction.currency_code || 'BRL')}
                  </Text>
                )}
              </Box>
            </Flex>
          </Card.Root>
        ))}
      </Stack>

      <Flex justify="space-between" align="center" mt={4}>
        <Button 
          onClick={loadPrevious} 
          size="sm" 
          variant="outline"
        >
          Previous
        </Button>

        <Text fontSize="sm" color="gray.600">
          Showing {transactions.length} transactions
        </Text>

        <Button 
          onClick={loadMore} 
          size="sm" 
          variant="outline"
        >
          Next
        </Button>
      </Flex>
    </Box>
  );
}