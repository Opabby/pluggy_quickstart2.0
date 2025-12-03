'use client';

import {
  Box,
  Card,
  Text,
  Flex,
  Badge,
  Stack,
  Heading,
} from '@chakra-ui/react';
import type { LoanRecord } from '@/app/types/pluggy';

interface LoanDetailsProps {
  loan: LoanRecord;
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

export function LoanDetails({ loan }: LoanDetailsProps) {
  return (
    <Card.Root p={6}>
      <Stack gap={6}>
        {/* Header */}
        <Box>
          <Flex justify="space-between" align="start" mb={4}>
            <Box>
              <Heading size="lg" mb={2}>
                {loan.product_name || 'Loan Details'}
              </Heading>
              {loan.type && (
                <Badge colorScheme="orange" size="lg">
                  {loan.subtype 
                    ? loan.subtype.replace(/_/g, ' ')
                    : getLoanTypeLabel(loan.type)}
                </Badge>
              )}
            </Box>
          </Flex>
        </Box>

        {/* Basic Information */}
        <Box>
          <Heading size="md" mb={3} color="brand.600">
            Loan Information
          </Heading>
          
          <Stack gap={3}>
            {loan.contract_number && (
              <Flex justify="space-between">
                <Text fontWeight="medium" color="gray.600">Contract Number:</Text>
                <Text>{loan.contract_number}</Text>
              </Flex>
            )}

            {loan.contracted_amount !== undefined && loan.contracted_amount !== null && (
              <Flex justify="space-between">
                <Text fontWeight="medium" color="gray.600">Contracted Amount:</Text>
                <Text fontWeight="bold">
                  {formatCurrency(loan.contracted_amount, loan.currency_code || 'BRL')}
                </Text>
              </Flex>
            )}

            {loan.current_debt_amount !== undefined && loan.current_debt_amount !== null && (
              <Flex justify="space-between">
                <Text fontWeight="medium" color="gray.600">Current Debt:</Text>
                <Text fontWeight="bold" color="orange.600">
                  {formatCurrency(loan.current_debt_amount, loan.currency_code || 'BRL')}
                </Text>
              </Flex>
            )}

            {loan.outstanding_balance !== undefined && loan.outstanding_balance !== null && (
              <Flex justify="space-between">
                <Text fontWeight="medium" color="gray.600">Outstanding Balance:</Text>
                <Text fontWeight="bold">
                  {formatCurrency(loan.outstanding_balance, loan.currency_code || 'BRL')}
                </Text>
              </Flex>
            )}

            {loan.date && (
              <Flex justify="space-between">
                <Text fontWeight="medium" color="gray.600">Loan Date:</Text>
                <Text>{formatDate(loan.date)}</Text>
              </Flex>
            )}

            {loan.due_date && (
              <Flex justify="space-between">
                <Text fontWeight="medium" color="gray.600">Due Date:</Text>
                <Text>{formatDate(loan.due_date)}</Text>
              </Flex>
            )}
          </Stack>
        </Box>

        {/* Installments */}
        {loan.installments_quantity && (
          <Box>
            <Heading size="md" mb={3} color="brand.600">
              Installments
            </Heading>
            
            <Stack gap={3}>
              <Flex justify="space-between">
                <Text fontWeight="medium" color="gray.600">Total Installments:</Text>
                <Text>{loan.installments_quantity}</Text>
              </Flex>

              {loan.installments_value && (
                <Flex justify="space-between">
                  <Text fontWeight="medium" color="gray.600">Installment Value:</Text>
                  <Text fontWeight="bold">
                    {formatCurrency(loan.installments_value, loan.currency_code || 'BRL')}
                  </Text>
                </Flex>
              )}

              {loan.payment_date && (
                <Flex justify="space-between">
                  <Text fontWeight="medium" color="gray.600">Payment Date:</Text>
                  <Text>{formatDate(loan.payment_date)}</Text>
                </Flex>
              )}
            </Stack>
          </Box>
        )}

        {/* Interest */}
        {(loan.interest_rate !== undefined || loan.interest_amount !== undefined) && (
          <Box>
            <Heading size="md" mb={3} color="brand.600">
              Interest Information
            </Heading>
            
            <Stack gap={3}>
              {loan.interest_rate !== undefined && loan.interest_rate !== null && (
                <Flex justify="space-between">
                  <Text fontWeight="medium" color="gray.600">Interest Rate:</Text>
                  <Text>{(loan.interest_rate * 100).toFixed(2)}%</Text>
                </Flex>
              )}

              {loan.interest_rate_type && (
                <Flex justify="space-between">
                  <Text fontWeight="medium" color="gray.600">Rate Type:</Text>
                  <Badge colorScheme="blue">{loan.interest_rate_type}</Badge>
                </Flex>
              )}

              {loan.interest_amount !== undefined && loan.interest_amount !== null && (
                <Flex justify="space-between">
                  <Text fontWeight="medium" color="gray.600">Interest Amount:</Text>
                  <Text>
                    {formatCurrency(loan.interest_amount, loan.currency_code || 'BRL')}
                  </Text>
                </Flex>
              )}
            </Stack>
          </Box>
        )}

        {/* Additional Details */}
        {(loan.borrower || loan.guarantor) && (
          <Box>
            <Heading size="md" mb={3} color="brand.600">
              Parties
            </Heading>
            
            <Stack gap={3}>
              {loan.borrower && (
                <Flex justify="space-between">
                  <Text fontWeight="medium" color="gray.600">Borrower:</Text>
                  <Text>{loan.borrower}</Text>
                </Flex>
              )}

              {loan.guarantor && (
                <Flex justify="space-between">
                  <Text fontWeight="medium" color="gray.600">Guarantor:</Text>
                  <Text>{loan.guarantor}</Text>
                </Flex>
              )}
            </Stack>
          </Box>
        )}
      </Stack>
    </Card.Root>
  );
}