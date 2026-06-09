import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  LoadingIndicator,
  ErrorMessage,
  SuccessMessage,
  CredentialCard,
  ConsentModal,
  TransportModeSelector,
  ScannerModal,
} from '../components';
import QRCode from 'react-native-qrcode-svg';
import { useHolderState } from './hooks/useHolderState';
import { useState } from 'react';

const HolderScreen: React.FC = () => {
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [isAddExpanded, setIsAddExpanded] = useState(false);
  const [isProcessExpanded, setIsProcessExpanded] = useState(false);
  const {
    credentialInput,
    setCredentialInput,
    isLoading,
    error,
    success,
    credentials,
    currentIndex,
    setCurrentIndex,
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
    handlePresentCredential,
    handleCopyCredential,
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
          <TouchableOpacity 
            style={styles.collapsibleHeader} 
            activeOpacity={0.7}
            onPress={() => setIsAddExpanded(!isAddExpanded)}>
            <View style={styles.inputSectionHeader}>
              <MaterialIcons name="add-circle" size={20} color="#003a8c" />
              <Text style={styles.sectionTitle}>Adicionar Credencial</Text>
            </View>
            <MaterialIcons 
              name={isAddExpanded ? 'expand-less' : 'expand-more'} 
              size={24} 
              color="#003a8c" 
            />
          </TouchableOpacity>
          
          {isAddExpanded && (
            <View style={styles.collapsibleContent}>
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
                <MaterialIcons name="save" size={18} color="#ffffff" />
                <Text style={styles.saveButtonText}>
                  {isLoading ? 'Processando...' : 'Salvar na Carteira'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
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
              <TouchableOpacity 
                style={styles.collapsibleHeader} 
                activeOpacity={0.7}
                onPress={() => setIsProcessExpanded(!isProcessExpanded)}>
                <Text style={styles.sectionTitle}>
                  Processar Apresentação
                </Text>
                <MaterialIcons 
                  name={isProcessExpanded ? 'expand-less' : 'expand-more'} 
                  size={24} 
                  color="#003a8c" 
                />
              </TouchableOpacity>

              {isProcessExpanded && (
                <View style={styles.collapsibleContent}>
                  <Text style={styles.inputDescription}>
                    {transportMode === 'qrcode'
                      ? 'Leia o QR Code da requisição PEX no dispositivo verificador'
                      : 'Cole uma requisição PEX para criar uma apresentação'}
                  </Text>

                  {transportMode === 'qrcode' ? (
                    <TouchableOpacity
                      style={[
                        styles.saveButton,
                        isProcessingRequest && styles.buttonDisabled,
                      ]}
                      onPress={() => setIsScannerVisible(true)}
                      disabled={isProcessingRequest}>
                      <MaterialIcons name="qr-code-scanner" size={18} color="#ffffff" />
                      <Text style={styles.saveButtonText}>
                        Abrir Câmera
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <>
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
                    </>
                  )}
                </View>
              )}
            </View>

            {/* Presentation Output (QR Code or Text) */}
            {presentationOutput && (
              <View style={styles.presentationOutputSection}>
                <Text style={[styles.sectionTitle, styles.presentationTitle]}>Apresentação Gerada</Text>
                {transportMode === 'qrcode' ? (
                  <View style={styles.qrContainer}>
                    <QRCode
                      value={presentationOutput}
                      size={300}
                      ecl="L"
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
                  <MaterialIcons name="content-copy" size={20} color="#6e5700" />
                  <Text style={styles.presentButtonText}>
                    Copiar Apresentação
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

        {/* Scanner Modal */}
        <ScannerModal
          visible={isScannerVisible}
          onClose={() => setIsScannerVisible(false)}
          onScan={(data) => {
            setIsScannerVisible(false);
            setRequestInput(data);
            setTimeout(() => {
              handleProcessRequest(data);
            }, 300);
          }}
          title="Ler Requisição PEX"
          subtitle="Alinhe o QR Code da tela do Verificador"
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

            {/* Credential Carousel */}
            <FlatList
              data={credentials}
              keyExtractor={(_, index) => index.toString()}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const screenWidth = Dimensions.get('window').width;
                const cardWidth = screenWidth - 48; // content padding 24*2
                const newIndex = Math.round(event.nativeEvent.contentOffset.x / cardWidth);
                if (newIndex !== currentIndex) {
                  setCurrentIndex(newIndex);
                }
              }}
              renderItem={({item}) => (
                <View style={{ width: Dimensions.get('window').width - 48, paddingBottom: 16 }}>
                  <CredentialCard
                    credential={item}
                    onPresent={handlePresentCredential}
                    onCopy={handleCopyCredential}
                  />
                  <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 12 }}>
                    <TouchableOpacity
                      style={[styles.deleteButton, {flexDirection: 'row', gap: 6}]}
                      onPress={handleDeleteCredential}>
                      <MaterialIcons name="delete" size={18} color="#ba1a1a" />
                      <Text style={{color: '#ba1a1a', fontWeight: '600'}}>Excluir Credencial</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          </View>
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons
              name="account-balance-wallet"
              size={64}
              color="#e5e2e1"
              style={styles.emptyStateIcon}
            />
            <Text style={styles.emptyStateText}>
              Nenhuma credencial armazenada
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Adicione uma credencial para começar
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
    fontSize: 34,
    fontWeight: '800',
    color: '#003a8c', // primary
    marginBottom: 12,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 15,
    color: '#434653', // on-surface-variant
    marginBottom: 24,
    lineHeight: 22,
  },
  // Engine Toggle Section
  engineToggleSection: {
    backgroundColor: '#f6f3f2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  engineToggleTitle: {
    fontSize: 14,
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
    backgroundColor: '#ffffff',
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
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  collapsibleContent: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
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
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#003a8c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 3,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
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
    fontWeight: '700',
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
    fontWeight: '600',
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
    flexDirection: 'row',
    backgroundColor: '#003a8c',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
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
    backgroundColor: '#ffdad6', // error-container
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    marginTop: 32,
  },
  emptyStateIcon: {
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 2,
  },
  presentationTitle: {
    marginBottom: 12,
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
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#745b00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  presentButtonText: {
    color: '#6e5700', // on-secondary-container
    fontSize: 16,
    fontWeight: '700',
  },
});

export default HolderScreen;
