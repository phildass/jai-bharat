/**
 * Jobs Search Screen
 * Full-text search + filters (state, category, status) + paginated list.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import { searchJobs, Job } from '../../services/jobsService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Props {
  navigation: any;
}

const STATUS_OPTIONS = ['', 'active', 'upcoming', 'closed'];
const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function JobsSearchScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(
    async (pageNum: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }
      try {
        const result = await searchJobs({
          q: query,
          state: stateFilter,
          category: categoryFilter,
          status: statusFilter,
          page: pageNum,
          pageSize: PAGE_SIZE,
        });
        setTotal(result.total);
        setJobs((prev) => (append ? [...prev, ...result.results] : result.results));
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch jobs');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [query, stateFilter, categoryFilter, statusFilter]
  );

  // Search on filter change (reset to page 1)
  useEffect(() => {
    setPage(1);
    fetchJobs(1, false);
  }, [fetchJobs]);

  const handleSearch = useCallback(() => {
    setPage(1);
    fetchJobs(1, false);
  }, [fetchJobs]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || jobs.length >= total) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchJobs(nextPage, true);
  }, [loadingMore, jobs.length, total, page, fetchJobs]);

  const renderJob = useCallback(
    ({ item }: { item: Job }) => (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('JobDetail', { jobId: item.id })}
        accessibilityRole="button"
        accessibilityLabel={`${item.title} at ${item.organization}`}
      >
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardOrg}>{item.organization}</Text>
        <View style={styles.cardMeta}>
          {item.state ? <Text style={styles.metaTag}>{item.state}</Text> : null}
          {item.category ? <Text style={styles.metaTag}>{item.category}</Text> : null}
          <Text style={[styles.statusBadge, statusStyle(item.status)]}>{item.status}</Text>
        </View>
        {item.last_date ? (
          <Text style={styles.cardDate}>Last date: {item.last_date}</Text>
        ) : null}
      </TouchableOpacity>
    ),
    [navigation]
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search jobs…"
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
          accessibilityLabel="Search jobs"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>Go</Text>
        </TouchableOpacity>
      </View>

      {/* Filter row */}
      <View style={styles.filterRow}>
        <TextInput
          style={styles.filterInput}
          placeholder="State"
          placeholderTextColor="#9CA3AF"
          value={stateFilter}
          onChangeText={setStateFilter}
          accessibilityLabel="Filter by state"
        />
        <TextInput
          style={styles.filterInput}
          placeholder="Category"
          placeholderTextColor="#9CA3AF"
          value={categoryFilter}
          onChangeText={setCategoryFilter}
          accessibilityLabel="Filter by category"
        />
      </View>

      {/* Status tabs */}
      <View style={styles.statusRow}>
        {STATUS_OPTIONS.map((s) => (
          <TouchableOpacity
            key={s || 'all'}
            style={[styles.statusTab, statusFilter === s && styles.statusTabActive]}
            onPress={() => setStatusFilter(s)}
            accessibilityRole="tab"
            accessibilityState={{ selected: statusFilter === s }}
          >
            <Text
              style={[
                styles.statusTabText,
                statusFilter === s && styles.statusTabTextActive,
              ]}
            >
              {s || 'All'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => fetchJobs(1, false)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={renderJob}
          contentContainerStyle={jobs.length === 0 ? styles.emptyContainer : undefined}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No jobs found.</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={styles.footerLoader} color="#FF6B35" />
            ) : null
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
        />
      )}

      {/* Total count */}
      {!loading && !error && jobs.length > 0 && (
        <Text style={styles.totalText}>
          Showing {jobs.length} of {total} jobs
        </Text>
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function statusStyle(status: string) {
  switch (status) {
    case 'active':
      return styles.statusActive;
    case 'closed':
      return styles.statusClosed;
    case 'upcoming':
      return styles.statusUpcoming;
    default:
      return {};
  }
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  searchRow: {
    flexDirection: 'row',
    margin: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    fontSize: 15,
    color: '#111827',
  },
  searchBtn: {
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  searchBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  filterRow: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginBottom: 8,
    gap: 8,
  },
  filterInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    fontSize: 13,
    color: '#111827',
  },
  statusRow: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginBottom: 8,
    gap: 6,
  },
  statusTab: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
  },
  statusTabActive: {
    backgroundColor: '#FF6B35',
  },
  statusTabText: {
    fontSize: 12,
    color: '#374151',
  },
  statusTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 3,
  },
  cardOrg: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 4,
  },
  metaTag: {
    fontSize: 11,
    backgroundColor: '#F3F4F6',
    color: '#374151',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadge: {
    fontSize: 11,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
    overflow: 'hidden',
  },
  statusActive: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
  },
  statusClosed: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
  },
  statusUpcoming: {
    backgroundColor: '#DBEAFE',
    color: '#1E40AF',
  },
  cardDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 15,
    textAlign: 'center',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 8,
  },
  retryText: {
    color: '#FF6B35',
    fontSize: 15,
    fontWeight: '600',
  },
  footerLoader: {
    marginVertical: 12,
  },
  totalText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9CA3AF',
    paddingVertical: 6,
  },
});
