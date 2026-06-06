import React, {useState, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';
import {
  glossary,
  searchGlossary,
  getTermsByCategory,
  GlossaryTerm,
} from '../utils/glossary';
import {MIN_TOUCH_TARGET_SIZE} from '../utils/accessibility';
import {scaleFontSize} from '../utils/theme';

// Hoisted out of the component body — these never change between renders.
const CATEGORIES = [
  {id: 'all', label: 'Todos', value: null},
  {id: 'identity', label: 'Identidade', value: 'identity'},
  {id: 'cryptography', label: 'Criptografia', value: 'cryptography'},
  {id: 'credential', label: 'Credenciais', value: 'credential'},
  {id: 'protocol', label: 'Protocolos', value: 'protocol'},
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  identity: '#003a8c',
  cryptography: '#745b00',
  credential: '#006511',
  protocol: '#1351b4',
};

const CATEGORY_LABELS: Record<string, string> = {
  identity: 'IDENTIDADE',
  cryptography: 'CRIPTOGRAFIA',
  credential: 'AUTENTICAÇÃO',
  protocol: 'INFRAESTRUTURA',
};

const CATEGORY_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  identity: 'fingerprint',
  cryptography: 'lock',
  credential: 'verified-user',
  protocol: 'settings-ethernet',
};

const GlossaryScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = CATEGORIES;

  // Filter terms based on search and category. Memoised so we don't sort
  // and reallocate on every keystroke when the query hasn't changed.
  const filteredTerms = useMemo<GlossaryTerm[]>(() => {
    let terms: GlossaryTerm[] = glossary;
    if (selectedCategory) {
      terms = getTermsByCategory(selectedCategory as any);
    }
    if (searchQuery.trim()) {
      terms = searchGlossary(searchQuery);
    }
    return [...terms].sort((a, b) => a.term.localeCompare(b.term));
  }, [searchQuery, selectedCategory]);

  return (
    <View style={styles.container}>
      {/* Editorial Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Glossário</Text>
        <Text style={styles.subtitle}>
          Terminologia oficial para a arquitetura de Identidade Autossoberana
          (SSI).
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={24} color="#434653" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar termos técnicos..."
          placeholderTextColor="#737784"
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessible={true}
          accessibilityLabel="Campo de busca de termos"
          accessibilityHint="Digite para buscar termos no glossário"
        />
      </View>

      {/* Category Filter */}
      <View style={styles.categoryScrollContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContainer}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryButton,
                selectedCategory === cat.value && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory(cat.value)}
              accessible={true}
              accessibilityLabel={`Filtrar por categoria ${cat.label}`}
              accessibilityRole="button"
              accessibilityState={{selected: selectedCategory === cat.value}}>
              <Text
                style={[
                  styles.categoryButtonText,
                  selectedCategory === cat.value &&
                    styles.categoryButtonTextActive,
                ]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Terms List */}
      <ScrollView style={styles.termsList} contentContainerStyle={styles.termsListContent}>
        {filteredTerms.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="search-off" size={64} color="#e5e2e1" />
            <Text style={styles.emptyStateText}>
              Nenhum termo encontrado
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Tente ajustar sua busca ou filtro
            </Text>
          </View>
        ) : (
          filteredTerms.map((term, index) => (
            <View
              key={index}
              style={styles.termCard}
              accessible={true}
              accessibilityLabel={`Termo: ${term.term}`}
              accessibilityHint={term.definition}
              accessibilityRole="text">
              {/* Term Header */}
              <View style={styles.termHeader}>
                <Text style={styles.termTitle}>{term.term}</Text>
                <MaterialIcons
                  name={CATEGORY_ICONS[term.category] || 'article'}
                  size={24}
                  color={CATEGORY_COLORS[term.category] || '#737784'}
                  style={styles.termIcon}
                />
              </View>

              {/* Category Badge */}
              <View
                style={[
                  styles.categoryBadge,
                  {
                    backgroundColor: '#f6f3f2', // surface-container-low
                  },
                ]}>
                <Text style={styles.categoryBadgeText}>
                  {CATEGORY_LABELS[term.category] || term.category.toUpperCase()}
                </Text>
              </View>

              {/* Definition */}
              <Text style={styles.termDefinition}>{term.definition}</Text>
            </View>
          ))
        )}
      </ScrollView>
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
    fontSize: scaleFontSize(32),
    fontWeight: '800',
    color: '#1b1b1c', // on-surface
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: scaleFontSize(15),
    color: '#434653', // on-surface-variant
    lineHeight: 22,
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: '#e5e2e1', // surface-container-highest
    borderRadius: 24, // rounded-full
    paddingHorizontal: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: scaleFontSize(16),
    color: '#1b1b1c',
    paddingVertical: 14,
    minHeight: MIN_TOUCH_TARGET_SIZE,
    // No border - per DESIGN.md
  },
  // Category Filter
  categoryScrollContainer: {
    marginBottom: 12,
  },
  categoryScroll: {
    maxHeight: 52,
  },
  categoryContainer: {
    paddingHorizontal: 24,
    paddingBottom: 8,
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#f6f3f2', // surface-container-low
    minHeight: MIN_TOUCH_TARGET_SIZE,
    justifyContent: 'center',
  },
  categoryButtonActive: {
    backgroundColor: '#003a8c', // primary
  },
  categoryButtonText: {
    fontSize: scaleFontSize(14),
    color: '#434653',
    fontWeight: '600',
  },
  categoryButtonTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  // Terms List
  termsList: {
    flex: 1,
  },
  termsListContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  termCard: {
    backgroundColor: '#ffffff', // surface-container-lowest
    borderRadius: 16,
    padding: 24,
    marginBottom: 12,
    // Ambient shadow
    shadowColor: '#1b1b1c',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 2,
  },
  termHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  termTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: '800',
    color: '#003a8c', // primary
    flex: 1,
    marginRight: 12,
    letterSpacing: -0.3,
  },
  termIcon: {
    marginTop: 2,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 16,
  },
  categoryBadgeText: {
    fontSize: scaleFontSize(10),
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#434653', // outline-ish
  },
  termDefinition: {
    fontSize: scaleFontSize(15),
    color: '#1b1b1c', // on-surface
    lineHeight: scaleFontSize(22),
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    marginTop: 32,
  },
  emptyStateText: {
    fontSize: scaleFontSize(18),
    fontWeight: '700',
    color: '#434653',
    marginBottom: 8,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: scaleFontSize(14),
    color: '#737784',
    textAlign: 'center',
  },
});

export default GlossaryScreen;
