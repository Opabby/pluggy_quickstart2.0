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
} from '@chakra-ui/react';
import { api } from '@/app/lib/utils/api';
import type { CreditCardBillRecord } from '@/types/pluggy';

interface CreditCardBillsListProps {
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

export function CreditCardBillsList({ accountId }: CreditCardBillsListProps) {
  const [bills, setBills] = useState<CreditCardBillRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accountId) {
      setIsLoading(false);
      setBills([]);
      return;
    }

    const fetchBills = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data } = await api.get('/api/bills', {
          params: { accountId, fromDb: 'true' },
        });
        
        setBills(Array.isArray(data.data) ? data.data : []);
      } catch (err) {
        console.error('Error fetching bills:', err);
        setError(err instanceof Error ? err.message : 'Failed to load credit card bills');
        setBills([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBills();
  }, [accountId]);

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

  if (bills.length === 0) {
    return (
      <Card.Root p={8}>
        <Text textAlign="center" color="gray.500">
          No credit card bills found for this account.
        </Text>
      </Card.Root>
    );
  }

  return (
    <Stack gap={4}>
      {bills.map((bill) => (
        <Card.Root key={bill.bill_id} p={4}>
          <Flex justify="space-between" align="start">
            <Box flex={1}>
              <Text fontWeight="bold" fontSize="lg" mb={2}>
                Bill - {bill.due_date ? formatDate(bill.due_date) : 'No due date'}
              </Text>
              
              <Stack gap={2}>
                {bill.minimum_payment_amount !== undefined && bill.minimum_payment_amount !== null && (
                  <Flex justify="space-between">
                    <Text fontSize="sm" color="gray.600">Minimum Payment:</Text>
                    <Text fontSize="sm" fontWeight="medium">
                      {formatCurrency(
                        bill.minimum_payment_amount,
                        bill.total_amount_currency_code || 'BRL'
                      )}
                    </Text>
                  </Flex>
                )}

                {bill.allows_installments !== undefined && (
                  <Flex justify="space-between" align="center">
                    <Text fontSize="sm" color="gray.600">Allows Installments:</Text>
                    <Badge colorScheme={bill.allows_installments ? 'green' : 'gray'} size="sm">
                      {bill.allows_installments ? 'Yes' : 'No'}
                    </Badge>
                  </Flex>
                )}
              </Stack>
            </Box>

            <Box textAlign="right" ml={4}>
              <Text fontSize="2xl" fontWeight="bold" color="purple.600">
                {formatCurrency(
                  bill.total_amount ?? 0,
                  bill.total_amount_currency_code || 'BRL'
                )}
              </Text>
              <Text fontSize="xs" color="gray.500" mt={1}>
                Total Amount
              </Text>
            </Box>
          </Flex>
        </Card.Root>
      ))}
    </Stack>
  );
}