import React, {useEffect, useMemo, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {useAppStore} from '../stores/useAppStore';
import LogEntry from '../components/LogEntry';
import type {LogEntry as LogEntryType} from '../types';

const LogsScreen: React.FC = () => {
  const setCurrentModule = useAppStore(state => state.setCurrentModule);
  const logs = useAppStore(state => state.logs);
  const clearLogs = useAppStore(state => state.clearLogs);

  useEffect(() => {
    setCurrentModule('logs');
  }, [setCurrentModule]);

  const handleClearLogs = useCallback(() => {
    Alert.alert(
      'Limpar Histórico',
      'Tem certeza que deseja limpar todos os logs? Esta ação não pode ser desfeita.',
      [
        {text: 'Cancelar', style: 'cancel'},
        {text: 'Limpar', style: 'destructive', onPress: () => clearLogs()},
      ],
    );
  }, [clearLogs]);

  // Sort logs in reverse chronological order (newest first). Memoised so we
  // don't re-allocate the array on every parent re-render.
  const sortedLogs = useMemo<LogEntryType[]>(
    () =>
      [...logs].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      ),
    [logs],
  );

  const renderItem = useCallback(
    ({item}: {item: LogEntryType}) => <LogEntry log={item} />,
    [],
  );
  const keyExtractor = useCallback((item: LogEntryType) => item.id, []);

  return (
    <View style={styles.container}>
      {/* Editorial Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Atividades de Segurança</Text>
        <Text style={styles.subtitle}>
          Registro de eventos criptográficos da Carteira Digital SSI
        </Text>

        {logs.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearLogs}>
            <Text style={styles.clearButtonIcon}>🗑️</Text>
            <Text style={styles.clearButtonText}>Limpar Histórico</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Date Header & Filter */}
      {logs.length > 0 && (
        <View style={styles.filterBar}>
          <Text style={styles.dateLabel}>Hoje</Text>
          <TouchableOpacity style={styles.filterButton}>
            <Text style={styles.filterButtonIcon}>≡</Text>
            <Text style={styles.filterButtonText}>Filtrar Logs</Text>
          </TouchableOpacity>
        </View>
      )}

      {logs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>Nenhum evento registrado</Text>
          <Text style={styles.emptySubtext}>
            Os eventos criptográficos aparecerão aqui conforme você utiliza o
            aplicativo
          </Text>
        </View>
      ) : (
        <FlatList
          style={styles.logsList}
          contentContainerStyle={styles.logsListContent}
          data={sortedLogs}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={10}
          removeClippedSubviews
          ListFooterComponent={
            <TouchableOpacity style={styles.loadMoreButton}>
              <Text style={styles.loadMoreText}>Carregar Mais Logs</Text>
            </TouchableOpacity>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fcf9f8', // surface
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1b1b1c', // on-surface
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#434653', // on-surface-variant
    marginBottom: 16,
    lineHeight: 22,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  clearButtonIcon: {
    fontSize: 14,
  },
  clearButtonText: {
    color: '#ba1a1a', // error
    fontSize: 15,
    fontWeight: '600',
  },
  // Filter Bar
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  dateLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1b1b1c', // on-surface
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f6f3f2', // surface-container-low
    borderRadius: 8,
  },
  filterButtonIcon: {
    fontSize: 16,
    color: '#434653',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#434653',
    fontWeight: '500',
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#434653',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#737784',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Logs List
  logsList: {
    flex: 1,
  },
  logsListContent: {
    paddingBottom: 24,
  },
  // Load More
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginHorizontal: 24,
    marginTop: 8,
  },
  loadMoreText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#003a8c', // primary
  },
});

export default LogsScreen;
