/**
 * Jobs Search Screen
 * /jobs – keyword search, state/category filters, paginated results
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { searchJobs, Job } from '../../services/jobsService';

interface Props {
  navigation: any;
}

export default function JobsSearchScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState('');
  const [category, setCategory] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const fetchJobs = useCallback(async (pageNum = 1) => {
    setLoading(true);
    setError('');
    try {
      const result = await searchJobs({
        q: query || undefined,
        state: state || undefined,
        category: category || undefined,
        page: pageNum,
        limit: 20,
      });
      if (pageNum === 1) {
        setJobs(result.jobs);
      } else {
        setJobs((prev) => [...prev, ...result.jobs]);
      }
      setTotal(result.total);
      setPage(result.page);
      setTotalPages(result.totalPages);
      setSearched(true);
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  }, [query, state, category]);

  const handleSearch = () => {
    setPage(1);
    fetchJobs(1);
  };

  const handleLoadMore = () => {
    if (!loading && page < totalPages) {
      fetchJobs(page + 1);
    }
  };

  const renderItem = ({ item }: { item: Job }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('JobDetail', { jobId: item.id })}
    >
      <Text style={styles.jobTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.jobOrg}>{item.organization || item.board || '–'}</Text>
      <View style={styles.metaRow}>
        {item.state ? <Text style={styles.tag}>{item.state}</Text> : null}
        {item.category ? <Text style={styles.tag}>{item.category}</Text> : null}
        {item.last_date ? (
          <Text style={styles.dateText}>Last: {item.last_date}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>🔍 Find Govt Jobs</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search jobs, boards, organizations…"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        <TextInput
          style={styles.filterInput}
          placeholder="State"
          value={state}
          onChangeText={setState}
        />
        <TextInput
          style={styles.filterInput}
          placeholder="Category"
          value={category}
          onChangeText={setCategory}
        />
      </View>

      {/* Results */}
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}

      {searched && !loading && (
        <Text style={styles.resultCount}>{total} job{total !== 1 ? 's' : ''} found</Text>
      )}

      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading && searched ? (
            <Text style={styles.emptyText}>No jobs found. Try different keywords or filters.</Text>
          ) : null
        }
        ListFooterComponent={
          loading ? <ActivityIndicator size="small" color="#FF6B35" style={{ margin: 16 }} /> : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
    fontSize: 14,
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
    fontSize: 14,
  },
  filterRow: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginBottom: 8,
    gap: 8,
  },
  filterInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    fontSize: 13,
  },
  resultCount: {
    marginHorizontal: 16,
    marginBottom: 4,
    fontSize: 13,
    color: '#6B7280',
  },
  list: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  jobOrg: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  tag: {
    backgroundColor: '#EEF2FF',
    color: '#4338CA',
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dateText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 40,
    fontSize: 14,
  },
  errorText: {
    color: '#EF4444',
    margin: 12,
    fontSize: 13,
  },
});
