'use client';

import { useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Stack,
  Flex,
  Button,
  Tabs,
} from '@chakra-ui/react';
import { ConnectButton } from '@/app/components/ui/ConnectButton';
import { ItemsList } from '@/app/components/ui/ItemsList';
import { AccountsList } from '@/app/components/ui/AccountsList';
import { IdentityDisplay } from '@/app/components/ui/IdentityDisplay';
import { TransactionsList } from '@/app/components/ui/TransactionsList';
import { CreditCardBillsList } from '@/app/components/ui/CreditCardBillsList';
import { InvestmentsList } from '@/app/components/ui/InvestmentsList';
import { InvestmentTransactionsList } from '@/app/components/ui/InvestmentTransactionsList';
import { LoansList } from '@/app/components/ui/LoansList';
import { LoanDetails } from '@/app/components/ui/LoanDetails';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import type { AccountRecord, InvestmentRecord, LoanRecord, PluggyItemRecord } from '@/app/types/pluggy';

export default function HomePage() {
  const [selectedItem, setSelectedItem] = useState<PluggyItemRecord | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<AccountRecord | null>(null);
  const [selectedInvestment, setSelectedInvestment] = useState<InvestmentRecord | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<LoanRecord | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSuccess = () => {
    console.log('New item connected');
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleError = (message: string) => {
    console.error('Connection error:', message);
  };

  const handleItemSelect = (item: PluggyItemRecord) => {
    console.log('Selecting item:', item);
    try {
      if (item && item.item_id) {
        setSelectedItem(item);
        setSelectedAccount(null);
        setSelectedInvestment(null);
        setSelectedLoan(null);
      } else {
        console.error('Invalid item selected:', item);
      }
    } catch (error) {
      console.error('Error in handleItemSelect:', error);
    }
  };

  const handleAccountSelect = (account: AccountRecord) => {
    try {
      console.log('Account selected:', account);
      const normalizedAccount = {
        ...account,
        account_id: account.account_id || (account as any).id
      };
      console.log('Normalized account:', normalizedAccount);
      
      if (normalizedAccount && normalizedAccount.account_id) {
        setSelectedAccount(normalizedAccount);
      } else {
        console.error('Invalid account selected - missing account_id:', account);
      }
    } catch (error) {
      console.error('Error selecting account:', error);
    }
  };

  const handleInvestmentSelect = (investment: InvestmentRecord) => {
    try {
      console.log('Investment selected:', investment);
      const normalizedInvestment = {
        ...investment,
        investment_id: investment.investment_id || (investment as any).id
      };
      console.log('Normalized investment:', normalizedInvestment);
      
      if (normalizedInvestment && normalizedInvestment.investment_id) {
        setSelectedInvestment(normalizedInvestment);
        setSelectedAccount(null);
      } else {
        console.error('Invalid investment selected - missing investment_id:', investment);
      }
    } catch (error) {
      console.error('Error selecting investment:', error);
    }
  };

  const handleLoanSelect = (loan: LoanRecord) => {
    try {
      console.log('Loan selected:', loan);
      const normalizedLoan = {
        ...loan,
        loan_id: loan.loan_id || (loan as any).id
      };
      console.log('Normalized loan:', normalizedLoan);
      
      if (normalizedLoan && normalizedLoan.loan_id) {
        setSelectedLoan(normalizedLoan);
        setSelectedAccount(null);
        setSelectedInvestment(null);
      } else {
        console.error('Invalid loan selected - missing loan_id:', loan);
      }
    } catch (error) {
      console.error('Error selecting loan:', error);
    }
  };

  const handleBackToItems = () => {
    setSelectedItem(null);
    setSelectedAccount(null);
    setSelectedInvestment(null);
    setSelectedLoan(null);
  };

  const handleBackToAccounts = () => {
    setSelectedAccount(null);
  };

  const handleBackToInvestments = () => {
    setSelectedInvestment(null);
  };

  const handleBackToLoans = () => {
    setSelectedLoan(null);
  };

  return (
    <Box minH="100vh" bg="gray.50" py={8}>
      <Container maxW="container.xl">
        <Stack gap={8}>
          {/* Header */}
          <Flex justify="space-between" align="center">
            <Box>
              <Heading size="2xl" mb={2}>
                Pluggy Financial Dashboard
              </Heading>
              <Text color="gray.600">
                Connect and manage your financial accounts
              </Text>
            </Box>
            
            <ConnectButton
              onSuccess={handleSuccess}
              onError={handleError}
            />
          </Flex>

          {/* Main Content - Items List */}
          {!selectedItem && !selectedAccount && !selectedInvestment && !selectedLoan && (
            <Box>
              <ItemsList
                onItemSelect={handleItemSelect}
                refreshTrigger={refreshTrigger}
              />
            </Box>
          )}

          {/* Item Details View */}
          {selectedItem && !selectedAccount && !selectedInvestment && !selectedLoan && (
            <Box>
              <Flex justify="space-between" align="center" mb={4}>
                <Heading size="lg">
                  {selectedItem.connector_name || 'Item Details'}
                </Heading>
                <Button onClick={handleBackToItems} variant="ghost">
                  Back to Items
                </Button>
              </Flex>

              {selectedItem.item_id ? (
                <ErrorBoundary>
                  <Tabs.Root defaultValue="accounts">
                    <Tabs.List>
                      <Tabs.Trigger value="accounts">Accounts</Tabs.Trigger>
                      <Tabs.Trigger value="investments">Investments</Tabs.Trigger>
                      <Tabs.Trigger value="loans">Loans</Tabs.Trigger>
                      <Tabs.Trigger value="identity">Identity</Tabs.Trigger>
                    </Tabs.List>

                    <Tabs.Content value="accounts" pt={4}>
                      <ErrorBoundary>
                        <AccountsList
                          itemId={selectedItem.item_id}
                          onAccountSelect={handleAccountSelect}
                        />
                      </ErrorBoundary>
                    </Tabs.Content>

                    <Tabs.Content value="investments" pt={4}>
                      <ErrorBoundary>
                        <InvestmentsList
                          itemId={selectedItem.item_id}
                          onInvestmentSelect={handleInvestmentSelect}
                        />
                      </ErrorBoundary>
                    </Tabs.Content>

                    <Tabs.Content value="loans" pt={4}>
                      <ErrorBoundary>
                        <LoansList
                          itemId={selectedItem.item_id}
                          onLoanSelect={handleLoanSelect}
                        />
                      </ErrorBoundary>
                    </Tabs.Content>

                    <Tabs.Content value="identity" pt={4}>
                      <ErrorBoundary>
                        <IdentityDisplay itemId={selectedItem.item_id} />
                      </ErrorBoundary>
                    </Tabs.Content>
                  </Tabs.Root>
                </ErrorBoundary>
              ) : (
                <Box p={4} bg="red.50" borderRadius="md">
                  <Text color="red.500" fontWeight="bold">
                    Error: Item ID is missing
                  </Text>
                  <Text color="red.400" fontSize="sm" mt={2}>
                    Selected item: {JSON.stringify(selectedItem, null, 2)}
                  </Text>
                </Box>
              )}
            </Box>
          )}

          {/* Account Details View - Transactions or Bills */}
          {selectedAccount && (
            <Box>
              <Flex justify="space-between" align="center" mb={4}>
                <Heading size="lg">
                  {selectedAccount.name || 'Account'} - {selectedAccount.type === 'CREDIT' ? 'Bills' : 'Transactions'}
                </Heading>
                <Button onClick={handleBackToAccounts} variant="ghost">
                  Back to Accounts
                </Button>
              </Flex>

              {selectedAccount.account_id ? (
                <ErrorBoundary>
                  {selectedAccount.type === 'CREDIT' ? (
                    <CreditCardBillsList accountId={selectedAccount.account_id} />
                  ) : (
                    <TransactionsList accountId={selectedAccount.account_id} />
                  )}
                </ErrorBoundary>
              ) : (
                <Box p={4} bg="red.50" borderRadius="md">
                  <Text color="red.500" fontWeight="bold">
                    Error: Account ID is missing
                  </Text>
                  <Text color="red.400" fontSize="sm" mt={2}>
                    Selected account: {JSON.stringify(selectedAccount, null, 2)}
                  </Text>
                </Box>
              )}
            </Box>
          )}

          {/* Investment Details View - Transactions */}
          {selectedInvestment && (
            <Box>
              <Flex justify="space-between" align="center" mb={4}>
                <Heading size="lg">
                  {selectedInvestment.name || 'Investment'} - Transactions
                </Heading>
                <Button onClick={handleBackToInvestments} variant="ghost">
                  Back to Investments
                </Button>
              </Flex>

              {selectedInvestment.investment_id ? (
                <ErrorBoundary>
                  <InvestmentTransactionsList investmentId={selectedInvestment.investment_id} />
                </ErrorBoundary>
              ) : (
                <Box p={4} bg="red.50" borderRadius="md">
                  <Text color="red.500" fontWeight="bold">
                    Error: Investment ID is missing
                  </Text>
                  <Text color="red.400" fontSize="sm" mt={2}>
                    Selected investment: {JSON.stringify(selectedInvestment, null, 2)}
                  </Text>
                </Box>
              )}
            </Box>
          )}

          {/* Loan Details View */}
          {selectedLoan && (
            <Box>
              <Flex justify="space-between" align="center" mb={4}>
                <Heading size="lg">
                  {selectedLoan.product_name || 'Loan'} - Details
                </Heading>
                <Button onClick={handleBackToLoans} variant="ghost">
                  Back to Loans
                </Button>
              </Flex>

              {selectedLoan.loan_id ? (
                <ErrorBoundary>
                  <LoanDetails loan={selectedLoan} />
                </ErrorBoundary>
              ) : (
                <Box p={4} bg="red.50" borderRadius="md">
                  <Text color="red.500" fontWeight="bold">
                    Error: Loan ID is missing
                  </Text>
                  <Text color="red.400" fontSize="sm" mt={2}>
                    Selected loan: {JSON.stringify(selectedLoan, null, 2)}
                  </Text>
                </Box>
              )}
            </Box>
          )}
        </Stack>
      </Container>
    </Box>
  );
}