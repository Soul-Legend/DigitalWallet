import React, {useReducer, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Share,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {MaterialIcons} from '@expo/vector-icons';
import {scaleFontSize} from '../utils/theme';
import RuntimeTestRunner from '../services/RuntimeTestRunner';
import {registerAllRuntimeTests} from '../services/runtimeTests';
import zkProofServiceInstance from '../services/ZKProofService';
import {
  generateMarkdownReport,
  generateJSONReport,
} from '../services/RuntimeTestReportService';
import type {
  RuntimeTestResult,
  RuntimeTestSuiteResult,
  TestCategory,
} from '../types/runtime-tests';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface State {
  status: 'idle' | 'running' | 'done';
  results: RuntimeTestResult[];
  completed: number;
  total: number;
  currentTest: string;
  filter: TestCategory | null;
  expandedId: string | null;
  suiteResult: RuntimeTestSuiteResult | null;
}

type Action =
  | {type: 'START'; total: number}
  | {
      type: 'PROGRESS';
      completed: number;
      total: number;
      result: RuntimeTestResult;
    }
  | {type: 'DONE'; suite: RuntimeTestSuiteResult}
  | {type: 'FILTER'; category: TestCategory | null}
  | {type: 'TOGGLE_EXPAND'; id: string}
  | {type: 'RESET'};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'START':
      return {
        ...state,
        status: 'running',
        results: [],
        completed: 0,
        total: action.total,
        currentTest: '',
        expandedId: null,
        suiteResult: null,
      };
    case 'PROGRESS':
      return {
        ...state,
        completed: action.completed,
        total: action.total,
        currentTest: action.result.name,
        results: [...state.results, action.result],
      };
    case 'DONE':
      return {
        ...state,
        status: 'done',
        suiteResult: action.suite,
        results: action.suite.results,
      };
    case 'FILTER':
      return {...state, filter: action.category};
    case 'TOGGLE_EXPAND':
      return {
        ...state,
        expandedId: state.expandedId === action.id ? null : action.id,
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

const initialState: State = {
  status: 'idle',
  results: [],
  completed: 0,
  total: 0,
  currentTest: '',
  filter: null,
  expandedId: null,
  suiteResult: null,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DiagnosticsScreen(): React.JSX.Element {
  const [state, dispatch] = useReducer(reducer, initialState);
  const registeredRef = useRef(false);


  useEffect(() => {
    if (!registeredRef.current) {
      registerAllRuntimeTests();
      registeredRef.current = true;
    }
  }, []);


  const categories = RuntimeTestRunner.getCategories();

  const runTests = useCallback(
    async (category: TestCategory | null) => {
      const tests = category
        ? RuntimeTestRunner.getTests().filter(t => t.category === category)
        : RuntimeTestRunner.getTests();

      dispatch({type: 'START', total: tests.length});

      // Ensure ZKPs are provisioned before running tests
      await zkProofServiceInstance.provisionBundledZkeys();

      const suite = category
        ? await RuntimeTestRunner.runByCategory(category, (c, t, r) =>
            dispatch({type: 'PROGRESS', completed: c, total: t, result: r})
          )
        : await RuntimeTestRunner.runAll((c, t, r) =>
            dispatch({type: 'PROGRESS', completed: c, total: t, result: r})
          );

      dispatch({type: 'DONE', suite});
    },
    []
  );

  const handleExportMarkdown = useCallback(async () => {
    if (!state.suiteResult) {return;}
    const report = generateMarkdownReport(state.suiteResult);

    if (Platform.OS === 'web') {
      await Clipboard.setStringAsync(report);
      return;
    }

    try {
      await Share.share({message: report, title: 'Runtime Test Report'});
    } catch {
      await Clipboard.setStringAsync(report);
    }
  }, [state.suiteResult]);

  const handleCopyJSON = useCallback(async () => {
    if (!state.suiteResult) {return;}
    await Clipboard.setStringAsync(generateJSONReport(state.suiteResult));
  }, [state.suiteResult]);

  const filteredResults = state.filter
    ? state.results.filter(r => r.category === state.filter)
    : state.results;

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  const renderStatusIcon = (status: RuntimeTestResult['status']) => {
    switch (status) {
      case 'passed':
        return <MaterialIcons name="check-circle" size={20} color="#006511" />; // success
      case 'failed':
        return <MaterialIcons name="cancel" size={20} color="#ba1a1a" />; // error
      case 'running':
        return <MaterialIcons name="hourglass-top" size={20} color="#fecc03" />; // warning
      default:
        return (
          <MaterialIcons name="radio-button-unchecked" size={20} color="#737784" />
        ); // disabled
    }
  };

  const renderItem = ({item}: {item: RuntimeTestResult}) => {
    const expanded = state.expandedId === item.id;
    return (
      <TouchableOpacity
        style={[
          styles.resultRow,
          item.status === 'failed' && styles.resultRowFailed,
        ]}
        onPress={() => dispatch({type: 'TOGGLE_EXPAND', id: item.id})}
        activeOpacity={0.7}>
        <View style={styles.resultRowHeader}>
          {renderStatusIcon(item.status)}
          <View style={styles.resultRowText}>
            <Text
              style={styles.resultName}
              numberOfLines={expanded ? undefined : 1}>
              {item.name}
            </Text>
            <View style={styles.resultMeta}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{item.category}</Text>
              </View>
              <Text style={styles.durationText}>{item.durationMs}ms</Text>
            </View>
          </View>
          <MaterialIcons
            name={expanded ? 'expand-less' : 'expand-more'}
            size={24}
            color="#737784"
          />
        </View>

        {expanded && item.status === 'failed' && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorLabel}>Error:</Text>
            <Text style={styles.errorText}>{item.error}</Text>
            {item.stackTrace ? (
              <>
                <Text style={styles.errorLabel}>Stack Trace:</Text>
                <ScrollView horizontal style={styles.stackScroll}>
                  <Text style={styles.stackText}>{item.stackTrace}</Text>
                </ScrollView>
              </>
            ) : null}
          </View>
        )}

        {expanded && item.status === 'passed' && (
          <View style={styles.passedDetail}>
            <Text style={styles.passedDetailText}>
              Concluído com sucesso em {item.durationMs}ms
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View>
      {/* Title */}
      <View style={styles.header}>
        <Text style={styles.title}>Diagnósticos E2E</Text>
        <Text style={styles.subtitle}>
          Execute testes automatizados no dispositivo e valide as dependências
          nativas.
        </Text>
        <Text style={styles.deviceInfo}>
          {Platform.OS} {Platform.Version} • __DEV__=
          {String(typeof __DEV__ !== 'undefined' && __DEV__)}
        </Text>
      </View>



      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[
            styles.runButton,
            state.status === 'running' && styles.runButtonDisabled,
          ]}
          onPress={() => runTests(null)}
          disabled={state.status === 'running'}>
          <MaterialIcons name="play-arrow" size={20} color="#ffffff" />
          <Text style={styles.runButtonText}>Executar Todos</Text>
        </TouchableOpacity>

        {state.status === 'done' && (
          <View style={styles.exportButtons}>
            <TouchableOpacity
              style={styles.exportButton}
              onPress={handleExportMarkdown}>
              <MaterialIcons name="share" size={18} color="#003a8c" />
              <Text style={styles.exportButtonText}>Exportar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.exportButton}
              onPress={handleCopyJSON}>
              <MaterialIcons name="content-copy" size={18} color="#003a8c" />
              <Text style={styles.exportButtonText}>JSON</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Category chips */}
      <View style={styles.chipScrollContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipContainer}>
          <TouchableOpacity
            style={[styles.chip, state.filter === null && styles.chipActive]}
            onPress={() => dispatch({type: 'FILTER', category: null})}>
            <Text
              style={[
                styles.chipText,
                state.filter === null && styles.chipTextActive,
              ]}>
              Todos
            </Text>
          </TouchableOpacity>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, state.filter === cat && styles.chipActive]}
              onPress={() => {
                dispatch({type: 'FILTER', category: cat});
                if (state.status === 'idle' || state.status === 'done') {
                  runTests(cat);
                }
              }}>
              <Text
                style={[
                  styles.chipText,
                  state.filter === cat && styles.chipTextActive,
                ]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Progress */}
      {state.status === 'running' && (
        <View style={styles.progress}>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${
                    state.total > 0 ? (state.completed / state.total) * 100 : 0
                  }%`,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {state.completed}/{state.total} testes concluídos
          </Text>
          <Text style={styles.currentTestText} numberOfLines={1}>
            {state.currentTest}
          </Text>
        </View>
      )}

      {/* Summary */}
      {state.status === 'done' && state.suiteResult && (
        <View style={styles.summary}>
          <MaterialIcons
            name={state.suiteResult.failed === 0 ? 'check-circle' : 'error'}
            size={40}
            color={state.suiteResult.failed === 0 ? '#006511' : '#ba1a1a'}
          />
          <View style={styles.summaryDetails}>
            <Text style={styles.summaryTitle}>
              {state.suiteResult.failed === 0
                ? 'Todos os testes passaram'
                : 'Falhas detectadas'}
            </Text>
            <Text style={styles.summaryStats}>
              {state.suiteResult.passed} passou • {state.suiteResult.failed}{' '}
              falhou • {(state.suiteResult.durationMs / 1000).toFixed(1)}s
            </Text>
          </View>
        </View>
      )}

      {/* Results section header */}
      {state.results.length > 0 && (
        <Text style={styles.sectionTitle}>Resultados</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredResults}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fcf9f8', // surface
  },
  listContent: {
    paddingBottom: 32,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: scaleFontSize(34),
    fontWeight: '800',
    color: '#003a8c', // primary
    marginBottom: 8,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: scaleFontSize(15),
    color: '#434653', // on-surface-variant
    marginBottom: 12,
    lineHeight: 22,
  },
  deviceInfo: {
    fontSize: scaleFontSize(12),
    color: '#737784',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  engineToggleSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 24,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e2e1',
  },
  engineToggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#003a8c',
    marginBottom: 12,
  },
  engineToggleButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  engineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#f6f3f2',
    borderWidth: 1,
    borderColor: '#e5e2e1',
  },
  engineButtonActive: {
    backgroundColor: '#003a8c',
    borderColor: '#003a8c',
  },
  engineButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#003a8c',
  },
  engineButtonTextActive: {
    color: '#ffffff',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 16,
  },
  runButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#003a8c', // primary
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  runButtonDisabled: {
    opacity: 0.5,
  },
  runButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: scaleFontSize(15),
  },
  exportButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 213, 0.4)', // outline-variant
    gap: 6,
  },
  exportButtonText: {
    color: '#003a8c', // primary
    fontWeight: '700',
    fontSize: scaleFontSize(14),
  },
  chipScrollContainer: {
    marginBottom: 16,
  },
  chipScroll: {
    maxHeight: 52,
  },
  chipContainer: {
    paddingHorizontal: 24,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    backgroundColor: '#f6f3f2', // surface-container-low
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: '#003a8c', // primary
  },
  chipText: {
    fontSize: scaleFontSize(13),
    fontWeight: '600',
    color: '#434653',
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  progress: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#f6f3f2',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#003a8c',
    borderRadius: 4,
  },
  progressText: {
    fontSize: scaleFontSize(13),
    color: '#434653',
    fontWeight: '600',
  },
  currentTestText: {
    fontSize: scaleFontSize(12),
    color: '#737784',
    marginTop: 4,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#ffffff', // surface-container-lowest
    gap: 16,
    shadowColor: '#1b1b1c',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 2,
  },
  summaryDetails: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: '700',
    color: '#1b1b1c',
    marginBottom: 4,
  },
  summaryStats: {
    fontSize: scaleFontSize(14),
    color: '#434653',
  },
  sectionTitle: {
    fontSize: scaleFontSize(14),
    fontWeight: '700',
    color: '#737784',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 24,
    marginTop: 8,
    marginBottom: 12,
  },
  resultRow: {
    marginHorizontal: 24,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#ffffff', // surface-container-lowest
    shadowColor: '#1b1b1c',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 1,
  },
  resultRowFailed: {
    borderLeftWidth: 4,
    borderLeftColor: '#ba1a1a', // error
  },
  resultRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resultRowText: {
    flex: 1,
  },
  resultName: {
    fontSize: scaleFontSize(15),
    fontWeight: '600',
    color: '#1b1b1c',
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#f6f3f2',
  },
  categoryBadgeText: {
    fontSize: scaleFontSize(11),
    fontWeight: '600',
    color: '#434653',
    textTransform: 'capitalize',
  },
  durationText: {
    fontSize: scaleFontSize(12),
    color: '#737784',
  },
  errorContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#ffdad6', // error-container
  },
  errorLabel: {
    fontSize: scaleFontSize(12),
    fontWeight: '700',
    color: '#93000a',
    marginBottom: 4,
    marginTop: 8,
  },
  errorText: {
    fontSize: scaleFontSize(13),
    color: '#410002', // on-error-container
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  stackScroll: {
    maxHeight: 200,
    marginTop: 4,
  },
  stackText: {
    fontSize: scaleFontSize(11),
    color: '#410002',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 16,
  },
  passedDetail: {
    marginTop: 12,
  },
  passedDetailText: {
    fontSize: scaleFontSize(13),
    color: '#006511',
    fontWeight: '500',
  },
});
