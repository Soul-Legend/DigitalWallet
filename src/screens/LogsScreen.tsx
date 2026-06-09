import React, {useEffect, useMemo, useCallback, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import {useAppStore} from '../stores/useAppStore';
import LogEntry from '../components/LogEntry';
import type {LogEntry as LogEntryType} from '../types';
import {MaterialIcons} from '@expo/vector-icons';

const LogsScreen: React.FC = () => {
  const setCurrentModule = useAppStore(state => state.setCurrentModule);
  const logs = useAppStore(state => state.logs);
  const clearLogs = useAppStore(state => state.clearLogs);

  const [filterModule, setFilterModule] = useState<LogEntryType['module'] | 'all'>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const [isFiltering, setIsFiltering] = useState(false);

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

  // Sort and filter logs. Memoised so we
  // don't re-allocate the array on every parent re-render.
  const displayLogs = useMemo<LogEntryType[]>(() => {
    let filtered = logs;
    if (filterModule !== 'all') {
      filtered = filtered.filter(log => log.module === filterModule);
    }
    
    const sorted = [...filtered].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return sorted.slice(0, visibleCount);
  }, [logs, filterModule, visibleCount]);

  const totalFilteredCount = useMemo(() => {
    if (filterModule === 'all') return logs.length;
    return logs.filter(log => log.module === filterModule).length;
  }, [logs, filterModule]);

  const handleLoadMore = useCallback(() => {
    setVisibleCount(prev => prev + 20);
  }, []);

  const handleApplyFilter = useCallback((module: LogEntryType['module'] | 'all') => {
    setShowFilterModal(false);
    
    if (module === filterModule) return;

    setIsFiltering(true);
    
    setTimeout(() => {
      setFilterModule(module);
      setVisibleCount(20);
      setIsFiltering(false);
    }, 350);
  }, [filterModule]);

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
            <MaterialIcons name="delete-outline" size={18} color="#003a8c" />
            <Text style={styles.clearButtonText}>Limpar Histórico</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Date Header & Filter */}
      {logs.length > 0 && (
        <View style={styles.filterBar}>
          <Text style={styles.dateLabel}>Hoje</Text>
          <TouchableOpacity 
            style={[styles.filterButton, filterModule !== 'all' && styles.filterButtonActive]}
            onPress={() => setShowFilterModal(true)}>
            <MaterialIcons name="filter-list" size={18} color={filterModule !== 'all' ? "#003a8c" : "#434653"} />
            <Text style={[styles.filterButtonText, filterModule !== 'all' && styles.filterButtonTextActive]}>
              {filterModule === 'all' ? 'Filtrar Logs' : `Filtrado: ${filterModule}`}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {logs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="history" size={64} color="#e5e2e1" style={styles.emptyIcon} />
          <Text style={styles.emptyText}>Nenhum evento registrado</Text>
          <Text style={styles.emptySubtext}>
            Os eventos criptográficos aparecerão aqui conforme você utiliza o
            aplicativo
          </Text>
        </View>
      ) : isFiltering ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#003a8c" />
          <Text style={styles.loadingText}>Aplicando filtro...</Text>
        </View>
      ) : displayLogs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="search-off" size={64} color="#e5e2e1" style={styles.emptyIcon} />
          <Text style={styles.emptyText}>Nenhum log encontrado</Text>
          <Text style={styles.emptySubtext}>
            Tente mudar os filtros de busca para ver mais resultados.
          </Text>
        </View>
      ) : (
        <FlatList
          style={styles.logsList}
          contentContainerStyle={styles.logsListContent}
          data={displayLogs}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={10}
          removeClippedSubviews
          ListFooterComponent={
            visibleCount < totalFilteredCount ? (
              <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMore}>
                <Text style={styles.loadMoreText}>Carregar Mais Logs</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowFilterModal(false)}>
          <Pressable style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtrar por Módulo</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)} style={styles.modalCloseButton}>
                <MaterialIcons name="close" size={24} color="#434653" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.filterOptions}>
              <TouchableOpacity 
                style={[styles.filterOption, filterModule === 'all' && styles.filterOptionSelected]}
                onPress={() => handleApplyFilter('all')}>
                <Text style={[styles.filterOptionText, filterModule === 'all' && styles.filterOptionTextSelected]}>Todos os Módulos</Text>
                {filterModule === 'all' && <MaterialIcons name="check" size={20} color="#003a8c" />}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.filterOption, filterModule === 'emissor' && styles.filterOptionSelected]}
                onPress={() => handleApplyFilter('emissor')}>
                <Text style={[styles.filterOptionText, filterModule === 'emissor' && styles.filterOptionTextSelected]}>Emissor</Text>
                {filterModule === 'emissor' && <MaterialIcons name="check" size={20} color="#003a8c" />}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.filterOption, filterModule === 'titular' && styles.filterOptionSelected]}
                onPress={() => handleApplyFilter('titular')}>
                <Text style={[styles.filterOptionText, filterModule === 'titular' && styles.filterOptionTextSelected]}>Titular</Text>
                {filterModule === 'titular' && <MaterialIcons name="check" size={20} color="#003a8c" />}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.filterOption, filterModule === 'verificador' && styles.filterOptionSelected]}
                onPress={() => handleApplyFilter('verificador')}>
                <Text style={[styles.filterOptionText, filterModule === 'verificador' && styles.filterOptionTextSelected]}>Verificador</Text>
                {filterModule === 'verificador' && <MaterialIcons name="check" size={20} color="#003a8c" />}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
    fontSize: 34,
    fontWeight: '800',
    color: '#003a8c', // primary
    marginBottom: 8,
    letterSpacing: -0.8,
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
  clearButtonText: {
    color: '#003a8c', // primary
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1b1b1c', // on-surface
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#eae7e7', // surface-container-high
    borderRadius: 16,
  },
  filterButtonActive: {
    backgroundColor: '#d6e4f6', // primary-container
  },
  filterButtonText: {
    fontSize: 14,
    color: '#434653',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  filterButtonTextActive: {
    color: '#003a8c', // on-primary-container
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#434653',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#737784',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#434653',
    fontWeight: '500',
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
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 24,
    marginTop: 8,
    backgroundColor: '#f6f3f2', // surface-container-low
    borderRadius: 8,
  },
  loadMoreText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#003a8c', // primary
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 48,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1b1b1c',
  },
  modalCloseButton: {
    padding: 4,
  },
  filterOptions: {
    gap: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#fcf9f8',
  },
  filterOptionSelected: {
    backgroundColor: '#d6e4f6',
  },
  filterOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#434653',
  },
  filterOptionTextSelected: {
    color: '#003a8c',
    fontWeight: '700',
  },
});

export default LogsScreen;
