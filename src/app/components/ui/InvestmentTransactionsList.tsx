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
import type { InvestmentTransactionRecord } from '@/app/types/pluggy';

interface InvestmentTransactionsListProps {
  investmentId: string;
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

export function InvestmentTransactionsList({ investmentId }: InvestmentTransactionsListProps) {
  const [transactions, setTransactions] = useState<InvestmentTransactionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  useEffect(() => {
    if (!investmentId) {
      setIsLoading(false);
      setTransactions([]);
      return;
    }

    const fetchTransactions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data } = await api.get('/api/investment-transactions', {
          params: { 
            investmentId, 
            limit: pageSize,
            offset: (page - 1) * pageSize,
          },
        });
        
        // Handle response format with results wrapper
        const transactionsData = data.data?.results || (Array.isArray(data.data) ? data.data : []);
        setTransactions(transactionsData);
      } catch (err) {
        console.error('Error fetching investment transactions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load transactions');
        setTransactions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [investmentId, page, pageSize]);

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
          No transactions found for this investment.
        </Text>
      </Card.Root>
    );
  }

  return (
    <Box>
      <Stack gap={3}>
        {transactions.map((transaction) => (
          <Card.Root key={transaction.id} p={4}>
            <Flex justify="space-between" align="start">
              <Box flex={1}>
                <Flex gap={2} align="center" mb={1}>
                  <Text fontWeight="medium">
                    {transaction.type || 'Transaction'}
                  </Text>
                  {transaction.type && (
                    <Badge size="sm" colorScheme="purple">
                      {transaction.type}
                    </Badge>
                  )}
                </Flex>
                
                <Text fontSize="sm" color="gray.600">
                  {formatDate(transaction.date)}
                </Text>

                {transaction.quantity && (
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    Quantity: {transaction.quantity}
                  </Text>
                )}
              </Box>

              <Box textAlign="right" ml={4}>
                <Text 
                  fontSize="lg" 
                  fontWeight="bold"
                  color={transaction.type === 'SELL' ? 'red.600' : 'green.600'}
                >
                  {transaction.type === 'SELL' ? '+' : '-'}
                  {formatCurrency(
                    Math.abs(transaction.amount ?? 0),
                    transaction.currency_code || 'BRL'
                  )}
                </Text>

                {transaction.value && (
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    Unit Value: {formatCurrency(
                      transaction.value,
                      transaction.currency_code || 'BRL'
                    )}
                  </Text>
                )}
              </Box>
            </Flex>
          </Card.Root>
        ))}
      </Stack>

      <Flex justify="space-between" align="center" mt={4}>
        <Button 
          onClick={() => setPage(p => Math.max(1, p - 1))} 
          size="sm" 
          variant="outline"
          disabled={page === 1}
        >
          Previous
        </Button>

        <Text fontSize="sm" color="gray.600">
          Page {page}
        </Text>

        <Button 
          onClick={() => setPage(p => p + 1)} 
          size="sm" 
          variant="outline"
          disabled={transactions.length < pageSize}
        >
          Next
        </Button>
      </Flex>
    </Box>
  );
}