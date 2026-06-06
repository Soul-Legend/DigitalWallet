import React from 'react';
import {View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';
import {TrustedIssuer} from '../types';
import {scaleFontSize} from '../utils/theme';

interface TrustChainSectionProps {
  expanded: boolean;
  onToggleExpanded: () => void;
  trustedIssuers: TrustedIssuer[];
  isChainLoading: boolean;
  childDid: string;
  onChildDidChange: (text: string) => void;
  childName: string;
  onChildNameChange: (text: string) => void;
  selectedParentDid: string | null;
  onSelectParent: (did: string | null) => void;
  onInitializeRoot: () => void;
  onRegisterChild: () => void;
}

const TrustChainSection: React.FC<TrustChainSectionProps> = ({
  expanded,
  onToggleExpanded,
  trustedIssuers,
  isChainLoading,
  childDid,
  onChildDidChange,
  childName,
  onChildNameChange,
  selectedParentDid,
  onSelectParent,
  onInitializeRoot,
  onRegisterChild,
}) => {
  return (
    <View style={styles.section}>
      <TouchableOpacity style={styles.chainHeader} onPress={onToggleExpanded} activeOpacity={0.7}>
        <View style={styles.headerLeft}>
          <MaterialIcons name="link" size={24} color="#003a8c" />
          <Text style={styles.sectionTitle}>Cadeia de Confiança</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.chainBadge}>
            <Text style={styles.chainBadgeText}>{trustedIssuers.length}</Text>
          </View>
          <MaterialIcons
            name={expanded ? 'expand-less' : 'expand-more'}
            size={24}
            color="#003a8c"
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.expandedContent}>
          {trustedIssuers.length === 0 ? (
            <View style={styles.chainEmptyState}>
              <MaterialIcons name="lan" size={48} color="#e5e2e1" style={styles.emptyIcon} />
              <Text style={styles.chainEmptyText}>
                Nenhuma cadeia de confiança configurada. Inicialize a âncora raiz para começar.
              </Text>
              <TouchableOpacity
                style={styles.chainButton}
                onPress={onInitializeRoot}
                disabled={isChainLoading}>
                <MaterialIcons name="account-balance" size={18} color="#ffffff" />
                <Text style={styles.chainButtonText}>
                  {isChainLoading ? 'Inicializando...' : 'Inicializar Âncora Raiz'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Chain Visualization */}
              <View style={styles.chainList}>
                {trustedIssuers.map((issuer, idx) => (
                  <View
                    key={issuer.did}
                    style={[
                      styles.chainIssuerCard,
                      issuer.parentDid === null && styles.chainRootCard,
                    ]}>
                    <View style={styles.chainIssuerHeader}>
                      <View style={styles.chainIssuerIconContainer}>
                        <MaterialIcons
                          name={issuer.parentDid === null ? 'account-balance' : 'domain'}
                          size={24}
                          color="#003a8c"
                        />
                      </View>
                      <View style={styles.chainIssuerInfo}>
                        <Text style={styles.chainIssuerName}>
                          {issuer.name}
                        </Text>
                        <Text style={styles.chainIssuerDid} numberOfLines={1}>
                          {issuer.did}
                        </Text>
                      </View>
                    </View>
                    {issuer.parentDid && (
                      <View style={styles.chainParentRow}>
                        <MaterialIcons name="subdirectory-arrow-right" size={16} color="#737784" />
                        <Text style={styles.chainParentLabel}>
                          assinado por: {issuer.parentDid}
                        </Text>
                      </View>
                    )}
                    {idx < trustedIssuers.length - 1 && issuer.parentDid === null && (
                      <View style={styles.chainConnector}>
                        <View style={styles.connectorLine} />
                      </View>
                    )}
                  </View>
                ))}
              </View>

              {/* Register Child Issuer */}
              <View style={styles.chainRegisterSection}>
                <Text style={styles.chainRegisterTitle}>
                  Registrar Emissor Filho
                </Text>

                <Text style={styles.parentSelectorLabel}>Emissor Pai:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.parentSelectorRow}>
                  {trustedIssuers.map(issuer => (
                    <TouchableOpacity
                      key={issuer.did}
                      style={[
                        styles.parentChip,
                        selectedParentDid === issuer.did && styles.parentChipSelected,
                      ]}
                      onPress={() => onSelectParent(
                        selectedParentDid === issuer.did ? null : issuer.did,
                      )}>
                      <MaterialIcons
                        name={issuer.parentDid === null ? 'account-balance' : 'domain'}
                        size={14}
                        color={selectedParentDid === issuer.did ? '#ffffff' : '#434653'}
                        style={styles.parentChipIcon}
                      />
                      <Text
                        style={[
                          styles.parentChipText,
                          selectedParentDid === issuer.did && styles.parentChipTextSelected,
                        ]}
                        numberOfLines={1}>
                        {issuer.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {selectedParentDid ? (
                  <Text style={styles.parentSelectedHint}>
                    Pai selecionado: {selectedParentDid}
                  </Text>
                ) : (
                  <Text style={styles.parentSelectedHint}>
                    Nenhum pai selecionado — usará a âncora raiz
                  </Text>
                )}

                <TextInput
                  style={[styles.input, {marginTop: 12}]}
                  value={childDid}
                  onChangeText={onChildDidChange}
                  placeholder="DID do emissor (ex: did:web:dept.ufsc.br)"
                  placeholderTextColor="#737784"
                  editable={!isChainLoading}
                />
                <TextInput
                  style={[styles.input, {marginTop: 12}]}
                  value={childName}
                  onChangeText={onChildNameChange}
                  placeholder="Nome do emissor (ex: CAGR)"
                  placeholderTextColor="#737784"
                  editable={!isChainLoading}
                />
                <TouchableOpacity
                  style={[styles.chainButton, {marginTop: 16}]}
                  onPress={onRegisterChild}
                  disabled={isChainLoading || !childDid.trim() || !childName.trim()}>
                  <MaterialIcons name="add-circle-outline" size={18} color="#ffffff" />
                  <Text style={styles.chainButtonText}>
                    {isChainLoading ? 'Registrando...' : 'Registrar Emissor'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#ffffff', // surface-container-lowest
    borderRadius: 16,
    marginBottom: 16,
    // Ambient shadow
    shadowColor: '#1b1b1c',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 2,
    overflow: 'hidden',
  },
  chainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f6f3f2', // surface-container-low
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: '700',
    color: '#003a8c', // primary
  },
  chainBadge: {
    backgroundColor: '#d9e2ff', // primary-fixed
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chainBadgeText: {
    fontSize: scaleFontSize(12),
    color: '#001a41', // on-primary-fixed
    fontWeight: '700',
  },
  expandedContent: {
    padding: 20,
  },
  chainEmptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  chainEmptyText: {
    fontSize: scaleFontSize(14),
    color: '#434653',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  chainButton: {
    backgroundColor: '#003a8c', // primary
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  chainButtonText: {
    color: '#ffffff',
    fontSize: scaleFontSize(14),
    fontWeight: '700',
  },
  chainList: {
    marginBottom: 16,
  },
  chainIssuerCard: {
    backgroundColor: '#fcf9f8', // surface
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#b8cbff', // primary-container
  },
  chainRootCard: {
    borderLeftColor: '#003a8c', // primary
    backgroundColor: '#f6f3f2', // surface-container-low
  },
  chainIssuerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chainIssuerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#d9e2ff', // primary-fixed
    alignItems: 'center',
    justifyContent: 'center',
  },
  chainIssuerInfo: {
    flex: 1,
  },
  chainIssuerName: {
    fontSize: scaleFontSize(15),
    fontWeight: '700',
    color: '#1b1b1c',
  },
  chainIssuerDid: {
    fontSize: scaleFontSize(11),
    color: '#434653',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  chainParentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 52,
    gap: 4,
  },
  chainParentLabel: {
    fontSize: scaleFontSize(11),
    color: '#737784',
    fontFamily: 'monospace',
  },
  chainConnector: {
    alignItems: 'center',
    marginVertical: 4,
  },
  connectorLine: {
    width: 2,
    height: 16,
    backgroundColor: '#e5e2e1',
  },
  chainRegisterSection: {
    borderTopWidth: 1,
    borderTopColor: '#e5e2e1',
    paddingTop: 20,
    marginTop: 8,
  },
  chainRegisterTitle: {
    fontSize: scaleFontSize(15),
    fontWeight: '700',
    color: '#1b1b1c',
    marginBottom: 16,
  },
  parentSelectorLabel: {
    fontSize: scaleFontSize(13),
    color: '#434653',
    marginBottom: 8,
    fontWeight: '600',
  },
  parentSelectorRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  parentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e5e2e1', // surface-container-highest
    marginRight: 8,
    gap: 6,
  },
  parentChipSelected: {
    backgroundColor: '#003a8c', // primary
  },
  parentChipIcon: {
    marginTop: -1,
  },
  parentChipText: {
    fontSize: scaleFontSize(13),
    color: '#434653',
    fontWeight: '600',
  },
  parentChipTextSelected: {
    color: '#ffffff',
  },
  parentSelectedHint: {
    fontSize: scaleFontSize(11),
    color: '#737784',
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#e5e2e1', // surface-container-highest
    borderRadius: 8,
    padding: 16,
    fontSize: scaleFontSize(14),
    color: '#1b1b1c',
    // No borders
  },
});

export default TrustChainSection;
