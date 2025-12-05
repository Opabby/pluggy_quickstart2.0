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
import type { InvestmentRecord } from '@/app/types/pluggy';

interface InvestmentsListProps {
  itemId: string;
  onInvestmentSelect?: (investment: InvestmentRecord) => void;
}

const formatCurrency = (amount: number, currency: string = 'BRL') => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(amount);
};

const formatPercentage = (value?: number | null) => {
  if (value === undefined || value === null) return 'N/A';
  return `${(value * 100).toFixed(2)}%`;
};

const getInvestmentTypeLabel = (type?: string) => {
  if (!type) return 'Investment';
  return type.replace(/_/g, ' ');
};

const formatInvestmentSubtype = (subtype?: string) => {
  if (!subtype) return '';
  return subtype.replace(/_/g, ' ');
};

export function InvestmentsList({ itemId, onInvestmentSelect }: InvestmentsListProps) {
  const [investments, setInvestments] = useState<InvestmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!itemId) {
      setIsLoading(false);
      setInvestments([]);
      return;
    }

    const fetchInvestments = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data } = await api.get('/api/investments', {
          params: { itemId },
        });
        
        // Data comes directly as array from database
        setInvestments(Array.isArray(data.data) ? data.data : []);
      } catch (err) {
        console.error('Error fetching investments:', err);
        setError(err instanceof Error ? err.message : 'Failed to load investments');
        setInvestments([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvestments();
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

  if (investments.length === 0) {
    return (
      <Card.Root p={8}>
        <Text textAlign="center" color="gray.500">
          No investments found for this item.
        </Text>
      </Card.Root>
    );
  }

  return (
    <Stack gap={4}>
      {investments.map((investment) => (
        <Card.Root key={investment.investment_id} p={4}>
          <Flex justify="space-between" align="start">
            <Box flex={1}>
              <Flex gap={2} align="center" mb={2} flexWrap="wrap">
                <Text fontWeight="bold" fontSize="lg">
                  {investment.name}
                </Text>
                {investment.type && (
                  <Badge colorScheme="purple">
                    {investment.subtype 
                      ? formatInvestmentSubtype(investment.subtype)
                      : getInvestmentTypeLabel(investment.type)}
                  </Badge>
                )}
              </Flex>

              <Stack gap={1}>
                {investment.code && (
                  <Text fontSize="sm" color="gray.600">
                    Code: {investment.code}
                  </Text>
                )}

                {investment.owner && (
                  <Text fontSize="xs" color="gray.500">
                    Owner: {investment.owner}
                  </Text>
                )}

                {investment.annual_rate !== undefined && investment.annual_rate !== null && (
                  <Text fontSize="sm" color="gray.600">
                    Annual Rate: {formatPercentage(investment.annual_rate)}
                  </Text>
                )}

                {investment.quantity !== undefined && investment.quantity !== null && (
                  <Text fontSize="xs" color="gray.500">
                    Quantity: {investment.quantity}
                  </Text>
                )}
              </Stack>
            </Box>

            <Box textAlign="right" ml={4}>
              <Text fontSize="2xl" fontWeight="bold" color="brand.600">
                {formatCurrency(
                  investment.amount ?? investment.value ?? 0,
                  investment.currency_code || 'BRL'
                )}
              </Text>

              {investment.value && investment.amount && investment.value !== investment.amount && (
                <Text fontSize="sm" color="gray.600" mt={1}>
                  Value: {formatCurrency(investment.value, investment.currency_code || 'BRL')}
                </Text>
              )}
            </Box>
          </Flex>

          {onInvestmentSelect && (
            <Button
              size="sm"
              variant="outline"
              mt={4}
              onClick={() => onInvestmentSelect(investment)}
            >
              View Transactions
            </Button>
          )}
        </Card.Root>
      ))}
    </Stack>
  );
}