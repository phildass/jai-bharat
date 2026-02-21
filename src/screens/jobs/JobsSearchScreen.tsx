/**
 * JobsSearchScreen
 * Search, filter and browse government jobs.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Job, JobsSearchParams, searchJobs } from '../../services/jobsService';

const STATUS_LABELS: Record<string, string> = {
  open: '🟢 Open',
  closed: '🔴 Closed',
  result_out: '📋 Result',
  upcoming: '🔵 Upcoming',
};

interface Props {
  navigation?: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

export default function JobsSearchScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState<JobsSearchParams['sort']>('latest');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const PAGE_SIZE = 20;

  const fetchJobs = useCallback(
    async (reset = false, pageNum?: number) => {
      setLoading(true);
      setError('');
      const currentPage = reset ? 1 : (pageNum ?? page);
      try {
        const data = await searchJobs({
          q: query || undefined,
          state: stateFilter || undefined,
          category: categoryFilter || undefined,
          status: statusFilter || undefined,
          sort,
          page: currentPage,
          pageSize: PAGE_SIZE,
        });
        if (reset) {
          setJobs(data.results);
          setPage(1);
        } else {
          setJobs((prev) => (currentPage === 1 ? data.results : [...prev, ...data.results]));
        }
        setTotal(data.total);
      } catch {
        setError('Failed to load jobs. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [query, stateFilter, categoryFilter, statusFilter, sort]
  );

  useEffect(() => {
    fetchJobs(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateFilter, categoryFilter, statusFilter, sort]);

  const handleSearch = () => {
    setPage(1);
    fetchJobs(true);
  };

  const loadMore = () => {
    if (jobs.length < total && !loading) {
      setPage((p) => p + 1);
    }
  };

  useEffect(() => {
    if (page > 1) {
      fetchJobs(false, page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const renderJob = ({ item }: { item: Job }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation?.navigate('JobDetail', { jobId: item.id })}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.statusBadge}>{STATUS_LABELS[item.status] ?? item.status}</Text>
        {item.category ? <Text style={styles.categoryBadge}>{item.category}</Text> : null}
      </View>
      <Text style={styles.jobTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.orgName}>{item.organisation}</Text>
      {item.location_label ? (
        <Text style={styles.location}>📍 {item.location_label}</Text>
      ) : null}
      <View style={styles.cardMeta}>
        {item.vacancies ? (
          <Text style={styles.metaText}>👥 {item.vacancies.toLocaleString('en-IN')} vacancies</Text>
        ) : null}
        {item.apply_end_date ? (
          <Text style={styles.metaText}>⏰ Last date: {item.apply_end_date}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search jobs, org, category…"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          accessibilityLabel="Search input"
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch} accessibilityRole="button">
          <Text style={styles.searchButtonText}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Filters row */}
      <View style={styles.filtersRow}>
        <TextInput
          style={styles.filterInput}
          placeholder="State"
          value={stateFilter}
          onChangeText={setStateFilter}
          onSubmitEditing={() => fetchJobs(true)}
          accessibilityLabel="State filter"
        />
        <TextInput
          style={styles.filterInput}
          placeholder="Category"
          value={categoryFilter}
          onChangeText={setCategoryFilter}
          onSubmitEditing={() => fetchJobs(true)}
          accessibilityLabel="Category filter"
        />
        <TextInput
          style={styles.filterInput}
          placeholder="Status"
          value={statusFilter}
          onChangeText={setStatusFilter}
          onSubmitEditing={() => fetchJobs(true)}
          accessibilityLabel="Status filter"
        />
      </View>

      {/* Sort options */}
      <View style={styles.sortRow}>
        {(['latest', 'closing_soon', 'relevance'] as const).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.sortChip, sort === s && styles.sortChipActive]}
            onPress={() => setSort(s)}
            accessibilityRole="button"
          >
            <Text style={[styles.sortChipText, sort === s && styles.sortChipTextActive]}>
              {s === 'latest' ? 'Latest' : s === 'closing_soon' ? 'Closing Soon' : 'Relevance'}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={styles.nearMeButton}
          onPress={() => navigation?.navigate('JobsNearMe')}
          accessibilityRole="button"
        >
          <Text style={styles.nearMeButtonText}>📍 Near Me</Text>
        </TouchableOpacity>
      </View>

      {/* Results count */}
      {!loading && (
        <Text style={styles.resultsCount}>{total.toLocaleString('en-IN')} jobs found</Text>
      )}

      {/* Error */}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Job list */}
      <FlatList
        data={jobs}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderJob}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loading ? <ActivityIndicator style={styles.loader} color="#FF6B35" /> : null
        }
        ListEmptyComponent={
          !loading ? <Text style={styles.emptyText}>No jobs found. Try different filters.</Text> : null
        }
      />
    </View>
  );
}

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
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    backgroundColor: '#FFFFFF',
  },
  searchButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  searchButtonText: {
    fontSize: 18,
  },
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 6,
    marginBottom: 6,
  },
  filterInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    backgroundColor: '#FFFFFF',
  },
  sortRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 6,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  sortChip: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
  },
  sortChipActive: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF0EA',
  },
  sortChipText: {
    fontSize: 12,
    color: '#374151',
  },
  sortChipTextActive: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  nearMeButton: {
    borderWidth: 1,
    borderColor: '#004E89',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#E8F0FE',
  },
  nearMeButtonText: {
    fontSize: 12,
    color: '#004E89',
    fontWeight: '600',
  },
  resultsCount: {
    paddingHorizontal: 12,
    paddingBottom: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  errorText: {
    margin: 12,
    color: '#EF4444',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 10,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: '600',
  },
  categoryBadge: {
    fontSize: 11,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  orgName: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 4,
  },
  location: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  loader: {
    padding: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 40,
    fontSize: 14,
  },
});
