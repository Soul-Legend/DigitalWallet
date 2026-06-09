import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';
import LoadingIndicator from '../components/LoadingIndicator';
import SuccessMessage from '../components/SuccessMessage';
import ErrorMessage from '../components/ErrorMessage';
import TrustChainSection from '../components/TrustChainSection';
import {useIssuerState} from './hooks/useIssuerState';

const IssuerScreen: React.FC = () => {
  const {
    formData,
    updateField,
    errors,
    isLoading,
    successMessage,
    generalError,
    credentialFormat,
    setCredentialFormat,
    issuedCredential,
    trustedIssuers,
    childDid,
    setChildDid,
    childName,
    setChildName,
    selectedParentDid,
    setSelectedParentDid,
    isChainLoading,
    chainExpanded,
    handleInitializeRoot,
    handleRegisterChild,
    handleIssueCredential,
    handleCopyCredential,
    toggleChainExpanded,
    labInput,
    setLabInput,
    handleAddLab,
    handleRemoveLab,
    buildingInput,
    setBuildingInput,
    handleAddBuilding,
    handleRemoveBuilding,
  } = useIssuerState();

  const benefits = [
    {
      key: 'isencao_ru',
      label: 'Restaurante Universitário',
      subtitle: 'Acesso subsidiado (RU)',
      value: formData.isencao_ru,
    },
    {
      key: 'moradia_estudantil',
      label: 'Moradia Estudantil',
      subtitle: 'Acesso aos blocos',
      value: formData.moradia_estudantil,
    },
    {
      key: 'bolsa_estudantil',
      label: 'Biblioteca Universitária',
      subtitle: 'Empréstimos (BU)',
      value: formData.bolsa_estudantil,
    },
    {
      key: 'alojamento_indigena',
      label: 'Alojamento Indígena',
      subtitle: 'Programa de apoio',
      value: formData.alojamento_indigena,
    },
    {
      key: 'auxilio_creche',
      label: 'Auxílio Creche',
      subtitle: 'Programa assistencial',
      value: formData.auxilio_creche,
    },
    {
      key: 'auxilio_moradia',
      label: 'Auxílio Moradia',
      subtitle: 'Programa habitacional',
      value: formData.auxilio_moradia,
    },
    {
      key: 'bolsa_permanencia_mec',
      label: 'Bolsa Permanência MEC',
      subtitle: 'Programa federal',
      value: formData.bolsa_permanencia_mec,
    },
    {
      key: 'paiq',
      label: 'PAIQ',
      subtitle: 'Programa institucional',
      value: formData.paiq,
    },
    {
      key: 'isencao_esporte',
      label: 'Isenção Esporte',
      subtitle: 'Centro desportivo',
      value: formData.isencao_esporte,
    },
    {
      key: 'isencao_idiomas',
      label: 'Isenção Idiomas',
      subtitle: 'Programa de idiomas',
      value: formData.isencao_idiomas,
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Institution Label */}
        <Text style={styles.institutionLabel}>
          UNIVERSIDADE FEDERAL DE SANTA CATARINA
        </Text>

        {/* Title */}
        <Text style={styles.title}>Nova Credencial Acadêmica</Text>

        {generalError && <ErrorMessage message={generalError} />}
        {successMessage && <SuccessMessage message={successMessage} />}

        {/* Trust Chain Management */}
        <TrustChainSection
          expanded={chainExpanded}
          onToggleExpanded={toggleChainExpanded}
          trustedIssuers={trustedIssuers}
          isChainLoading={isChainLoading}
          childDid={childDid}
          onChildDidChange={setChildDid}
          childName={childName}
          onChildNameChange={setChildName}
          selectedParentDid={selectedParentDid}
          onSelectParent={setSelectedParentDid}
          onInitializeRoot={handleInitializeRoot}
          onRegisterChild={handleRegisterChild}
        />

        {/* Credential Format Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Formato da Credencial</Text>
          <View style={styles.formatContainer}>
            <TouchableOpacity
              style={[
                styles.formatButton,
                credentialFormat === 'sd-jwt' && styles.formatButtonActive,
              ]}
              onPress={() => setCredentialFormat('sd-jwt')}
              disabled={isLoading}>
              <Text
                style={[
                  styles.formatButtonText,
                  credentialFormat === 'sd-jwt' &&
                    styles.formatButtonTextActive,
                ]}>
                SD-JWT
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.formatButton,
                credentialFormat === 'anoncreds' && styles.formatButtonActive,
              ]}
              onPress={() => setCredentialFormat('anoncreds')}
              disabled={isLoading}>
              <Text
                style={[
                  styles.formatButtonText,
                  credentialFormat === 'anoncreds' &&
                    styles.formatButtonTextActive,
                ]}>
                AnonCreds
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Issued Credential Display */}
        {issuedCredential && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Credencial Emitida</Text>
            <Text style={styles.credentialToken} numberOfLines={6}>
              {issuedCredential}
            </Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={handleCopyCredential}>
              <Text style={styles.copyButtonText}>Copiar Token</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Student Data Section */}
        <View style={styles.formCard}>
          <Text style={styles.formCardTitle}>Dados do Aluno</Text>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Nome Completo</Text>
            <TextInput
              style={[styles.input, errors.nome_completo && styles.inputError]}
              value={formData.nome_completo}
              onChangeText={text => updateField('nome_completo', text)}
              placeholder="Ex: Maria Clara Silva"
              placeholderTextColor="#737784"
              editable={!isLoading}
            />
            {errors.nome_completo && (
              <Text style={styles.errorText}>{errors.nome_completo}</Text>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>CPF</Text>
            <TextInput
              style={[styles.input, errors.cpf && styles.inputError]}
              value={formData.cpf}
              onChangeText={text => updateField('cpf', text)}
              placeholder="000.000.000-00"
              placeholderTextColor="#737784"
              keyboardType="numeric"
              editable={!isLoading}
            />
            {errors.cpf && <Text style={styles.errorText}>{errors.cpf}</Text>}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Matrícula (UFSC)</Text>
            <TextInput
              style={[styles.input, errors.matricula && styles.inputError]}
              value={formData.matricula}
              onChangeText={text => updateField('matricula', text)}
              placeholder="Ex: 20241000"
              placeholderTextColor="#737784"
              editable={!isLoading}
            />
            {errors.matricula && (
              <Text style={styles.errorText}>{errors.matricula}</Text>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Curso</Text>
            <TextInput
              style={[styles.input, errors.curso && styles.inputError]}
              value={formData.curso}
              onChangeText={text => updateField('curso', text)}
              placeholder="Selecione o curso..."
              placeholderTextColor="#737784"
              editable={!isLoading}
            />
            {errors.curso && (
              <Text style={styles.errorText}>{errors.curso}</Text>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Status de Matrícula</Text>
            <View style={styles.formatContainer}>
              <TouchableOpacity
                style={[
                  styles.formatButton,
                  formData.status_matricula === 'Ativo' &&
                    styles.formatButtonActive,
                ]}
                onPress={() => updateField('status_matricula', 'Ativo')}
                disabled={isLoading}>
                <Text
                  style={[
                    styles.formatButtonText,
                    formData.status_matricula === 'Ativo' &&
                      styles.formatButtonTextActive,
                  ]}>
                  Ativo
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.formatButton,
                  formData.status_matricula === 'Inativo' &&
                    styles.formatButtonActive,
                ]}
                onPress={() => updateField('status_matricula', 'Inativo')}
                disabled={isLoading}>
                <Text
                  style={[
                    styles.formatButtonText,
                    formData.status_matricula === 'Inativo' &&
                      styles.formatButtonTextActive,
                  ]}>
                  Inativo
                </Text>
              </TouchableOpacity>
            </View>
            {errors.status_matricula && (
              <Text style={styles.errorText}>{errors.status_matricula}</Text>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Data de Nascimento</Text>
            <TextInput
              style={[
                styles.input,
                errors.data_nascimento && styles.inputError,
              ]}
              value={formData.data_nascimento}
              onChangeText={text => updateField('data_nascimento', text)}
              placeholder="AAAA-MM-DD"
              placeholderTextColor="#737784"
              editable={!isLoading}
            />
            {errors.data_nascimento && (
              <Text style={styles.errorText}>{errors.data_nascimento}</Text>
            )}
          </View>
        </View>

        {/* Laboratory Access Section */}
        <View style={styles.benefitsCard}>
          <View style={styles.benefitsHeader}>
            <View style={styles.benefitsIconContainer}>
              <MaterialIcons name="science" size={24} color="#003a8c" />
            </View>
            <Text style={styles.benefitsTitle}>Acesso a Laboratórios</Text>
          </View>
          <Text style={styles.benefitsDescription}>
            Adicione os laboratórios aos quais este aluno tem acesso autorizado.
          </Text>

          <View style={styles.labInputContainer}>
            <TextInput
              style={[styles.input, styles.labInput]}
              value={labInput}
              onChangeText={setLabInput}
              placeholder="Ex: Laboratório de Química Geral"
              placeholderTextColor="#737784"
              editable={!isLoading}
              onSubmitEditing={handleAddLab}
            />
            <TouchableOpacity
              style={styles.labAddButton}
              onPress={handleAddLab}
              disabled={isLoading || !labInput.trim()}>
              <MaterialIcons name="add" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {formData.acesso_laboratorios && formData.acesso_laboratorios.length > 0 && (
            <View style={styles.chipsContainer}>
              {formData.acesso_laboratorios.map((lab, index) => (
                <View key={index} style={styles.chip}>
                  <Text style={styles.chipText}>{lab}</Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveLab(lab)}
                    disabled={isLoading}
                    style={styles.chipRemoveButton}>
                    <MaterialIcons name="close" size={16} color="#434653" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Building Access Section */}
        <View style={styles.benefitsCard}>
          <View style={styles.benefitsHeader}>
            <View style={styles.benefitsIconContainer}>
              <MaterialIcons name="domain" size={24} color="#003a8c" />
            </View>
            <Text style={styles.benefitsTitle}>Acesso a Prédios</Text>
          </View>
          <Text style={styles.benefitsDescription}>
            Adicione os prédios aos quais este aluno tem acesso autorizado.
          </Text>

          <View style={styles.labInputContainer}>
            <TextInput
              style={[styles.input, styles.labInput]}
              value={buildingInput}
              onChangeText={setBuildingInput}
              placeholder="Ex: Prédio da Reitoria"
              placeholderTextColor="#737784"
              editable={!isLoading}
              onSubmitEditing={handleAddBuilding}
            />
            <TouchableOpacity
              style={styles.labAddButton}
              onPress={handleAddBuilding}
              disabled={isLoading || !buildingInput.trim()}>
              <MaterialIcons name="add" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {formData.acesso_predios && formData.acesso_predios.length > 0 && (
            <View style={styles.chipsContainer}>
              {formData.acesso_predios.map((building, index) => (
                <View key={index} style={styles.chip}>
                  <Text style={styles.chipText}>{building}</Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveBuilding(building)}
                    disabled={isLoading}
                    style={styles.chipRemoveButton}>
                    <MaterialIcons name="close" size={16} color="#434653" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Benefits Section */}
        <View style={styles.benefitsCard}>
          <View style={styles.benefitsHeader}>
            <View style={styles.benefitsIconContainer}>
              <MaterialIcons name="stars" size={24} color="#003a8c" />
            </View>
            <Text style={styles.benefitsTitle}>Benefícios</Text>
          </View>
          <Text style={styles.benefitsDescription}>
            Habilite os acessos institucionais que serão vinculados a esta
            credencial SSI.
          </Text>

          {benefits.map(benefit => (
            <View key={benefit.key} style={styles.switchContainer}>
              <View style={styles.switchLabelContainer}>
                <Text style={styles.switchLabel}>{benefit.label}</Text>
                <Text style={styles.switchSubtitle}>{benefit.subtitle}</Text>
              </View>
              <Switch
                value={benefit.value}
                onValueChange={value => updateField(benefit.key as any, value)}
                disabled={isLoading}
                trackColor={{false: '#dcd9d9', true: '#b0c6ff'}}
                thumbColor={benefit.value ? '#003a8c' : '#f6f3f2'}
              />
            </View>
          ))}
        </View>

        {/* Issue Button */}
        <View style={styles.buttonContainer}>
          {isLoading ? (
            <LoadingIndicator message="Emitindo credencial..." />
          ) : (
            <>
              <TouchableOpacity
                style={styles.issueButton}
                onPress={handleIssueCredential}
                disabled={isLoading}>
                <MaterialIcons name="edit-document" size={20} color="#ffffff" />
                <Text style={styles.issueButtonText}>Emitir e Assinar</Text>
              </TouchableOpacity>
              <Text style={styles.disclaimerText}>
                Ao emitir, a credencial será ancorada na blockchain
                institucional.
              </Text>
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fcf9f8', // surface
  },
  content: {
    padding: 24,
  },
  institutionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#003a8c', // primary
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#003a8c', // primary
    marginBottom: 24,
    letterSpacing: -0.8,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    // Ambient shadow
    shadowColor: '#1b1b1c',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1b1b1c',
    marginBottom: 16,
  },
  // Form Card
  formCard: {
    backgroundColor: '#f6f3f2', // surface-container-low
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
  },
  formCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1b1b1c', // on-surface
    marginBottom: 24,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#434653', // on-surface-variant
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#e5e2e1', // surface-container-highest
    borderRadius: 8,
    padding: 16,
    fontSize: 15,
    color: '#1b1b1c',
    // No border - per DESIGN.md "No-Line" rule
  },
  inputError: {
    // Ghost border for error - per DESIGN.md fallback
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.4)', // error at reduced opacity
  },
  errorText: {
    fontSize: 12,
    color: '#ba1a1a', // error
    marginTop: 6,
  },
  formatContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  formatButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#e5e2e1', // surface-container-highest
  },
  formatButtonActive: {
    backgroundColor: '#003a8c', // primary
  },
  formatButtonText: {
    fontSize: 15,
    color: '#434653',
    fontWeight: '600',
  },
  formatButtonTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  // Benefits Card
  benefitsCard: {
    backgroundColor: '#f6f3f2', // surface-container-low
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
  },
  benefitsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  benefitsIconContainer: {
    backgroundColor: '#fecc03', // secondaryContainer
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1b1b1c',
  },
  benefitsDescription: {
    fontSize: 14,
    color: '#434653',
    marginBottom: 24,
    lineHeight: 20,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    // No border-bottom line - use spacing instead per DESIGN.md
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: '#1b1b1c', // on-surface
    fontWeight: '600',
  },
  switchSubtitle: {
    fontSize: 13,
    color: '#434653', // on-surface-variant
    marginTop: 2,
  },
  // Issue Button
  buttonContainer: {
    marginTop: 8,
    marginBottom: 32,
  },
  issueButton: {
    backgroundColor: '#003a8c', // primary
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#003a8c',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 3,
  },
  issueButtonText: {
    color: '#ffffff', // on-primary
    fontSize: 18,
    fontWeight: '700',
  },
  disclaimerText: {
    fontSize: 12,
    color: '#737784',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
  // Credential Token Display
  credentialToken: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#434653',
    backgroundColor: '#e5e2e1', // surface-container-highest
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  copyButton: {
    backgroundColor: '#8ffb85', // tertiary-fixed (success green)
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  copyButtonText: {
    color: '#002202', // on-tertiary-fixed
    fontSize: 14,
    fontWeight: '600',
  },
  // Laboratory Access
  labInputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  labInput: {
    flex: 1,
    paddingVertical: 12, // slightly smaller padding for inline input
  },
  labAddButton: {
    backgroundColor: '#003a8c', // primary
    width: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e5e2e1', // surface-container-highest
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 6,
  },
  chipText: {
    fontSize: 14,
    color: '#1b1b1c',
  },
  chipRemoveButton: {
    padding: 2,
  },
});

export default IssuerScreen;
