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
import {LoadingIndicator, ErrorMessage, SuccessMessage, TransportModeSelector} from '../components';
import {Scenario, PresentationExchangeRequest, ValidationResult} from '../types';
import {TransportMode} from '../services/TransportService';
import CryptoService from '../services/CryptoService';
import QRCode from 'react-native-qrcode-svg';

// Hoisted: scenarios are immutable presets. The election_id for the
// `elections` scenario is generated freshly when the user selects it (see
// `handleSelectScenario`) so it doesn't get frozen at module load.
//
// IDs are aligned with `src/services/verification/ScenarioCatalog.ts` so the
// UI catalogue and the back-end pipeline share a single naming scheme. The
// human-readable Portuguese labels live here because they are display-only
// concerns (the catalogue would otherwise need an i18n field).
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

const SCENARIO_ICONS: Record<string, string> = {
  ru: '🍽️',
  elections: '🗳️',
  lab_access: '🔬',
  age_verification: '📊',
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

  useEffect(() => {
    setCurrentModule('verificador');
  }, [setCurrentModule]);

  // Pre-configured scenarios are hoisted to module scope (see SCENARIOS).
  const scenarios = SCENARIOS;

  /**
   * Handles scenario selection and generates PEX request
   */
  const handleSelectScenario = async (scenario: Scenario) => {
    // Inject a fresh election_id for the elections scenario so each PEX
    // request gets a unique nullifier scope.
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

    try {
      // Generate PEX request based on scenario
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

  /**
   * Generates a PEX request for the selected scenario
   */
  const generatePEXRequest = (scenario: Scenario): PresentationExchangeRequest => {
    // SECURITY: PEX challenges must be unpredictable to prevent replay
    // attacks. Use the CSPRNG-backed CryptoService.generateNonce() instead
    // of Math.random (P0 C1 hardening, enforced by ESLint).
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

    // Add scenario-specific data
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

  /**
   * Copies the generated request to clipboard
   */
  const handleCopyRequest = () => {
    if (generatedRequest) {
      Clipboard.setString(generatedRequest);
      setSuccess('Requisição copiada para área de transferência!');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  /**
   * Validates the pasted presentation
   */
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

    try {
      // Parse the presentation to validate JSON format
      const presentation = JSON.parse(presentationInput.trim());

      // Parse the generated request
      const pexRequest = JSON.parse(generatedRequest);

      // Import VerificationService dynamically
      const VerificationService = (await import('../services/VerificationService')).default;

      // Validate the presentation
      const result = await VerificationService.validatePresentation(
        presentation,
        pexRequest,
      );

      setValidationResult(result);

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

  /**
   * Resets the verifier state
   */
  const handleReset = () => {
    setSelectedScenario(null);
    setGeneratedRequest(null);
    setPresentationInput('');
    setValidationResult(null);
    setError(null);
    setSuccess(null);
    setLabInput('');
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
                  <Text style={styles.scenarioIcon}>
                    {SCENARIO_ICONS[scenario.id] || '🔒'}
                  </Text>
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
                <Text style={styles.resetButtonText}>← Voltar</Text>
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
                    <Text style={styles.copyRequestButtonText}>
                      📋 Copiar para Área de Transferência
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Presentation Input - Validate Section */}
            {generatedRequest && (
              <View style={styles.presentationSection}>
                <Text style={styles.sectionTitle}>Validar Apresentação</Text>
                <Text style={styles.sectionSubtitle}>
                  Insira o token de apresentação (JWT/JSON) fornecido pelo
                  titular da credencial.
                </Text>
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
                    <Text style={styles.validateButtonIcon}>✓</Text>
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

            {/* Validation Result */}
            {validationResult && (
              <View
                style={[
                  styles.validationResult,
                  validationResult.valid
                    ? styles.validationSuccess
                    : styles.validationFailure,
                ]}>
                <View style={styles.validationHeader}>
                  <View
                    style={[
                      styles.validationIconCircle,
                      {
                        backgroundColor: validationResult.valid
                          ? '#8ffb85'
                          : '#ffdad6',
                      },
                    ]}>
                    <Text style={styles.validationIcon}>
                      {validationResult.valid ? '✓' : '✗'}
                    </Text>
                  </View>
                  <View style={styles.validationHeaderText}>
                    <Text style={styles.validationTitle}>
                      {validationResult.valid
                        ? 'Apresentação Válida'
                        : 'Apresentação Inválida'}
                    </Text>
                    <Text style={styles.validationSubtitle}>
                      {validationResult.valid
                        ? 'Assinaturas criptográficas verificadas com sucesso.'
                        : 'Verificação falhou.'}
                    </Text>
                  </View>
                </View>

                {/* Trust Chain Status */}
                {validationResult.trust_chain_valid !== undefined && (
                  <View style={styles.trustChainStatus}>
                    <Text style={styles.trustChainIcon}>
                      {validationResult.trust_chain_valid ? '🔗' : '⛓️‍💥'}
                    </Text>
                    <Text
                      style={[
                        styles.trustChainText,
                        validationResult.trust_chain_valid
                          ? styles.trustChainValid
                          : styles.trustChainInvalid,
                      ]}>
                      {validationResult.trust_chain_valid
                        ? 'Cadeia de confiança verificada'
                        : 'Emissor fora da cadeia de confiança'}
                    </Text>
                  </View>
                )}

                {validationResult.errors && validationResult.errors.length > 0 && (
                  <View style={styles.validationErrors}>
                    {validationResult.errors.map((err, idx) => (
                      <Text key={idx} style={styles.validationErrorText}>
                        • {err}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            )}
          </>
        )}

        {/* Error Message */}
        {error && <ErrorMessage message={error} />}

        {/* Success Message */}
        {success && <SuccessMessage message={success} />}
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
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#434653', // on-surface-variant
    marginBottom: 24,
    lineHeight: 22,
  },
  scenarioSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1b1b1c', // on-surface
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#434653',
    marginBottom: 12,
    lineHeight: 20,
  },
  // Scenario Cards
  scenarioCard: {
    backgroundColor: '#ffffff', // surface-container-lowest
    borderRadius: 12,
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
    backgroundColor: '#f6f3f2', // surface-container-low
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  scenarioIcon: {
    fontSize: 24,
  },
  scenarioName: {
    fontSize: 18,
    fontWeight: 'bold',
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
  },
  selectedScenarioName: {
    fontSize: 18,
    fontWeight: 'bold',
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
    marginBottom: 16,
    shadowColor: '#1b1b1c',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 2,
  },
  challengeDisplay: {
    backgroundColor: '#e5e2e1', // surface-container-highest
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    maxHeight: 200,
  },
  challengeScroll: {
    maxHeight: 180,
  },
  challengeText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#434653',
  },
  copyRequestButton: {
    backgroundColor: '#003a8c', // primary
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  copyRequestButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Presentation Section
  presentationSection: {
    backgroundColor: '#f6f3f2', // surface-container-low
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
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
    fontFamily: 'monospace',
  },
  validateActions: {
    flexDirection: 'row',
    gap: 12,
  },
  clearInputButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 213, 0.4)',
  },
  clearInputButtonText: {
    color: '#003a8c',
    fontSize: 15,
    fontWeight: '600',
  },
  validateButton: {
    flex: 1,
    backgroundColor: '#006511', // tertiary-container (green verify)
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  validateButtonIcon: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  validateButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#003a8c',
    borderRadius: 8,
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
    borderRadius: 12,
    padding: 24,
    marginTop: 16,
  },
  validationSuccess: {
    backgroundColor: '#f6f3f2', // surface-container-low
  },
  validationFailure: {
    backgroundColor: '#ffdad6', // error-container
  },
  validationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  validationIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  validationIcon: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1b1b1c',
  },
  validationHeaderText: {
    flex: 1,
  },
  validationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1b1b1c',
    marginBottom: 4,
  },
  validationSubtitle: {
    fontSize: 13,
    color: '#434653',
  },
  validationErrors: {
    marginTop: 12,
    paddingTop: 12,
    alignSelf: 'stretch',
  },
  validationErrorText: {
    fontSize: 14,
    color: '#93000a', // on-error-container
    marginBottom: 4,
  },
  trustChainStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    gap: 8,
  },
  trustChainIcon: {
    fontSize: 16,
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
  qrContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
  },
  qrHint: {
    fontSize: 14,
    color: '#434653',
    marginTop: 12,
    textAlign: 'center',
  },
});

export default VerifierScreen;
