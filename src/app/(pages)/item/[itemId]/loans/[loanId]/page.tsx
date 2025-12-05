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
import { LoanDetails } from '@/app/components/ui/LoanDetails';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import { api } from '@/app/lib/utils/api';
import type { LoanRecord } from '@/app/types/pluggy';

export default function LoanDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const itemId = params?.itemId as string;
  const loanId = params?.loanId as string;
  const [loan, setLoan] = useState<LoanRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (itemId && loanId) {
      fetchLoan();
    }
  }, [itemId, loanId]);

  const fetchLoan = async () => {
    try {
      // Fetch loans for the specific item
      const { data: loansData } = await api.get('/api/loans', {
        params: { itemId },
      });
      const loans = Array.isArray(loansData.data) ? loansData.data : [];
      const foundLoan = loans.find((l: LoanRecord) => l.loan_id === loanId);
      if (foundLoan) {
        setLoan(foundLoan);
      }
    } catch (error) {
      console.error('Error fetching loan:', error);
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

  if (!loanId || !loan || !itemId) {
    return (
      <Box minH="100vh" bg="gray.50" py={8}>
        <Container maxW="container.xl">
          <Heading>Loan not found</Heading>
          <Button onClick={() => router.push(`/item/${itemId}/loans`)} variant="ghost" mt={4}>
            Back to Loans
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
              {loan.product_name || 'Loan'} - Details
            </Heading>
            <Button onClick={() => router.push(`/item/${itemId}/loans`)} variant="ghost">
              Back to Loans
            </Button>
          </Flex>

          {/* Loan Details */}
          <ErrorBoundary>
            <LoanDetails loan={loan} />
          </ErrorBoundary>
        </Stack>
      </Container>
    </Box>
  );
}
