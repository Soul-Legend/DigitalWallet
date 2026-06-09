import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Clipboard,
} from 'react-native';
import {useAppStore} from '../stores/useAppStore';
import {
  LoadingIndicator,
  ErrorMessage,
  SuccessMessage,
  TransportModeSelector,
  ScannerModal,
  ValidationResultModal,
} from '../components';
import {Scenario, PresentationExchangeRequest, ValidationResult} from '../types';
import {TransportMode} from '../services/TransportService';
import CryptoService from '../services/CryptoService';
import QRCode from 'react-native-qrcode-svg';
import {MaterialIcons} from '@expo/vector-icons';

// IDs are aligned with `src/services/verification/ScenarioCatalog.ts`
const SCENARIOS: readonly Scenario[] = [
  {
    id: 'ru',
    name: 'Acesso ao RU',
    description: 'Verifica vínculo ativo com a instituição para acesso ao Restaurante Universitário.',
    type: 'selective_disclosure',
    requested_attributes: ['status_matricula', 'isencao_ru'],
  },
  {
    id: 'elections',
    name: 'Eleições Universitárias',
    description: 'Confirma elegibilidade e status de estudante/servidor para participação em pleitos.',
    type: 'zkp_eligibility',
    requested_attributes: ['status_matricula'],
  },
  {
    id: 'lab_access',
    name: 'Acesso a Laboratórios',
    description: 'Valida permissões específicas e nível de acesso para ambientes restritos.',
    type: 'access_control',
    requested_attributes: ['acesso_laboratorios', 'acesso_predios'],
  },
  {
    id: 'age_verification',
    name: 'Maioridade',
    description: 'Validar maioridade civil sem revelar data de nascimento (Range Proof)',
    type: 'range_proof',
    predicates: [
      {attribute: 'data_nascimento', p_type: '>=', value: 18},
    ],
  },
];

const SCENARIO_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  ru: 'restaurant',
  elections: 'how-to-vote',
  lab_access: 'science',
  age_verification: 'cake',
};

const VerifierScreen: React.FC = () => {
  const setCurrentModule = useAppStore(state => state.setCurrentModule);

  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [generatedRequest, setGeneratedRequest] = useState<string | null>(null);
  const [presentationInput, setPresentationInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [labInput, setLabInput] = useState('');
  const [transportMode, setTransportMode] = useState<TransportMode>('clipboard');
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [isResultModalVisible, setIsResultModalVisible] = useState(false);

  useEffect(() => {
    setCurrentModule('verificador');
  }, [setCurrentModule]);

  const scenarios = SCENARIOS;

  const handleSelectScenario = async (scenario: Scenario) => {
    const liveScenario: Scenario =
      scenario.id === 'elections'
        ? {
            ...scenario,
            challenge_data: {election_id: `eleicao_${Date.now()}`},
          }
        : scenario;
    setSelectedScenario(liveScenario);
    setGeneratedRequest(null);
    setValidationResult(null);
    setPresentationInput('');
    setError(null);
    setSuccess(null);
    setIsGenerating(true);
    setIsResultModalVisible(false);

    try {
      const request = generatePEXRequest(liveScenario);
      const requestJson = JSON.stringify(request, null, 2);
      setGeneratedRequest(requestJson);
      setSuccess('Requisição gerada com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar requisição');
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePEXRequest = (scenario: Scenario): PresentationExchangeRequest => {
    const challenge = `challenge_${Date.now()}_${CryptoService.generateNonce().slice(0, 16)}`;

    const baseRequest: PresentationExchangeRequest = {
      type: 'PresentationExchange',
      version: '1.0.0',
      challenge,
      presentation_definition: {
        id: `pd_${scenario.id}_${Date.now()}`,
        input_descriptors: [
          {
            id: `input_${scenario.id}`,
            name: scenario.name,
            purpose: scenario.description,
            constraints: {
              fields: (scenario.requested_attributes || []).map(attr => ({
                path: [`$.credentialSubject.${attr}`],
                predicate: 'required' as const,
              })),
              limit_disclosure: 'required',
            },
          },
        ],
      },
    };

    if (scenario.id === 'elections' && scenario.challenge_data?.election_id) {
      baseRequest.election_id = scenario.challenge_data.election_id;
    }

    if (scenario.id === 'lab_access' && labInput.trim()) {
      baseRequest.resource_id = labInput.trim();
    }

    if (scenario.predicates) {
      baseRequest.predicates = scenario.predicates.map(p => ({
        attribute: p.attribute,
        p_type: p.p_type,
        value: p.value,
      }));
    }

    return baseRequest;
  };

  const handleCopyRequest = () => {
    if (generatedRequest) {
      Clipboard.setString(generatedRequest);
      setSuccess('Requisição copiada para área de transferência!');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleValidatePresentation = async () => {
    if (!presentationInput.trim()) {
      setError('Por favor, cole uma apresentação válida');
      return;
    }

    if (!selectedScenario) {
      setError('Selecione um cenário primeiro');
      return;
    }

    if (!generatedRequest) {
      setError('Gere uma requisição primeiro');
      return;
    }

    setIsValidating(true);
    setError(null);
    setSuccess(null);
    setValidationResult(null);
    setIsResultModalVisible(false);

    try {
      const presentation = JSON.parse(presentationInput.trim());
      const pexRequest = JSON.parse(generatedRequest);
      const VerificationService = (await import('../services/VerificationService')).default;
      const result = await VerificationService.validatePresentation(
        presentation,
        pexRequest,
      );

      setValidationResult(result);
      setIsResultModalVisible(true);

      if (result.valid) {
        setSuccess('Apresentação validada com sucesso!');
      } else {
        setError(
          result.errors?.join(', ') || 'Apresentação inválida',
        );
      }

      setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
    } catch (err: any) {
      setError(err.message || 'Erro ao validar apresentação. Verifique o formato.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleReset = () => {
    setSelectedScenario(null);
    setGeneratedRequest(null);
    setPresentationInput('');
    setValidationResult(null);
    setError(null);
    setSuccess(null);
    setLabInput('');
    setIsResultModalVisible(false);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Editorial Header */}
        <Text style={styles.title}>Verificador de Credenciais</Text>
        <Text style={styles.subtitle}>
          Selecione o cenário de validação adequado para a situação atual ou
          insira manualmente o token de apresentação para verificar as
          credenciais apresentadas pelo cidadão
        </Text>

        {/* Transport Mode Selector */}
        <TransportModeSelector
          selectedMode={transportMode}
          onSelectMode={setTransportMode}
          disabled={isGenerating || isValidating}
        />

        {/* Scenario Selector */}
        {!selectedScenario && (
          <View style={styles.scenarioSection}>
            <Text style={styles.sectionTitle}>Cenários de Verificação</Text>
            {scenarios.map(scenario => (
              <TouchableOpacity
                key={scenario.id}
                style={styles.scenarioCard}
                onPress={() => handleSelectScenario(scenario)}>
                <View style={styles.scenarioIconContainer}>
                  <MaterialIcons
                    name={SCENARIO_ICONS[scenario.id] || 'lock'}
                    size={24}
                    color="#003a8c"
                  />
                </View>
                <Text style={styles.scenarioName}>{scenario.name}</Text>
                <Text style={styles.scenarioDescription}>
                  {scenario.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Selected Scenario View */}
        {selectedScenario && (
          <>
            {/* Scenario Header */}
            <View style={styles.selectedScenarioHeader}>
              <View style={styles.selectedScenarioInfo}>
                <Text style={styles.selectedScenarioName}>
                  {selectedScenario.name}
                </Text>
                <Text style={styles.selectedScenarioDescription}>
                  {selectedScenario.description}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={handleReset}>
                <MaterialIcons name="arrow-back" size={16} color="#003a8c" />
                <Text style={styles.resetButtonText}>Voltar</Text>
              </TouchableOpacity>
            </View>

            {/* Lab Input for the access-control scenario */}
            {selectedScenario.id === 'lab_access' && !generatedRequest && (
              <View style={styles.labInputSection}>
                <Text style={styles.sectionTitle}>
                  Especifique o Laboratório ou Prédio
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Lab 101, Prédio A"
                  placeholderTextColor="#737784"
                  value={labInput}
                  onChangeText={setLabInput}
                />
                <TouchableOpacity
                  style={[styles.button, !labInput.trim() && styles.buttonDisabled]}
                  onPress={() => {
                    if (!labInput.trim()) {
                      setError('Por favor, especifique o laboratório ou prédio');
                      return;
                    }
                    handleSelectScenario(selectedScenario);
                  }}
                  disabled={!labInput.trim()}>
                  <Text style={styles.buttonText}>Gerar Requisição</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Loading Indicator */}
            {isGenerating && (
              <LoadingIndicator message="Gerando requisição PEX..." />
            )}

            {/* Challenge Display */}
            {generatedRequest && (
              <View style={styles.challengeSection}>
                <Text style={styles.sectionTitle}>Requisição Gerada</Text>

                {/* QR Code Display */}
                {transportMode === 'qrcode' && (
                  <View style={styles.qrContainer}>
                    <QRCode
                      value={generatedRequest}
                      size={220}
                      backgroundColor="#ffffff"
                      color="#003a8c"
                    />
                    <Text style={styles.qrHint}>
                      Escaneie com o módulo Titular
                    </Text>
                  </View>
                )}

                {/* Clipboard / Text Display */}
                {(transportMode === 'clipboard' || transportMode === 'qrcode') && (
                  <View style={styles.challengeDisplay}>
                    <ScrollView
                      style={styles.challengeScroll}
                      nestedScrollEnabled>
                      <Text style={styles.challengeText}>{generatedRequest}</Text>
                    </ScrollView>
                  </View>
                )}

                {transportMode === 'clipboard' && (
                  <TouchableOpacity
                    style={styles.copyRequestButton}
                    onPress={handleCopyRequest}>
                    <MaterialIcons name="content-copy" size={20} color="#ffffff" />
                    <Text style={styles.copyRequestButtonText}>
                      Copiar para Área de Transferência
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Presentation Input - Validate Section */}
            {generatedRequest && (
              <View style={styles.presentationSection}>
                <View style={styles.presentationHeaderRow}>
                  <MaterialIcons name="verified-user" size={32} color="#003a8c" />
                  <Text style={styles.sectionTitleModal}>Validar Apresentação</Text>
                </View>
                <Text style={styles.sectionSubtitle}>
                  {transportMode === 'qrcode'
                    ? 'Leia o QR Code da apresentação exibida no dispositivo Titular.'
                    : 'Insira o token de apresentação (JWT/JSON) fornecido pelo titular da credencial.'}
                </Text>

                {transportMode === 'qrcode' ? (
                  <TouchableOpacity
                    style={[styles.saveButton, isValidating && styles.buttonDisabled]}
                    onPress={() => setIsScannerVisible(true)}
                    disabled={isValidating}>
                    <MaterialIcons name="qr-code-scanner" size={18} color="#ffffff" />
                    <Text style={styles.saveButtonText}>Abrir Câmera</Text>
                  </TouchableOpacity>
                ) : (
                  <TextInput
                    style={styles.input}
                    placeholder="eyJhbGciOiJFUzI1NiIs..."
                    placeholderTextColor="#737784"
                    multiline
                    numberOfLines={6}
                    value={presentationInput}
                    onChangeText={setPresentationInput}
                    editable={!isValidating}
                  />
                )}
                <View style={styles.validateActions}>
                  <TouchableOpacity
                    style={styles.clearInputButton}
                    onPress={() => setPresentationInput('')}>
                    <Text style={styles.clearInputButtonText}>Limpar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.validateButton,
                      isValidating && styles.buttonDisabled,
                    ]}
                    onPress={handleValidatePresentation}
                    disabled={isValidating}>
                    <MaterialIcons name="check-circle" size={18} color="#ffffff" />
                    <Text style={styles.validateButtonText}>
                      {isValidating ? 'Validando...' : 'Verificar'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Validation Loading */}
            {isValidating && (
              <LoadingIndicator message="Validando apresentação..." />
            )}
          </>
        )}

        {/* Error Message */}
        {error && <ErrorMessage message={error} />}

        {/* Success Message */}
        {success && <SuccessMessage message={success} />}

        {/* Scanner Modal */}
        <ScannerModal
          visible={isScannerVisible}
          onClose={() => setIsScannerVisible(false)}
          onScan={(data) => {
            setIsScannerVisible(false);
            setPresentationInput(data);
            setTimeout(() => {
              setTransportMode('clipboard');
            }, 300);
          }}
          title="Ler Apresentação"
          subtitle="Alinhe o QR Code da tela do Titular"
        />

        {/* Validation Result Modal */}
        <ValidationResultModal
          visible={isResultModalVisible}
          onClose={() => setIsResultModalVisible(false)}
          result={validationResult}
          scenario={selectedScenario}
        />
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
    marginBottom: 32,
    lineHeight: 22,
  },
  scenarioSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1b1b1c', // on-surface
    marginBottom: 16,
  },
  sectionTitleModal: {
    fontSize: 22,
    fontWeight: '700',
    color: '#003a8c',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#434653',
    marginBottom: 16,
    lineHeight: 20,
  },
  // Scenario Cards
  scenarioCard: {
    backgroundColor: '#ffffff', // surface-container-lowest
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    // Ambient shadow - no borders
    shadowColor: '#1b1b1c',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 2,
  },
  scenarioIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#d9e2ff', // primary-fixed
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  scenarioName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1b1b1c', // on-surface
    marginBottom: 6,
  },
  scenarioDescription: {
    fontSize: 14,
    color: '#434653', // on-surface-variant
    lineHeight: 20,
  },
  // Selected Scenario
  selectedScenarioHeader: {
    backgroundColor: '#f6f3f2', // surface-container-low
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedScenarioInfo: {
    flex: 1,
    marginRight: 12,
  },
  selectedScenarioName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#003a8c',
    marginBottom: 4,
  },
  selectedScenarioDescription: {
    fontSize: 13,
    color: '#434653',
  },
  resetButton: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    // Ghost border per DESIGN.md
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 213, 0.4)', // outline-variant at 40%
  },
  resetButtonText: {
    color: '#003a8c',
    fontSize: 14,
    fontWeight: '600',
  },
  // Lab Input
  labInputSection: {
    backgroundColor: '#f6f3f2',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  // Challenge Section
  challengeSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
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
  challengeDisplay: {
    backgroundColor: '#e5e2e1', // surface-container-highest
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    maxHeight: 200,
  },
  challengeScroll: {
    maxHeight: 180,
  },
  challengeText: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: '#434653',
  },
  copyRequestButton: {
    backgroundColor: '#003a8c', // primary
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  copyRequestButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  // Presentation Section
  presentationSection: {
    backgroundColor: '#f6f3f2', // surface-container-low
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  presentationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#e5e2e1', // surface-container-highest
    borderRadius: 8,
    padding: 16,
    fontSize: 14,
    color: '#1b1b1c',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
    fontFamily: 'monospace',
  },
  validateActions: {
    flexDirection: 'row',
    gap: 12,
  },
  clearInputButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 213, 0.4)',
  },
  clearInputButtonText: {
    color: '#003a8c',
    fontSize: 16,
    fontWeight: '700',
  },
  validateButton: {
    flex: 1,
    backgroundColor: '#003a8c', // primary (per plan "Verificar in primary")
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#003a8c',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 3,
  },
  validateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
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
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 3,
    marginBottom: 20,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  button: {
    backgroundColor: '#003a8c',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Validation Result
  validationResult: {
    borderRadius: 16,
    padding: 24,
    marginTop: 16,
    borderLeftWidth: 4,
  },
  validationSuccess: {
    backgroundColor: '#ffffff', // surface-container-lowest
    borderLeftColor: '#006511', // tertiary (success green)
    shadowColor: '#1b1b1c',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 2,
  },
  validationFailure: {
    backgroundColor: '#ffdad6', // error-container
    borderLeftColor: '#ba1a1a', // error
  },
  validationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  validationIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  validationHeaderText: {
    flex: 1,
  },
  validationTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  validationSubtitle: {
    fontSize: 14,
    color: '#434653',
    lineHeight: 20,
  },
  validationErrors: {
    marginTop: 16,
    paddingTop: 16,
    alignSelf: 'stretch',
    borderTopWidth: 1,
    borderTopColor: 'rgba(186, 26, 26, 0.2)',
  },
  validationErrorText: {
    fontSize: 14,
    color: '#93000a', // on-error-container
    marginBottom: 6,
    fontWeight: '500',
  },
  trustChainStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 8,
  },
  trustChainText: {
    fontSize: 14,
    fontWeight: '600',
  },
  trustChainValid: {
    color: '#006511',
  },
  trustChainInvalid: {
    color: '#ba1a1a',
  },
});

export default VerifierScreen;
