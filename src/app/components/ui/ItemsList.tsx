"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Card,
  Text,
  Flex,
  Badge,
  Stack,
  Spinner,
  Heading,
  Button,
  Image,
} from "@chakra-ui/react";
import { api } from "@/app/lib/utils/api";
import { DeleteItemButton } from "./DeleteItemButton";
import type { PluggyItemRecord } from "@/app/types/pluggy";

interface PaginationInfo {
  page: number;
  pageSize: number;
  totalPages: number;
  totalRecords: number;
}

interface ItemsListProps {
  userId?: string;
  onItemSelect?: (item: PluggyItemRecord) => void;
  refreshTrigger?: number;
}

export function ItemsList({
  userId,
  onItemSelect,
  refreshTrigger,
}: ItemsListProps) {
  const [items, setItems] = useState<PluggyItemRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 10,
    totalPages: 1,
    totalRecords: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data } = await api.get("/api/items", {
        params: { userId },
      });

      setItems(Array.isArray(data.data?.results) ? data.data.results : []);
    } catch (err) {
      console.error("Error fetching items:", err);
      setError(err instanceof Error ? err.message : "Failed to load items");
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems, refreshTrigger]);

  const handleDeleteSuccess = () => {
    fetchItems();
  };

  useEffect(() => {
    fetchItems();
  }, [fetchItems, refreshTrigger]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
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
        <Button mt={2} onClick={fetchItems} size="sm">
          Retry
        </Button>
      </Card.Root>
    );
  }

  if (items.length === 0) {
    return (
      <Card.Root p={8}>
        <Text textAlign="center" color="gray.500">
          No items connected yet. Connect your first account to get started!
        </Text>
      </Card.Root>
    );
  }

  return (
    <Box>
      <Heading size="lg" mb={4}>
        Connected Items ({items.length})
      </Heading>

      <Stack gap={3}>
        {items.map((item) => (
          <Card.Root
            key={item.item_id}
            cursor="pointer"
            onClick={() => onItemSelect?.(item)}
            _hover={{ bg: "gray.50", shadow: "sm" }}
            transition="all 0.2s"
            p={4}
          >
            <Flex justify="space-between" align="center" gap={3}>
              <Flex gap={3} align="center" flex="1" minW={0}>
                {item.connector_image_url && (
                  <Image
                    src={item.connector_image_url}
                    alt={item.connector_name || "Connector"}
                    boxSize="40px"
                    borderRadius="md"
                    objectFit="contain"
                    flexShrink={0}
                  />
                )}
                
                <Box flex="1" minW={0}>
                  <Flex align="center" gap={2} mb={1}>
                    <Heading size="sm">
                      {item.connector_name || "Unknown Connector"}
                    </Heading>
                    {item.status && (
                      <Badge
                        size="sm"
                        colorScheme={
                          item.status === "UPDATED"
                            ? "green"
                            : item.status === "UPDATING"
                              ? "blue"
                              : item.status === "LOGIN_ERROR" ||
                                  item.status === "OUTDATED"
                                ? "red"
                                : "gray"
                        }
                      >
                        {item.status}
                      </Badge>
                    )}
                  </Flex>
                  
                  {item.last_updated_at && (
                    <Text fontSize="xs" color="gray.500">
                      Updated: {new Date(item.last_updated_at).toLocaleDateString()}
                    </Text>
                  )}
                </Box>
              </Flex>

              {/* Right side - Delete button */}
              <DeleteItemButton
                itemId={item.item_id}
                itemName={item.connector_name}
                onDeleteSuccess={handleDeleteSuccess}
                size="sm"
              />
            </Flex>
          </Card.Root>
        ))}
      </Stack>
      
      {pagination.totalPages > 1 && (
        <Flex justify="space-between" align="center" mt={6}>
          <Text fontSize="sm" color="gray.600">
            Page {pagination.page} of {pagination.totalPages}
          </Text>
          
          <Flex gap={2}>
            <Button
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              variant="outline"
            >
              Previous
            </Button>
            
            {/* Page numbers */}
            <Flex gap={1}>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => {
                // Show first, last, current, and pages around current
                const showPage = 
                  pageNum === 1 ||
                  pageNum === pagination.totalPages ||
                  Math.abs(pageNum - currentPage) <= 1;
                
                const showEllipsis = 
                  (pageNum === 2 && currentPage > 3) ||
                  (pageNum === pagination.totalPages - 1 && currentPage < pagination.totalPages - 2);

                if (!showPage && !showEllipsis) return null;
                
                if (showEllipsis) {
                  return (
                    <Text key={`ellipsis-${pageNum}`} px={2} fontSize="sm" color="gray.500">
                      ...
                    </Text>
                  );
                }
                
                return (
                  <Button
                    key={pageNum}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    variant={currentPage === pageNum ? "solid" : "outline"}
                    colorScheme={currentPage === pageNum ? "blue" : "gray"}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </Flex>
            
            <Button
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === pagination.totalPages}
              variant="outline"
            >
              Next
            </Button>
          </Flex>
        </Flex>
      )}
    </Box>
  );
}