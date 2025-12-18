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
  const [totalPages, setTotalPages] = useState(1); // 🆕 Track total pages

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
            page,
            pageSize,
          },
        });
        
        const responseData = data.data;
        setTransactions(responseData.results || []);
        setTotalPages(responseData.totalPages || 1);
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

  const loadNext = () => {
    if (page < totalPages) {
      setPage((prev) => prev + 1);
    }
  };

  const loadPrevious = () => {
    if (page > 1) {
      setPage((prev) => prev - 1);
    }
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
          No transactions found for this investment.
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
                  {transaction.description || 'Investment Transaction'}
                </Text>
                
                <Flex gap={2} align="center" flexWrap="wrap" mb={2}>
                  <Text fontSize="sm" color="gray.600">
                    Trade: {formatDate(transaction.trade_date)}
                  </Text>
                  
                  {transaction.date && transaction.date !== transaction.trade_date && (
                    <Text fontSize="sm" color="gray.600">
                      Settlement: {formatDate(transaction.date)}
                    </Text>
                  )}
                </Flex>

                <Flex gap={2} align="center" flexWrap="wrap">
                  {transaction.type && (
                    <Badge 
                      size="sm" 
                      colorScheme={
                        transaction.type === 'BUY' ? 'blue' : 
                        transaction.type === 'SELL' ? 'orange' : 
                        transaction.type === 'DIVIDEND' ? 'green' : 
                        'gray'
                      }
                    >
                      {transaction.type}
                    </Badge>
                  )}
                  
                  {transaction.quantity && (
                    <Text fontSize="xs" color="gray.500">
                      Qty: {transaction.quantity}
                    </Text>
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
                
                {transaction.value !== undefined && transaction.value !== null && (
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    Unit: {formatCurrency(transaction.value, transaction.currency_code || 'BRL')}
                  </Text>
                )}

                {transaction.net_amount !== undefined && transaction.net_amount !== null && (
                  <Text fontSize="xs" color="gray.500">
                    Net: {formatCurrency(transaction.net_amount, transaction.currency_code || 'BRL')}
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
          disabled={page === 1}
        >
          Previous
        </Button>

        <Text fontSize="sm" color="gray.600">
          Page {page} of {totalPages} ({transactions.length} transactions)
        </Text>

        <Button 
          onClick={loadNext} 
          size="sm" 
          variant="outline"
          disabled={page >= totalPages}
        >
          Next
        </Button>
      </Flex>
    </Box>
  );
}