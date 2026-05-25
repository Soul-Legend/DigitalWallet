import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {LogEntry as LogEntryType} from '../types';

interface LogEntryProps {
  log: LogEntryType;
}

const LogEntry: React.FC<LogEntryProps> = ({log}) => {
  const [expanded, setExpanded] = useState(false);

  const formatTimestamp = (date: Date): string => {
    return new Date(date).toLocaleString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getOperationLabel = (operation: LogEntryType['operation']): string => {
    const labels: Record<LogEntryType['operation'], string> = {
      key_generation: 'Geração de DID',
      credential_issuance: 'Assinatura SD-JWT',
      presentation_creation: 'Criação de Apresentação',
      verification: 'Verificação',
      hash_computation: 'Computação de Hash',
      zkp_generation: 'Geração de ZKP',
      trust_chain_init: 'Cadeia de Confiança',
      trust_chain_register: 'Registro de Emissor',
      error: 'Erro',
    };
    return labels[operation];
  };

  const getOperationIcon = (operation: LogEntryType['operation']): string => {
    const icons: Record<LogEntryType['operation'], string> = {
      key_generation: '🔑',
      credential_issuance: '🔏',
      presentation_creation: '📤',
      verification: '✅',
      hash_computation: '🔢',
      zkp_generation: '🔐',
      trust_chain_init: '🔗',
      trust_chain_register: '📋',
      error: '⚠️',
    };
    return icons[operation];
  };

  const getOperationDescription = (operation: LogEntryType['operation']): string => {
    const descriptions: Record<LogEntryType['operation'], string> = {
      key_generation: 'Novo par de chaves criptográficas gerado localmente.',
      credential_issuance: 'Autenticação biométrica validada com sucesso.',
      presentation_creation: 'Apresentação verificável criada.',
      verification: 'Assinaturas criptográficas verificadas.',
      hash_computation: 'Hash criptográfico computado.',
      zkp_generation: 'Prova de conhecimento zero gerada.',
      trust_chain_init: 'Cadeia de confiança inicializada.',
      trust_chain_register: 'Emissor registrado na cadeia.',
      error: 'Erro durante operação criptográfica.',
    };
    return descriptions[operation];
  };

  const getModuleLabel = (module: LogEntryType['module']): string => {
    const labels: Record<LogEntryType['module'], string> = {
      emissor: 'Emissor',
      titular: 'Titular',
      verificador: 'Verificador',
    };
    return labels[module];
  };

  const truncateHash = (hash: string, length: number = 16): string => {
    if (hash.length <= length) {return hash;}
    return `${hash.substring(0, length)}...`;
  };

  const obfuscateCPF = (cpf: string): string => {
    if (cpf.length < 4) {return '***';}
    return `***${cpf.slice(-4)}`;
  };

  const obfuscateName = (name: string): string => {
    const parts = name.split(' ');
    if (parts.length === 0) {return '***';}
    return `${parts[0]} ***`;
  };

  const renderDetails = () => {
    const {details} = log;

    return (
      <View style={styles.detailsContainer}>
        {details.algorithm && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Algoritmo</Text>
            <Text style={styles.detailValue}>{details.algorithm}</Text>
          </View>
        )}

        {details.key_size && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tamanho da Chave</Text>
            <Text style={styles.detailValue}>{details.key_size} bits</Text>
          </View>
        )}

        {details.did_method && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Método DID</Text>
            <Text style={styles.detailValue}>{details.did_method}</Text>
          </View>
        )}

        {details.hash_output && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Hash</Text>
            <Text style={styles.detailValueMono}>
              {truncateHash(details.hash_output)}
            </Text>
          </View>
        )}

        {details.verification_result !== undefined && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Resultado da Validação</Text>
            <Text
              style={[
                styles.detailValue,
                details.verification_result
                  ? styles.successText
                  : styles.errorText,
              ]}>
              {details.verification_result ? 'Válido' : 'Inválido'}
            </Text>
          </View>
        )}

        {details.parameters && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Parâmetros</Text>
            <View style={styles.parametersContainer}>
              {Object.entries(details.parameters).map(([key, value]) => {
                let displayValue = value;

                // Obfuscate sensitive data
                if (key === 'cpf' && typeof value === 'string') {
                  displayValue = obfuscateCPF(value);
                } else if (key === 'nome_completo' && typeof value === 'string') {
                  displayValue = obfuscateName(value);
                } else if (typeof value === 'object') {
                  displayValue = JSON.stringify(value, null, 2);
                }

                return (
                  <View key={key} style={styles.parameterRow}>
                    <Text style={styles.parameterKey}>{key}:</Text>
                    <Text style={styles.parameterValue}>
                      {String(displayValue)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {details.stack_trace && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Stack Trace</Text>
            <Text style={styles.stackTrace}>{details.stack_trace}</Text>
          </View>
        )}
      </View>
    );
  };

  const isSuccess = log.success;

  return (
    <TouchableOpacity
      style={[styles.container, !isSuccess && styles.errorCardContainer]}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}>
      {/* Left accent border is handled by container style */}

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {/* Status Icon Circle */}
          <View
            style={[
              styles.statusCircle,
              {backgroundColor: isSuccess ? '#8ffb85' : '#ffdad6'},
            ]}>
            <Text style={styles.statusCircleIcon}>
              {isSuccess ? '✓' : '!'}
            </Text>
          </View>

          {/* Content */}
          <View style={styles.headerContent}>
            <Text style={styles.operationText}>
              {getOperationLabel(log.operation)}
            </Text>
            <View style={styles.descriptionRow}>
              <Text style={styles.operationIconSmall}>
                {getOperationIcon(log.operation)}
              </Text>
              <Text
                style={[
                  styles.descriptionText,
                  !isSuccess && styles.errorDescriptionText,
                ]}
                numberOfLines={2}>
                {log.error
                  ? log.error.message
                  : getOperationDescription(log.operation)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Footer: Timestamp + Details link */}
      <View style={styles.footer}>
        <Text style={styles.timestamp}>{formatTimestamp(log.timestamp)}</Text>
        <TouchableOpacity
          style={styles.detailsLink}
          onPress={() => setExpanded(!expanded)}>
          <Text style={styles.detailsLinkText}>
            {expanded ? 'Ocultar' : 'Ver Detalhes'}
          </Text>
          <Text style={styles.detailsLinkArrow}>
            {expanded ? '▲' : '›'}
          </Text>
        </TouchableOpacity>
      </View>

      {expanded && renderDetails()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff', // surface-container-lowest
    borderRadius: 12,
    padding: 20,
    marginVertical: 6,
    marginHorizontal: 24,
    // Left accent border for success
    borderLeftWidth: 4,
    borderLeftColor: '#006511', // tertiary-container (green)
    // Ambient shadow
    shadowColor: '#1b1b1c',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 2,
  },
  errorCardContainer: {
    borderLeftColor: '#ba1a1a', // error
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: 14,
  },
  statusCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCircleIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1b1b1c',
  },
  headerContent: {
    flex: 1,
  },
  operationText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1b1b1c', // on-surface
    marginBottom: 4,
  },
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  operationIconSmall: {
    fontSize: 13,
    marginTop: 2,
  },
  descriptionText: {
    fontSize: 13,
    color: '#434653', // on-surface-variant
    lineHeight: 18,
    flex: 1,
  },
  errorDescriptionText: {
    color: '#ba1a1a', // error
  },
  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 13,
    color: '#737784', // outline
    fontWeight: '500',
  },
  detailsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  detailsLinkText: {
    fontSize: 14,
    color: '#003a8c', // primary
    fontWeight: '600',
  },
  detailsLinkArrow: {
    fontSize: 14,
    color: '#003a8c',
    fontWeight: 'bold',
  },
  // Details (expanded)
  detailsContainer: {
    marginTop: 16,
    paddingTop: 16,
    backgroundColor: '#f6f3f2', // surface-container-low
    borderRadius: 8,
    padding: 16,
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 11,
    color: '#737784',
    marginBottom: 4,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    color: '#1b1b1c',
    fontWeight: '500',
  },
  detailValueMono: {
    fontSize: 13,
    color: '#1b1b1c',
    fontFamily: 'monospace',
  },
  successText: {
    color: '#006511',
    fontWeight: 'bold',
  },
  errorText: {
    color: '#ba1a1a',
    fontWeight: 'bold',
  },
  parametersContainer: {
    backgroundColor: '#e5e2e1', // surface-container-highest
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  parameterRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  parameterKey: {
    fontSize: 12,
    color: '#737784',
    fontWeight: '600',
    marginRight: 8,
  },
  parameterValue: {
    fontSize: 12,
    color: '#1b1b1c',
    flex: 1,
  },
  stackTrace: {
    fontSize: 11,
    color: '#434653',
    fontFamily: 'monospace',
    backgroundColor: '#e5e2e1',
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  },
});

export default LogEntry;
