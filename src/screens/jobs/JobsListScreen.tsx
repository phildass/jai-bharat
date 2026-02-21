/**
 * JobsListScreen
 * Searchable, filterable government jobs list with pagination.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { searchJobs, Job, JobsFacets } from '../../services/jobsService';

const SORT_OPTIONS: { label: string; value: 'latest' | 'closingSoon' | 'relevance' }[] = [
  { label: 'Latest',       value: 'latest' },
  { label: 'Closing Soon', value: 'closingSoon' },
  { label: 'Relevance',    value: 'relevance' },
];

const PAGE_SIZE = 20;

export default function JobsListScreen({ navigation }: any) {
  const [query, setQuery] = useState('');
  const [sort, setSort]   = useState<'latest' | 'closingSoon' | 'relevance'>('latest');

  const [filterState,    setFilterState]    = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus,   setFilterStatus]   = useState('');

  const [jobs,    setJobs]    = useState<Job[]>([]);
  const [facets,  setFacets]  = useState<JobsFacets | null>(null);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const fetchJobs = useCallback(
    async (pageNum: number, append = false) => {
      setLoading(true);
      setError('');
      try {
        const res = await searchJobs({
          q:        query || undefined,
          state:    filterState    || undefined,
          category: filterCategory || undefined,
          status:   filterStatus   || undefined,
          sort,
          page: pageNum,
          pageSize: PAGE_SIZE,
        });
        setJobs(prev => (append ? [...prev, ...res.results] : res.results));
        setTotal(res.total);
        setFacets(res.facets);
      } catch {
        setError('Failed to load jobs. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [query, sort, filterState, filterCategory, filterStatus]
  );

  // Re-fetch on filter/sort change
  useEffect(() => {
    setPage(1);
    fetchJobs(1, false);
  }, [fetchJobs]);

  const handleLoadMore = () => {
    if (loading || jobs.length >= total) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchJobs(nextPage, true);
  };

  const renderJob = ({ item }: { item: Job }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('JobDetail', { jobId: item.id })}
    >
      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
      {item.organization ? (
        <Text style={styles.cardOrg}>{item.organization}</Text>
      ) : null}
      <View style={styles.cardMeta}>
        {item.board ? <Text style={styles.badge}>{item.board}</Text> : null}
        {item.category ? <Text style={styles.badge}>{item.category}</Text> : null}
        {item.status ? (
          <Text style={[styles.badge, item.status === 'open' && styles.badgeOpen]}>
            {item.status}
          </Text>
        ) : null}
      </View>
      <View style={styles.cardFooter}>
        {item.location_text ? (
          <Text style={styles.location}>📍 {item.location_text}</Text>
        ) : null}
        {item.last_date ? (
          <Text style={styles.date}>🗓 Last date: {item.last_date}</Text>
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
          placeholder="Search jobs (e.g. constable, clerk…)"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={() => { setPage(1); fetchJobs(1, false); }}
        />
        <TouchableOpacity
          style={styles.nearMeBtn}
          onPress={() => navigation.navigate('JobsNearMe')}
        >
          <Text style={styles.nearMeText}>📍 Near Me</Text>
        </TouchableOpacity>
      </View>

      {/* Sort pills */}
      <View style={styles.sortRow}>
        {SORT_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.sortPill, sort === opt.value && styles.sortPillActive]}
            onPress={() => setSort(opt.value)}
          >
            <Text style={[styles.sortPillText, sort === opt.value && styles.sortPillTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filter row */}
      <View style={styles.filterRow}>
        <TextInput
          style={styles.filterInput}
          placeholder="State"
          value={filterState}
          onChangeText={setFilterState}
        />
        <TextInput
          style={styles.filterInput}
          placeholder="Category"
          value={filterCategory}
          onChangeText={setFilterCategory}
        />
        <TextInput
          style={styles.filterInput}
          placeholder="Status"
          value={filterStatus}
          onChangeText={setFilterStatus}
        />
      </View>

      {/* Error */}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Results count */}
      {!loading && !error ? (
        <Text style={styles.resultCount}>{total} jobs found</Text>
      ) : null}

      {/* List */}
      <FlatList
        data={jobs}
        keyExtractor={item => item.id}
        renderItem={renderJob}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loading ? <ActivityIndicator style={styles.spinner} color="#4F46E5" /> : null
        }
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>No jobs found.</Text> : null
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#F3F4F6' },
  searchRow:          { flexDirection: 'row', padding: 12, gap: 8 },
  searchInput:        {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  nearMeBtn:          {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  nearMeText:         { color: 'white', fontSize: 12, fontWeight: '600' },
  sortRow:            { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 4 },
  sortPill:           {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: 'white',
  },
  sortPillActive:     { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  sortPillText:       { fontSize: 12, color: '#374151' },
  sortPillTextActive: { color: 'white', fontWeight: '600' },
  filterRow:          { flexDirection: 'row', paddingHorizontal: 12, gap: 6, marginBottom: 6 },
  filterInput:        {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
  },
  resultCount:        { paddingHorizontal: 14, fontSize: 12, color: '#6B7280', marginBottom: 4 },
  list:               { paddingHorizontal: 12, paddingBottom: 24 },
  card:               {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle:          { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  cardOrg:            { fontSize: 13, color: '#4B5563', marginBottom: 6 },
  cardMeta:           { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 6 },
  badge:              {
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    color: '#374151',
    textTransform: 'capitalize',
  },
  badgeOpen:          { backgroundColor: '#D1FAE5', color: '#065F46' },
  cardFooter:         { gap: 2 },
  location:           { fontSize: 12, color: '#6B7280' },
  date:               { fontSize: 12, color: '#9CA3AF' },
  error:              { color: '#EF4444', textAlign: 'center', marginVertical: 8 },
  empty:              { textAlign: 'center', marginTop: 40, color: '#9CA3AF', fontSize: 14 },
  spinner:            { marginVertical: 16 },
});
