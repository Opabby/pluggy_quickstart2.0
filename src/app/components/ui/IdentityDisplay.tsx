'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  Text,
  Flex,
  Stack,
  Spinner,
  Badge,
  Heading,
} from '@chakra-ui/react';
import { api } from '@/app/lib/utils/api';
import type { IdentityRecord } from '@/app/types/pluggy';

interface IdentityDisplayProps {
  itemId: string;
}

const formatDate = (dateString?: string | null) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatDocument = (document?: string, type?: string) => {
  if (!document) return 'N/A';
  
  const cleaned = document.replace(/[^\d]/g, '');
  
  if (type === 'CPF' && cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  
  if (type === 'CNPJ' && cleaned.length === 14) {
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  
  return document;
};

interface Address {
  city?: string;
  type?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  fullAddress?: string;
  primaryAddress?: string;
}

interface PhoneNumber {
  type?: string;
  value: string;
}

interface Email {
  type?: string;
  value: string;
}

interface Relation {
  name?: string;
  type?: string;
  document?: string | null;
}

export function IdentityDisplay({ itemId }: IdentityDisplayProps) {
  const [identity, setIdentity] = useState<IdentityRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!itemId) {
      setIsLoading(false);
      setIdentity(null);
      return;
    }

    const fetchIdentity = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data } = await api.get('/api/identity', {
          params: { itemId },
        });
        
        setIdentity(data.data);
      } catch (err: unknown) {
        const axiosError = err as { response?: { status?: number } };
  
        if (axiosError.response?.status === 404) {
          setIdentity(null);
        } else {
          console.error('Error fetching identity:', err);
          setError(err instanceof Error ? err.message : 'Failed to load identity');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchIdentity();
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

  if (!identity) {
    return (
      <Card.Root p={8}>
        <Text textAlign="center" color="gray.500">
          No identity information available for this item.
        </Text>
      </Card.Root>
    );
  }

  const addresses = identity.addresses as Address[] | undefined;
  const phoneNumbers = identity.phone_numbers as PhoneNumber[] | undefined;
  const emails = identity.emails as Email[] | undefined;
  const relations = identity.relations as Relation[] | undefined;

  return (
    <Card.Root p={6}>
      <Stack gap={6}>
        {/* Basic Information */}
        <Box>
          <Heading size="md" mb={4} color="brand.600">
            {identity.full_name ? 'Personal Information' : 'Company Information'}
          </Heading>
          
          <Stack gap={3}>
            {identity.full_name && (
              <Flex justify="space-between">
                <Text fontWeight="medium" color="gray.600">Full Name:</Text>
                <Text>{identity.full_name}</Text>
              </Flex>
            )}

            {identity.company_name && (
              <Flex justify="space-between">
                <Text fontWeight="medium" color="gray.600">Company Name:</Text>
                <Text>{identity.company_name}</Text>
              </Flex>
            )}

            {identity.document && (
              <Flex justify="space-between">
                <Text fontWeight="medium" color="gray.600">
                  {identity.document_type || 'Document'}:
                </Text>
                <Text>
                  {formatDocument(identity.document, identity.document_type)}
                </Text>
              </Flex>
            )}

            {identity.tax_number && (
              <Flex justify="space-between">
                <Text fontWeight="medium" color="gray.600">Tax Number:</Text>
                <Text>{identity.tax_number}</Text>
              </Flex>
            )}

            {identity.birth_date && (
              <Flex justify="space-between">
                <Text fontWeight="medium" color="gray.600">Birth Date:</Text>
                <Text>{formatDate(identity.birth_date)}</Text>
              </Flex>
            )}

            {identity.job_title && (
              <Flex justify="space-between">
                <Text fontWeight="medium" color="gray.600">Job Title:</Text>
                <Text>{identity.job_title}</Text>
              </Flex>
            )}
          </Stack>
        </Box>

        {/* Contact Information */}
        {((emails && emails.length > 0) || (phoneNumbers && phoneNumbers.length > 0)) && (
          <Box>
            <Heading size="sm" mb={3} color="brand.600">
              Contact Information
            </Heading>
            
            <Stack gap={2}>
              {emails && emails.map((email, index) => (
                <Flex key={index} justify="space-between">
                  <Text fontWeight="medium" color="gray.600">
                    Email {email.type ? `(${email.type})` : ''}:
                  </Text>
                  <Text>{email.value}</Text>
                </Flex>
              ))}

              {phoneNumbers && phoneNumbers.map((phone, index) => (
                <Flex key={index} justify="space-between">
                  <Text fontWeight="medium" color="gray.600">
                    Phone {phone.type ? `(${phone.type})` : ''}:
                  </Text>
                  <Text>{phone.value}</Text>
                </Flex>
              ))}
            </Stack>
          </Box>
        )}

        {/* Addresses */}
        {addresses && addresses.length > 0 && (
          <Box>
            <Heading size="sm" mb={3} color="brand.600">
              Addresses
            </Heading>
            
            <Stack gap={3}>
              {addresses.map((address, index) => (
                <Box key={index} p={3} bg="gray.50" borderRadius="md">
                  {address.type && (
                    <Badge colorScheme="blue" mb={2}>
                      {address.type}
                    </Badge>
                  )}
                  
                  <Text fontSize="sm">
                    {address.fullAddress || address.primaryAddress || 'No address details'}
                  </Text>
                  
                  {address.city && address.state && (
                    <Text fontSize="xs" color="gray.600" mt={1}>
                      {address.city}, {address.state}
                      {address.postalCode && ` - ${address.postalCode}`}
                    </Text>
                  )}
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        {/* Relations */}
        {relations && relations.length > 0 && (
          <Box>
            <Heading size="sm" mb={3} color="brand.600">
              Relations
            </Heading>
            
            <Stack gap={2}>
              {relations.map((relation, index) => (
                <Flex key={index} justify="space-between" align="center">
                  <Box>
                    <Text fontWeight="medium">{relation.name || 'Unknown'}</Text>
                    {relation.type && (
                      <Badge size="sm" colorScheme="purple" mt={1}>
                        {relation.type}
                      </Badge>
                    )}
                  </Box>
                  {relation.document && (
                    <Text fontSize="sm" color="gray.600">
                      {relation.document}
                    </Text>
                  )}
                </Flex>
              ))}
            </Stack>
          </Box>
        )}
      </Stack>
    </Card.Root>
  );
}