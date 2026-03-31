import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {useAppStore} from '../stores/useAppStore';
import {
  LoadingIndicator,
  ErrorMessage,
  SuccessMessage,
  CredentialCard,
  ConsentModal,
} from '../components';
import {VerifiableCredential, ConsentData, PresentationExchangeRequest} from '../types';
import CredentialService from '../services/CredentialService';
import StorageService from '../services/StorageService';
import LogService from '../services/LogService';
import PresentationService from '../services/PresentationService';

const HolderScreen: React.FC = () => {
  const setCurrentModule = useAppStore(state => state.setCurrentModule);

  const [credentialInput, setCredentialInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<VerifiableCredential[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(true);

  // Presentation request state
  const [requestInput, setRequestInput] = useState('');
  const [isProcessingRequest, setIsProcessingRequest] = useState(false);
  const [consentData, setConsentData] = useState<ConsentData | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [currentRequest, setCurrentRequest] = useState<PresentationExchangeRequest | null>(null);

  useEffect(() => {
    setCurrentModule('titular');
    loadCredentials();
  }, [setCurrentModule]);

  /**
   * Loads all stored credentials from encrypted storage
   */
  const loadCredentials = async () => {
    try {
      setIsLoadingCredentials(true);
      const storedTokens = await StorageService.getCredentials();

      // Parse all stored credentials
      const parsedCredentials: VerifiableCredential[] = [];
      for (const token of storedTokens) {
        try {
          const credential =
            await CredentialService.validateAndParseCredential(token);
          parsedCredentials.push(credential);
        } catch (err) {
          // Skip invalid credentials
          console.error('Failed to parse stored credential:', err);
        }
      }

      setCredentials(parsedCredentials);
      setCurrentIndex(parsedCredentials.length > 0 ? 0 : -1);
    } catch (err) {
      console.error('Failed to load credentials:', err);
      setError('Erro ao carregar credenciais armazenadas');
    } finally {
      setIsLoadingCredentials(false);
    }
  };

  /**
   * Handles pasting and storing a new credential
   */
  const handleStoreCredential = async () => {
    if (!credentialInput.trim()) {
      setError('Por favor, cole uma credencial válida');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate and parse the credential
      const credential = await CredentialService.validateAndParseCredential(
        credentialInput.trim(),
      );

      // Store the credential token
      await StorageService.storeCredential(credentialInput.trim());

      // Log the storage operation
      LogService.captureEvent(
        'credential_issuance',
        'titular',
        {
          parameters: {
            action: 'credential_stored',
            issuer: credential.issuer,
            holder: credential.credentialSubject.id,
          },
        },
        true,
      );

      // Reload credentials
      await loadCredentials();

      setSuccess('Credencial armazenada com sucesso!');
      setCredentialInput('');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      const errorMessage =
        err.message || 'Erro ao armazenar credencial. Verifique o formato.';
      setError(errorMessage);

      // Log the error
      LogService.captureEvent(
        'credential_issuance',
        'titular',
        {
          parameters: {
            action: 'credential_storage_failed',
          },
        },
        false,
        err instanceof Error ? err : new Error(String(err)),
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Navigates to the previous credential
   */
  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  /**
   * Navigates to the next credential
   */
  const handleNext = () => {
    if (currentIndex < credentials.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  /**
   * Deletes the current credential
   */
  const handleDeleteCredential = () => {
    Alert.alert(
      'Excluir Credencial',
      'Tem certeza que deseja excluir esta credencial?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.deleteCredential(currentIndex);
              await loadCredentials();
              setSuccess('Credencial excluída com sucesso');
              setTimeout(() => setSuccess(null), 3000);
            } catch (err) {
              setError('Erro ao excluir credencial');
            }
          },
        },
      ],
    );
  };

  /**
   * Handles processing a presentation request
   */
  const handleProcessRequest = async () => {
    if (!requestInput.trim()) {
      setError('Por favor, cole uma requisição PEX válida');
      return;
    }

    if (credentials.length === 0) {
      setError('Nenhuma credencial disponível para criar apresentação');
      return;
    }

    setIsProcessingRequest(true);
    setError(null);
    setSuccess(null);

    try {
      // Use the current credential
      const credential = credentials[currentIndex];

      // Process the PEX request
      const consent = await PresentationService.processPEXRequest(
        requestInput.trim(),
        credential,
      );

      // Validate the request format and store it
      const validatedRequest = PresentationService.validatePEXFormat(requestInput.trim());
      setCurrentRequest(validatedRequest);

      // Set consent data
      setConsentData(consent);

      // Initialize selected attributes with all required attributes
      setSelectedAttributes([...consent.required_attributes]);

      // Show consent modal
      setShowConsentModal(true);
    } catch (err: any) {
      const errorMessage =
        err.message || 'Erro ao processar requisição. Verifique o formato PEX.';
      setError(errorMessage);

      // Log the error
      LogService.captureEvent(
        'presentation_creation',
        'titular',
        {
          parameters: {
            action: 'request_processing_failed',
          },
        },
        false,
        err instanceof Error ? err : new Error(String(err)),
      );
    } finally {
      setIsProcessingRequest(false);
    }
  };

  /**
   * Handles toggling an optional attribute
   */
  const handleAttributeToggle = (attribute: string) => {
    if (!consentData) return;

    // Don't allow toggling required attributes
    if (consentData.required_attributes.includes(attribute)) {
      return;
    }

    setSelectedAttributes(prev => {
      if (prev.includes(attribute)) {
        return prev.filter(a => a !== attribute);
      } else {
        return [...prev, attribute];
      }
    });
  };

  /**
   * Handles approving the consent and creating presentation
   */
  const handleApproveConsent = async () => {
    if (!currentRequest || !consentData) {
      setError('Dados de consentimento não disponíveis');
      setShowConsentModal(false);
      return;
    }

    setShowConsentModal(false);
    setIsProcessingRequest(true);
    setError(null);

    try {
      const credential = credentials[currentIndex];

      // Create the presentation
      const presentation = await PresentationService.createPresentation(
        credential,
        currentRequest,
        selectedAttributes,
      );

      // Convert to JSON string
      const presentationJson = JSON.stringify(presentation, null, 2);

      // Copy to clipboard (simulated for now)
      // In a real app, use @react-native-clipboard/clipboard
      // Clipboard.setString(presentationJson);

      setSuccess('Apresentação criada e copiada para área de transferência!');
      setRequestInput('');
      setCurrentRequest(null);
      setConsentData(null);
      setSelectedAttributes([]);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      const errorMessage =
        err.message || 'Erro ao criar apresentação';
      setError(errorMessage);
    } finally {
      setIsProcessingRequest(false);
    }
  };

  /**
   * Handles canceling the consent
   */
  const handleCancelConsent = () => {
    setShowConsentModal(false);
    setConsentData(null);
    setSelectedAttributes([]);
    setCurrentRequest(null);

    // Log cancellation
    LogService.captureEvent(
      'presentation_creation',
      'titular',
      {
        parameters: {
          action: 'consent_cancelled',
        },
      },
      true,
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Módulo Titular</Text>
        <Text style={styles.subtitle}>
          Armazene e visualize suas credenciais acadêmicas
        </Text>

        {/* Credential Input Section */}
        <View style={styles.inputSection}>
          <Text style={styles.sectionTitle}>Adicionar Credencial</Text>
          <TextInput
            style={styles.input}
            placeholder="Cole sua credencial aqui (SD-JWT ou AnonCreds)"
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            value={credentialInput}
            onChangeText={setCredentialInput}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleStoreCredential}
            disabled={isLoading}>
            <Text style={styles.buttonText}>
              {isLoading ? 'Processando...' : 'Armazenar Credencial'}
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
          <View style={styles.requestSection}>
            <Text style={styles.sectionTitle}>Processar Requisição de Apresentação</Text>
            <Text style={styles.sectionSubtitle}>
              Cole uma requisição PEX para criar uma apresentação
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Cole a requisição PEX aqui"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              value={requestInput}
              onChangeText={setRequestInput}
              editable={!isProcessingRequest}
            />
            <TouchableOpacity
              style={[styles.button, isProcessingRequest && styles.buttonDisabled]}
              onPress={handleProcessRequest}
              disabled={isProcessingRequest}>
              <Text style={styles.buttonText}>
                {isProcessingRequest ? 'Processando...' : 'Processar Requisição'}
              </Text>
            </TouchableOpacity>
          </View>
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
            <View style={styles.navigationHeader}>
              <Text style={styles.sectionTitle}>Minhas Credenciais</Text>
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
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  inputSection: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  requestSection: {
    backgroundColor: '#fff8e1',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffd54f',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fafafa',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#003366',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  credentialsSection: {
    marginTop: 24,
  },
  navigationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  credentialCounter: {
    fontSize: 14,
    color: '#666',
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
    backgroundColor: '#003366',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  navButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  navButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  navButtonTextDisabled: {
    color: '#999',
  },
  deleteButton: {
    backgroundColor: '#c62828',
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
    padding: 40,
    marginTop: 40,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default HolderScreen;
