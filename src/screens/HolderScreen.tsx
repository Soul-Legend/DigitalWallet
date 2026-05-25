import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import {
  LoadingIndicator,
  ErrorMessage,
  SuccessMessage,
  CredentialCard,
  ConsentModal,
  TransportModeSelector,
} from '../components';
import QRCode from 'react-native-qrcode-svg';
import {useHolderState} from './hooks/useHolderState';

const HolderScreen: React.FC = () => {
  const {
    credentialInput,
    setCredentialInput,
    isLoading,
    error,
    success,
    credentials,
    currentIndex,
    isLoadingCredentials,
    requestInput,
    setRequestInput,
    isProcessingRequest,
    consentData,
    showConsentModal,
    selectedAttributes,
    transportMode,
    presentationOutput,
    handleStoreCredential,
    handlePrevious,
    handleNext,
    handleDeleteCredential,
    handleProcessRequest,
    handleAttributeToggle,
    handleApproveConsent,
    handleCancelConsent,
    handleTransportModeChange,
    handleCopyOutput,
  } = useHolderState();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Editorial Header */}
        <Text style={styles.title}>Minha Carteira Acadêmica</Text>
        <Text style={styles.subtitle}>
          Gerencie suas credenciais acadêmicas e profissionais emitidas por
          instituições confiáveis.
        </Text>

        {/* Credential Input Section */}
        <View style={styles.inputSection}>
          <View style={styles.inputSectionHeader}>
            <Text style={styles.addIcon}>⊕</Text>
            <Text style={styles.sectionTitle}>Adicionar Credencial</Text>
          </View>
          <Text style={styles.inputDescription}>
            Cole o JSON da sua credencial verificável para adicioná-la à sua
            carteira com segurança.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Insira o JSON da Credencial aqui..."
            placeholderTextColor="#737784"
            multiline
            numberOfLines={4}
            value={credentialInput}
            onChangeText={setCredentialInput}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[styles.saveButton, isLoading && styles.buttonDisabled]}
            onPress={handleStoreCredential}
            disabled={isLoading}>
            <Text style={styles.saveButtonIcon}>💾</Text>
            <Text style={styles.saveButtonText}>
              {isLoading ? 'Processando...' : 'Salvar na Carteira'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Loading Indicator */}
        {isLoading && (
          <LoadingIndicator message="Validando e armazenando credencial..." />
        )}

        {/* Error Message */}
        {error && <ErrorMessage message={error} />}

        {/* Success Message */}
        {success && <SuccessMessage message={success} />}

        {/* Presentation Request Section */}
        {credentials.length > 0 && (
          <>
            {/* Transport Mode Selector */}
            <TransportModeSelector
              selectedMode={transportMode}
              onSelectMode={handleTransportModeChange}
              disabled={isProcessingRequest}
            />

            <View style={styles.requestSection}>
              <Text style={styles.sectionTitle}>
                Processar Requisição de Apresentação
              </Text>
              <Text style={styles.inputDescription}>
                Cole uma requisição PEX para criar uma apresentação
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Cole a requisição PEX aqui"
                placeholderTextColor="#737784"
                multiline
                numberOfLines={4}
                value={requestInput}
                onChangeText={setRequestInput}
                editable={!isProcessingRequest}
              />
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  isProcessingRequest && styles.buttonDisabled,
                ]}
                onPress={handleProcessRequest}
                disabled={isProcessingRequest}>
                <Text style={styles.saveButtonText}>
                  {isProcessingRequest
                    ? 'Processando...'
                    : 'Processar Requisição'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Presentation Output (QR Code or Text) */}
            {presentationOutput && (
              <View style={styles.presentationOutputSection}>
                <Text style={styles.sectionTitle}>Apresentação Gerada</Text>
                {transportMode === 'qrcode' ? (
                  <View style={styles.qrContainer}>
                    <QRCode
                      value={presentationOutput}
                      size={220}
                      backgroundColor="#ffffff"
                      color="#003a8c"
                    />
                    <Text style={styles.qrHint}>
                      Escaneie com o módulo Verificador
                    </Text>
                  </View>
                ) : null}
                <TouchableOpacity
                  style={styles.presentButton}
                  onPress={handleCopyOutput}>
                  <Text style={styles.presentButtonText}>
                    📋 Copiar Apresentação
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* Consent Modal */}
        <ConsentModal
          visible={showConsentModal}
          consentData={consentData}
          selectedAttributes={selectedAttributes}
          onAttributeToggle={handleAttributeToggle}
          onApprove={handleApproveConsent}
          onCancel={handleCancelConsent}
        />

        {/* Credentials Display Section */}
        {isLoadingCredentials ? (
          <LoadingIndicator message="Carregando credenciais..." />
        ) : credentials.length > 0 ? (
          <View style={styles.credentialsSection}>
            <Text style={styles.credentialsSectionTitle}>
              Credenciais Armazenadas
            </Text>

            <View style={styles.navigationHeader}>
              <Text style={styles.credentialCounter}>
                {currentIndex + 1} de {credentials.length}
              </Text>
            </View>

            {/* Credential Card */}
            <CredentialCard credential={credentials[currentIndex]} />

            {/* Navigation Controls */}
            <View style={styles.navigationControls}>
              <TouchableOpacity
                style={[
                  styles.navButton,
                  currentIndex === 0 && styles.navButtonDisabled,
                ]}
                onPress={handlePrevious}
                disabled={currentIndex === 0}>
                <Text
                  style={[
                    styles.navButtonText,
                    currentIndex === 0 && styles.navButtonTextDisabled,
                  ]}>
                  ← Anterior
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeleteCredential}>
                <Text style={styles.deleteButtonText}>🗑️ Excluir</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.navButton,
                  currentIndex === credentials.length - 1 &&
                    styles.navButtonDisabled,
                ]}
                onPress={handleNext}
                disabled={currentIndex === credentials.length - 1}>
                <Text
                  style={[
                    styles.navButtonText,
                    currentIndex === credentials.length - 1 &&
                      styles.navButtonTextDisabled,
                  ]}>
                  Próxima →
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📋</Text>
            <Text style={styles.emptyStateText}>
              Nenhuma credencial armazenada
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Cole uma credencial acima para começar
            </Text>
          </View>
        )}
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
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#003a8c', // primary
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#434653', // on-surface-variant
    marginBottom: 32,
    lineHeight: 24,
  },
  // Input Section
  inputSection: {
    backgroundColor: '#f6f3f2', // surface-container-low
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
  },
  inputSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  addIcon: {
    fontSize: 20,
    color: '#003a8c',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#003a8c', // primary
  },
  inputDescription: {
    fontSize: 14,
    color: '#434653', // on-surface-variant
    marginBottom: 16,
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#ffffff', // surface-container-lowest
    borderRadius: 8,
    padding: 16,
    fontSize: 14,
    color: '#1b1b1c',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
    // No border - follow "No-Line" rule
  },
  saveButton: {
    backgroundColor: '#003a8c', // primary
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonIcon: {
    fontSize: 14,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  // Request Section
  requestSection: {
    backgroundColor: '#f6f3f2',
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
  },
  // Credentials Section
  credentialsSection: {
    marginTop: 16,
  },
  credentialsSectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#003a8c',
    marginBottom: 16,
  },
  navigationHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 8,
  },
  credentialCounter: {
    fontSize: 14,
    color: '#434653',
    fontWeight: '500',
  },
  navigationControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
  },
  navButton: {
    flex: 1,
    backgroundColor: '#003a8c',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  navButtonDisabled: {
    backgroundColor: '#e5e2e1', // surface-container-highest
  },
  navButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  navButtonTextDisabled: {
    color: '#737784', // outline
  },
  deleteButton: {
    backgroundColor: '#ba1a1a', // error
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    minWidth: 100,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    marginTop: 32,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#434653',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#737784',
    textAlign: 'center',
  },
  // Presentation Output
  presentationOutputSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#1b1b1c',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 2,
  },
  qrContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 16,
  },
  qrHint: {
    fontSize: 14,
    color: '#434653',
    marginTop: 12,
    textAlign: 'center',
  },
  presentButton: {
    backgroundColor: '#fecc03', // secondary-container
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  presentButtonText: {
    color: '#6e5700', // on-secondary-container
    fontSize: 15,
    fontWeight: '600',
  },
});

export default HolderScreen;
