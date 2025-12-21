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
import { InvestmentTransactionsList } from '@/app/components/ui/InvestmentTransactionsList';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import { api } from '@/app/lib/utils/api';
import type { InvestmentRecord } from '@/app/types/pluggy';

export default function InvestmentDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const itemId = params?.itemId as string;
  const investmentId = params?.investmentId as string;
  const [investment, setInvestment] = useState<InvestmentRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (itemId && investmentId) {
      fetchInvestment();
    }
  }, [itemId, investmentId]);

  const fetchInvestment = async () => {
    try {
      // Fetch investments for the specific item
      const { data: investmentsData } = await api.get('/api/investments', {
        params: { itemId },
      });
      const investments = Array.isArray(investmentsData.data?.results) ? investmentsData.data.results : [];
      const foundInvestment = investments.find((inv: InvestmentRecord) => inv.investment_id === investmentId);
      if (foundInvestment) {
        setInvestment(foundInvestment);
      }
    } catch (error) {
      console.error('Error fetching investment:', error);
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

  if (!investmentId || !investment || !itemId) {
    return (
      <Box minH="100vh" bg="gray.50" py={8}>
        <Container maxW="container.xl">
          <Heading>Investment not found</Heading>
          <Button onClick={() => router.push(`/item/${itemId}/investments`)} variant="ghost" mt={4}>
            Back to Investments
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
              {investment.name || 'Investment'} - Transactions
            </Heading>
            <Button onClick={() => router.push(`/item/${itemId}/investments`)} variant="ghost">
              Back to Investments
            </Button>
          </Flex>

          {/* Investment Transactions */}
          <ErrorBoundary>
            <InvestmentTransactionsList investmentId={investment.investment_id} />
          </ErrorBoundary>
        </Stack>
      </Container>
    </Box>
  );
}
