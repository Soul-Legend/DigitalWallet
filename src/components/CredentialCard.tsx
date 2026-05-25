import React from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {VerifiableCredential} from '../types';

interface CredentialCardProps {
  credential: VerifiableCredential;
}

const CredentialCard: React.FC<CredentialCardProps> = ({credential}) => {
  const {credentialSubject} = credential;

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatBoolean = (value: boolean): string => {
    return value ? 'Sim' : 'Não';
  };

  const formatArray = (arr: string[]): string => {
    return arr.length > 0 ? arr.join(', ') : 'Nenhum';
  };

  const isActive = credentialSubject.status_matricula === 'Ativo';

  return (
    <View style={styles.card}>
      {/* Top Accent Bar */}
      <View style={styles.accentBar} />

      {/* Header: Icon + Badge */}
      <View style={styles.headerRow}>
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>🎓</Text>
        </View>
        <View style={styles.verifiedBadge}>
          <Text style={styles.verifiedIcon}>✓</Text>
          <Text style={styles.verifiedText}>VERIFICADA</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title}>Carteira de Identidade Acadêmica</Text>
      <Text style={styles.issuer}>
        {credential.issuer || 'Universidade Federal de Santa Catarina (UFSC)'}
      </Text>

      {/* Metadata Grid */}
      <View style={styles.metadataGrid}>
        <View style={styles.metadataItem}>
          <Text style={styles.metadataLabel}>TITULAR</Text>
          <Text style={styles.metadataValue} numberOfLines={1}>
            {credentialSubject.nome_completo}
          </Text>
        </View>
        <View style={styles.metadataItem}>
          <Text style={styles.metadataLabel}>EMISSÃO</Text>
          <Text style={styles.metadataValue}>
            {formatDate(credential.issuanceDate)}
          </Text>
        </View>
      </View>

      {/* Status */}
      <View style={styles.statusRow}>
        <View style={styles.metadataItem}>
          <Text style={styles.metadataLabel}>STATUS ACADÊMICO</Text>
          <View style={styles.statusBadgeRow}>
            <View
              style={[
                styles.statusDot,
                {backgroundColor: isActive ? '#006511' : '#ba1a1a'},
              ]}
            />
            <Text
              style={[
                styles.statusText,
                {color: isActive ? '#006511' : '#ba1a1a'},
              ]}>
              {credentialSubject.status_matricula} ({credentialSubject.curso})
            </Text>
          </View>
        </View>
      </View>

      {/* Expandable Details */}
      <ScrollView style={styles.detailsScroll} nestedScrollEnabled>
        {/* Academic Data */}
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Dados Acadêmicos</Text>
          <View style={styles.detailField}>
            <Text style={styles.detailLabel}>Matrícula</Text>
            <Text style={styles.detailValue}>{credentialSubject.matricula}</Text>
          </View>
          <View style={styles.detailField}>
            <Text style={styles.detailLabel}>Data de Nascimento</Text>
            <Text style={styles.detailValue}>
              {formatDate(credentialSubject.data_nascimento)}
            </Text>
          </View>
          <View style={styles.detailField}>
            <Text style={styles.detailLabel}>CPF</Text>
            <Text style={styles.detailValue}>{credentialSubject.cpf}</Text>
          </View>
        </View>

        {/* Benefits */}
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Benefícios</Text>
          {[
            {label: 'Isenção RU', value: credentialSubject.isencao_ru},
            {label: 'Moradia Estudantil', value: credentialSubject.moradia_estudantil},
            {label: 'Bolsa Estudantil', value: credentialSubject.bolsa_estudantil},
            {label: 'Bolsa Permanência MEC', value: credentialSubject.bolsa_permanencia_mec},
            {label: 'Auxílio Moradia', value: credentialSubject.auxilio_moradia},
            {label: 'Auxílio Creche', value: credentialSubject.auxilio_creche},
          ].map(item => (
            <View key={item.label} style={styles.benefitRow}>
              <Text style={styles.detailLabel}>{item.label}</Text>
              <View
                style={[
                  styles.benefitBadge,
                  {
                    backgroundColor: item.value ? '#8ffb85' : '#e5e2e1',
                  },
                ]}>
                <Text
                  style={[
                    styles.benefitBadgeText,
                    {color: item.value ? '#002202' : '#434653'},
                  ]}>
                  {formatBoolean(item.value)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Access Permissions */}
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Permissões de Acesso</Text>
          <View style={styles.detailField}>
            <Text style={styles.detailLabel}>Laboratórios</Text>
            <Text style={styles.detailValue}>
              {formatArray(credentialSubject.acesso_laboratorios)}
            </Text>
          </View>
          <View style={styles.detailField}>
            <Text style={styles.detailLabel}>Prédios</Text>
            <Text style={styles.detailValue}>
              {formatArray(credentialSubject.acesso_predios)}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.presentButton} activeOpacity={0.8}>
          <Text style={styles.presentButtonIcon}>🔲</Text>
          <Text style={styles.presentButtonText}>Apresentar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.copyButton} activeOpacity={0.8}>
          <Text style={styles.copyButtonIcon}>📋</Text>
        </TouchableOpacity>
      </View>

      {/* DID Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerLabel}>DID do Titular</Text>
        <Text style={styles.footerDid} numberOfLines={1}>
          {credentialSubject.id}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff', // surface-container-lowest
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 8,
    // Ambient shadow - no borders
    shadowColor: '#1b1b1c',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 2,
    maxHeight: 600,
  },
  accentBar: {
    height: 3,
    backgroundColor: '#fecc03', // secondary-container (yellow accent)
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#eae7e7', // surface-container-high
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 28,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 101, 17, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  verifiedIcon: {
    fontSize: 12,
    color: '#006511', // tertiary-container
    fontWeight: 'bold',
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#006511',
    letterSpacing: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1b1b1c', // on-surface
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  issuer: {
    fontSize: 14,
    color: '#434653', // on-surface-variant
    fontWeight: '600',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  metadataGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 24,
    borderTopWidth: 0, // No borders per DESIGN.md
    // Using top spacing + color shift instead
    backgroundColor: '#fcf9f8',
    paddingBottom: 12,
  },
  metadataItem: {
    flex: 1,
  },
  metadataLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#737784', // outline
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  metadataValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1b1b1c', // on-surface
  },
  statusRow: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fcf9f8',
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailsScroll: {
    maxHeight: 200,
    paddingHorizontal: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#003a8c',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  detailField: {
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#737784',
    marginBottom: 2,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1b1b1c',
    fontWeight: '500',
  },
  benefitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  benefitBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  presentButton: {
    flex: 1,
    backgroundColor: '#fecc03', // secondary-container
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  presentButtonIcon: {
    fontSize: 14,
  },
  presentButtonText: {
    color: '#6e5700', // on-secondary-container
    fontSize: 14,
    fontWeight: '600',
  },
  copyButton: {
    backgroundColor: '#eae7e7', // surface-container-high
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyButtonIcon: {
    fontSize: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 8,
  },
  footerLabel: {
    fontSize: 10,
    color: '#737784',
    marginBottom: 2,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  footerDid: {
    fontSize: 11,
    color: '#434653',
    fontFamily: 'monospace',
  },
});

export default CredentialCard;
