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
import type { LoanRecord } from '@/app/types/pluggy';

interface LoansListProps {
  itemId: string;
  onLoanSelect?: (loan: LoanRecord) => void;
}

const formatCurrency = (amount: number, currency: string = 'BRL') => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(amount);
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const getLoanTypeLabel = (type?: string) => {
  if (!type) return 'Loan';
  return type.replace(/_/g, ' ');
};

const formatLoanSubtype = (subtype?: string) => {
  if (!subtype) return '';
  return subtype.replace(/_/g, ' ');
};

export function LoansList({ itemId, onLoanSelect }: LoansListProps) {
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!itemId) {
      setIsLoading(false);
      setLoans([]);
      return;
    }

    const fetchLoans = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data } = await api.get('/api/loans', {
          params: { itemId },
        });
        
        setLoans(Array.isArray(data.data?.results) ? data.data.results : []);
      } catch (err) {
        console.error('Error fetching loans:', err);
        setError(err instanceof Error ? err.message : 'Failed to load loans');
        setLoans([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLoans();
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

  if (loans.length === 0) {
    return (
      <Card.Root p={8}>
        <Text textAlign="center" color="gray.500">
          No loans found for this item.
        </Text>
      </Card.Root>
    );
  }

  return (
    <Stack gap={4}>
      {loans.map((loan) => (
        <Card.Root key={loan.loan_id} p={4}>
          <Flex justify="space-between" align="start">
            <Box flex={1}>
              <Flex gap={2} align="center" mb={2} flexWrap="wrap">
                <Text fontWeight="bold" fontSize="lg">
                  {loan.product_name || 'Loan'}
                </Text>
                {loan.type && (
                  <Badge colorScheme="orange">
                    {loan.subtype 
                      ? formatLoanSubtype(loan.subtype)
                      : getLoanTypeLabel(loan.type)}
                  </Badge>
                )}
              </Flex>

              <Stack gap={1}>
                {loan.contract_number && (
                  <Text fontSize="sm" color="gray.600">
                    Contract: {loan.contract_number}
                  </Text>
                )}

                {loan.date && (
                  <Text fontSize="sm" color="gray.600">
                    Date: {formatDate(loan.date)}
                  </Text>
                )}

                {loan.due_date && (
                  <Text fontSize="sm" color="gray.600">
                    Due Date: {formatDate(loan.due_date)}
                  </Text>
                )}

                {loan.installments_quantity && (
                  <Text fontSize="xs" color="gray.500">
                    Installments: {loan.installments_quantity}
                  </Text>
                )}

                {loan.interest_rate !== undefined && loan.interest_rate !== null && (
                  <Text fontSize="xs" color="gray.500">
                    Interest Rate: {(loan.interest_rate * 100).toFixed(2)}%
                  </Text>
                )}
              </Stack>
            </Box>

            <Box textAlign="right" ml={4}>
              <Text fontSize="xl" fontWeight="bold" color="orange.600" mb={1}>
                {formatCurrency(
                  loan.contracted_amount ?? 0,
                  loan.currency_code || 'BRL'
                )}
              </Text>

              {loan.current_debt_amount !== undefined && loan.current_debt_amount !== null && (
                <Text fontSize="sm" color="gray.600">
                  Current Debt: {formatCurrency(
                    loan.current_debt_amount,
                    loan.currency_code || 'BRL'
                  )}
                </Text>
              )}

              {loan.outstanding_balance !== undefined && loan.outstanding_balance !== null && (
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Outstanding: {formatCurrency(
                    loan.outstanding_balance,
                    loan.currency_code || 'BRL'
                  )}
                </Text>
              )}
            </Box>
          </Flex>

          {onLoanSelect && (
            <Button
              size="sm"
              variant="outline"
              mt={4}
              onClick={() => onLoanSelect(loan)}
            >
              View Details
            </Button>
          )}
        </Card.Root>
      ))}
    </Stack>
  );
}