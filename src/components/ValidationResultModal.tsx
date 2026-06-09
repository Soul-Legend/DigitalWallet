import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';
import {ValidationResult, Scenario} from '../types';

interface ValidationResultModalProps {
  visible: boolean;
  onClose: () => void;
  result: ValidationResult | null;
  scenario: Scenario | null;
}

const ValidationResultModal: React.FC<ValidationResultModalProps> = ({
  visible,
  onClose,
  result,
  scenario,
}) => {
  if (!result) return null;

  const renderContent = () => {
    if (!result.valid) {
      return (
        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>Erros de Validação</Text>
          {result.errors?.map((err, idx) => (
            <Text key={idx} style={styles.errorText}>
              • {err}
            </Text>
          ))}
        </View>
      );
    }

    // For AnonCreds/ZKP with predicates
    if (scenario?.type === 'age_verification' || scenario?.type === 'elections') {
      return (
        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>Resultado da Prova ZKP</Text>
          <View style={styles.attributeRow}>
            <Text style={styles.attributeLabel}>Condições Satisfeitas:</Text>
            <Text style={styles.attributeValue}>
              {result.predicates_satisfied ? 'Sim' : 'Não'}
            </Text>
          </View>
          {result.nullifier_check && (
            <View style={styles.attributeRow}>
              <Text style={styles.attributeLabel}>Verificação de Duplicidade:</Text>
              <Text style={styles.attributeValue}>
                {result.nullifier_check === 'new' ? 'Voto Inédito' : 'Voto Duplicado'}
              </Text>
            </View>
          )}
        </View>
      );
    }

    // For SD-JWT / Selective Disclosure
    if (result.verified_attributes && Object.keys(result.verified_attributes).length > 0) {
      return (
        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>Dados Requisitados e Validados</Text>
          {Object.entries(result.verified_attributes).map(([key, value]) => (
            <View key={key} style={styles.attributeRow}>
              <Text style={styles.attributeLabel}>{key.replace(/_/g, ' ')}:</Text>
              <Text style={styles.attributeValue}>
                {typeof value === 'boolean'
                  ? value
                    ? 'Sim'
                    : 'Não'
                  : String(value)}
              </Text>
            </View>
          ))}
        </View>
      );
    }

    return (
      <View style={styles.contentSection}>
        <Text style={styles.successMessage}>
          Apresentação válida, mas nenhum dado adicional foi revelado.
        </Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: result.valid
                    ? '#8ffb85'
                    : '#ffdad6',
                },
              ]}>
              <MaterialIcons
                name={result.valid ? 'verified' : 'cancel'}
                size={32}
                color={result.valid ? '#002202' : '#93000a'}
              />
            </View>
            <Text
              style={[
                styles.title,
                {
                  color: result.valid ? '#006511' : '#ba1a1a',
                },
              ]}>
              {result.valid ? 'Apresentação Válida' : 'Apresentação Inválida'}
            </Text>
          </View>

          <ScrollView style={styles.scrollArea}>
            {result.trust_chain_valid !== undefined && (
              <View style={styles.trustChainSection}>
                <MaterialIcons
                  name={result.trust_chain_valid ? 'link' : 'link-off'}
                  size={20}
                  color={result.trust_chain_valid ? '#006511' : '#ba1a1a'}
                />
                <Text
                  style={[
                    styles.trustChainText,
                    {
                      color: result.trust_chain_valid ? '#006511' : '#ba1a1a',
                    },
                  ]}>
                  {result.trust_chain_valid
                    ? 'Cadeia de confiança verificada'
                    : 'Emissor fora da cadeia de confiança'}
                </Text>
              </View>
            )}

            {renderContent()}
          </ScrollView>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default ValidationResultModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  scrollArea: {
    marginBottom: 24,
  },
  trustChainSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f6f3f2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  trustChainText: {
    fontSize: 15,
    fontWeight: '600',
  },
  contentSection: {
    backgroundColor: '#f6f3f2',
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#003a8c',
    marginBottom: 12,
  },
  attributeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e2e1',
  },
  attributeLabel: {
    fontSize: 14,
    color: '#434653',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  attributeValue: {
    fontSize: 14,
    color: '#1b1b1c',
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  errorText: {
    fontSize: 14,
    color: '#ba1a1a',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 14,
    color: '#434653',
    fontStyle: 'italic',
  },
  closeButton: {
    backgroundColor: '#003a8c',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
