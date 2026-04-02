import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Clipboard,
} from 'react-native';
import {useAppStore} from '../stores/useAppStore';
import {StudentData} from '../types';
import CredentialService from '../services/CredentialService';
import StorageService from '../services/StorageService';
import TrustChainService from '../services/TrustChainService';
import LoadingIndicator from '../components/LoadingIndicator';
import SuccessMessage from '../components/SuccessMessage';
import ErrorMessage from '../components/ErrorMessage';

interface TrustedIssuer {
  did: string;
  publicKey: string;
  name: string;
  parentDid: string | null;
  certificate: string;
  createdAt: string;
}

interface FormErrors {
  nome_completo?: string;
  cpf?: string;
  matricula?: string;
  curso?: string;
  status_matricula?: string;
  data_nascimento?: string;
}

const IssuerScreen: React.FC = () => {
  const setCurrentModule = useAppStore(state => state.setCurrentModule);
  const addLog = useAppStore(state => state.addLog);
  const holderDID = useAppStore(state => state.holderDID);
  const setIssuerDID = useAppStore(state => state.setIssuerDID);

  useEffect(() => {
    setCurrentModule('emissor');
  }, [setCurrentModule]);

  // Form state
  const [formData, setFormData] = useState<Partial<StudentData>>({
    nome_completo: '',
    cpf: '',
    matricula: '',
    curso: '',
    status_matricula: 'Ativo',
    data_nascimento: '',
    alojamento_indigena: false,
    auxilio_creche: false,
    auxilio_moradia: false,
    bolsa_estudantil: false,
    bolsa_permanencia_mec: false,
    paiq: false,
    moradia_estudantil: false,
    isencao_ru: false,
    isencao_esporte: false,
    isencao_idiomas: false,
    acesso_laboratorios: [],
    acesso_predios: [],
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [credentialFormat, setCredentialFormat] = useState<'sd-jwt' | 'anoncreds'>('sd-jwt');
  const [issuedCredential, setIssuedCredential] = useState<string | null>(null);

  // Trust chain state
  const [trustedIssuers, setTrustedIssuers] = useState<TrustedIssuer[]>([]);
  const [childDid, setChildDid] = useState('');
  const [childName, setChildName] = useState('');
  const [selectedParentDid, setSelectedParentDid] = useState<string | null>(null);
  const [isChainLoading, setIsChainLoading] = useState(false);
  const [chainExpanded, setChainExpanded] = useState(false);

  const loadTrustChain = useCallback(async () => {
    try {
      const issuers = await TrustChainService.getAllIssuers();
      setTrustedIssuers(issuers);
    } catch {}
  }, []);

  useEffect(() => {
    loadTrustChain();
  }, [loadTrustChain]);

  const handleInitializeRoot = async () => {
    setIsChainLoading(true);
    setGeneralError(null);
    try {
      const issuerDid = await StorageService.getRawItem('issuer_did');
      const rootDid = issuerDid || 'did:web:ufsc.br';
      await TrustChainService.initializeRootIssuer(rootDid, 'UFSC - Âncora Raiz');
      await loadTrustChain();
      setSuccessMessage('Âncora raiz da cadeia de confiança inicializada!');
      addLog({
        operation: 'trust_chain_init',
        module: 'emissor',
        details: {root_did: rootDid},
        success: true,
      });
    } catch (err) {
      setGeneralError(
        `Erro ao inicializar âncora: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setIsChainLoading(false);
    }
  };

  const handleRegisterChild = async () => {
    if (!childDid.trim() || !childName.trim()) {
      setGeneralError('DID e nome do emissor filho são obrigatórios');
      return;
    }
    setIsChainLoading(true);
    setGeneralError(null);
    try {
      // Use selected parent or fall back to root
      const parentDid = selectedParentDid
        || (await TrustChainService.getRootIssuer())?.did;
      if (!parentDid) {
        setGeneralError('Emissor pai não selecionado e âncora raiz não inicializada');
        return;
      }
      const parentKey = await TrustChainService.getIssuerPrivateKey(parentDid);
      if (!parentKey) {
        setGeneralError(`Chave privada do emissor pai não encontrada: ${parentDid}`);
        return;
      }
      await TrustChainService.registerChildIssuer(
        parentDid,
        parentKey,
        childDid.trim(),
        childName.trim(),
      );
      await loadTrustChain();
      setChildDid('');
      setChildName('');
      setSelectedParentDid(null);
      setSuccessMessage(`Emissor "${childName.trim()}" registrado sob ${parentDid}!`);
      addLog({
        operation: 'trust_chain_register',
        module: 'emissor',
        details: {
          parent_did: parentDid,
          child_did: childDid.trim(),
          child_name: childName.trim(),
        },
        success: true,
      });
    } catch (err) {
      setGeneralError(
        `Erro ao registrar emissor: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setIsChainLoading(false);
    }
  };

  // Validation function
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.nome_completo || formData.nome_completo.trim() === '') {
      newErrors.nome_completo = 'Nome completo é obrigatório';
    }

    if (!formData.cpf || formData.cpf.trim() === '') {
      newErrors.cpf = 'CPF é obrigatório';
    } else if (!/^\d{11}$/.test(formData.cpf.replace(/\D/g, ''))) {
      newErrors.cpf = 'CPF deve conter 11 dígitos';
    }

    if (!formData.matricula || formData.matricula.trim() === '') {
      newErrors.matricula = 'Matrícula é obrigatória';
    }

    if (!formData.curso || formData.curso.trim() === '') {
      newErrors.curso = 'Curso é obrigatório';
    }

    if (!formData.status_matricula) {
      newErrors.status_matricula = 'Status de matrícula é obrigatório';
    }

    if (!formData.data_nascimento || formData.data_nascimento.trim() === '') {
      newErrors.data_nascimento = 'Data de nascimento é obrigatória';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.data_nascimento)) {
      newErrors.data_nascimento =
        'Data de nascimento deve estar no formato AAAA-MM-DD';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleIssueCredential = async () => {
    setSuccessMessage(null);
    setGeneralError(null);
    setIssuedCredential(null);

    if (!validateForm()) {
      setGeneralError('Por favor, corrija os erros no formulário');
      return;
    }

    if (!holderDID) {
      setGeneralError('DID do titular não encontrado. Inicialize o sistema primeiro.');
      return;
    }

    setIsLoading(true);

    try {
      const credential = await CredentialService.issueCredential(
        formData as StudentData,
        holderDID,
        credentialFormat,
      );

      // Store the issuer DID in global state
      const issuerDID = await StorageService.getRawItem('issuer_did');
      if (issuerDID) {
        setIssuerDID(issuerDID);
      }

      // Copy to clipboard for transfer to Holder module
      Clipboard.setString(credential);

      addLog({
        operation: 'credential_issuance',
        module: 'emissor',
        details: {
          algorithm: credentialFormat === 'sd-jwt' ? 'EdDSA' : 'CL-Signature',
          did_method: 'did:web',
          format: credentialFormat,
          holder: holderDID,
        },
        success: true,
      });

      setIssuedCredential(credential);
      setSuccessMessage(
        `Credencial ${credentialFormat.toUpperCase()} emitida com sucesso! Token copiado para a área de transferência.`,
      );

      // Clear form after successful issuance
      setFormData({
        nome_completo: '',
        cpf: '',
        matricula: '',
        curso: '',
        status_matricula: 'Ativo',
        data_nascimento: '',
        alojamento_indigena: false,
        auxilio_creche: false,
        auxilio_moradia: false,
        bolsa_estudantil: false,
        bolsa_permanencia_mec: false,
        paiq: false,
        moradia_estudantil: false,
        isencao_ru: false,
        isencao_esporte: false,
        isencao_idiomas: false,
        acesso_laboratorios: [],
        acesso_predios: [],
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      setGeneralError(`Erro ao emitir credencial: ${errorMessage}`);

      addLog({
        operation: 'error',
        module: 'emissor',
        details: {
          stack_trace: error instanceof Error ? error.stack : undefined,
          format: credentialFormat,
        },
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Módulo Emissor</Text>
        <Text style={styles.subtitle}>
          Simula a emissão de credenciais pela UFSC
        </Text>

        {generalError && <ErrorMessage message={generalError} />}
        {successMessage && <SuccessMessage message={successMessage} />}

        {/* Trust Chain Management */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.chainHeader}
            onPress={() => setChainExpanded(!chainExpanded)}>
            <Text style={styles.sectionTitle}>
              🔗 Cadeia de Confiança {chainExpanded ? '▼' : '▶'}
            </Text>
            <Text style={styles.chainBadge}>
              {trustedIssuers.length} emissor(es)
            </Text>
          </TouchableOpacity>

          {chainExpanded && (
            <View>
              {/* Root Initialization */}
              {trustedIssuers.length === 0 ? (
                <View style={styles.chainEmptyState}>
                  <Text style={styles.chainEmptyText}>
                    Nenhuma cadeia de confiança configurada. Inicialize a âncora raiz para começar.
                  </Text>
                  <TouchableOpacity
                    style={styles.chainButton}
                    onPress={handleInitializeRoot}
                    disabled={isChainLoading}>
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
                          <Text style={styles.chainIssuerIcon}>
                            {issuer.parentDid === null ? '🏛️' : '🏢'}
                          </Text>
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
                          <Text style={styles.chainParentLabel}>
                            ↑ assinado por: {issuer.parentDid}
                          </Text>
                        )}
                        {idx < trustedIssuers.length - 1 && issuer.parentDid === null && (
                          <View style={styles.chainConnector}>
                            <Text style={styles.chainConnectorText}>│</Text>
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

                    {/* Parent Selector */}
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
                          onPress={() => setSelectedParentDid(
                            selectedParentDid === issuer.did ? null : issuer.did,
                          )}>
                          <Text
                            style={[
                              styles.parentChipText,
                              selectedParentDid === issuer.did && styles.parentChipTextSelected,
                            ]}
                            numberOfLines={1}>
                            {issuer.parentDid === null ? '🏛️ ' : '🏢 '}
                            {issuer.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    {selectedParentDid && (
                      <Text style={styles.parentSelectedHint}>
                        Pai selecionado: {selectedParentDid}
                      </Text>
                    )}
                    {!selectedParentDid && (
                      <Text style={styles.parentSelectedHint}>
                        Nenhum pai selecionado — usará a âncora raiz
                      </Text>
                    )}

                    <TextInput
                      style={[styles.input, {marginTop: 12}]}
                      value={childDid}
                      onChangeText={setChildDid}
                      placeholder="DID do emissor (ex: did:web:dept.ufsc.br)"
                      editable={!isChainLoading}
                    />
                    <TextInput
                      style={[styles.input, {marginTop: 8}]}
                      value={childName}
                      onChangeText={setChildName}
                      placeholder="Nome do emissor (ex: CAGR)"
                      editable={!isChainLoading}
                    />
                    <TouchableOpacity
                      style={[styles.chainButton, {marginTop: 12}]}
                      onPress={handleRegisterChild}
                      disabled={isChainLoading || !childDid.trim() || !childName.trim()}>
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

        {/* Credential Format Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Formato da Credencial</Text>
          <View style={styles.statusContainer}>
            <TouchableOpacity
              style={[
                styles.statusButton,
                credentialFormat === 'sd-jwt' && styles.statusButtonActive,
              ]}
              onPress={() => setCredentialFormat('sd-jwt')}
              disabled={isLoading}>
              <Text
                style={[
                  styles.statusButtonText,
                  credentialFormat === 'sd-jwt' && styles.statusButtonTextActive,
                ]}>
                SD-JWT
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.statusButton,
                credentialFormat === 'anoncreds' && styles.statusButtonActive,
              ]}
              onPress={() => setCredentialFormat('anoncreds')}
              disabled={isLoading}>
              <Text
                style={[
                  styles.statusButtonText,
                  credentialFormat === 'anoncreds' && styles.statusButtonTextActive,
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
              onPress={() => {
                Clipboard.setString(issuedCredential);
                setSuccessMessage('Token copiado para a área de transferência!');
              }}>
              <Text style={styles.copyButtonText}>Copiar Token</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Required Fields Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados Obrigatórios</Text>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Nome Completo *</Text>
            <TextInput
              style={[styles.input, errors.nome_completo && styles.inputError]}
              value={formData.nome_completo}
              onChangeText={text =>
                setFormData({...formData, nome_completo: text})
              }
              placeholder="Digite o nome completo"
              editable={!isLoading}
            />
            {errors.nome_completo && (
              <Text style={styles.errorText}>{errors.nome_completo}</Text>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>CPF *</Text>
            <TextInput
              style={[styles.input, errors.cpf && styles.inputError]}
              value={formData.cpf}
              onChangeText={text => setFormData({...formData, cpf: text})}
              placeholder="Digite o CPF (11 dígitos)"
              keyboardType="numeric"
              editable={!isLoading}
            />
            {errors.cpf && <Text style={styles.errorText}>{errors.cpf}</Text>}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Matrícula *</Text>
            <TextInput
              style={[styles.input, errors.matricula && styles.inputError]}
              value={formData.matricula}
              onChangeText={text =>
                setFormData({...formData, matricula: text})
              }
              placeholder="Digite a matrícula"
              editable={!isLoading}
            />
            {errors.matricula && (
              <Text style={styles.errorText}>{errors.matricula}</Text>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Curso *</Text>
            <TextInput
              style={[styles.input, errors.curso && styles.inputError]}
              value={formData.curso}
              onChangeText={text => setFormData({...formData, curso: text})}
              placeholder="Digite o curso"
              editable={!isLoading}
            />
            {errors.curso && (
              <Text style={styles.errorText}>{errors.curso}</Text>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Status de Matrícula *</Text>
            <View style={styles.statusContainer}>
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  formData.status_matricula === 'Ativo' &&
                    styles.statusButtonActive,
                ]}
                onPress={() =>
                  setFormData({...formData, status_matricula: 'Ativo'})
                }
                disabled={isLoading}>
                <Text
                  style={[
                    styles.statusButtonText,
                    formData.status_matricula === 'Ativo' &&
                      styles.statusButtonTextActive,
                  ]}>
                  Ativo
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  formData.status_matricula === 'Inativo' &&
                    styles.statusButtonActive,
                ]}
                onPress={() =>
                  setFormData({...formData, status_matricula: 'Inativo'})
                }
                disabled={isLoading}>
                <Text
                  style={[
                    styles.statusButtonText,
                    formData.status_matricula === 'Inativo' &&
                      styles.statusButtonTextActive,
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
            <Text style={styles.label}>Data de Nascimento *</Text>
            <TextInput
              style={[
                styles.input,
                errors.data_nascimento && styles.inputError,
              ]}
              value={formData.data_nascimento}
              onChangeText={text =>
                setFormData({...formData, data_nascimento: text})
              }
              placeholder="AAAA-MM-DD"
              editable={!isLoading}
            />
            {errors.data_nascimento && (
              <Text style={styles.errorText}>{errors.data_nascimento}</Text>
            )}
          </View>
        </View>

        {/* Benefits Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Benefícios e Programas</Text>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Alojamento Indígena</Text>
            <Switch
              value={formData.alojamento_indigena}
              onValueChange={value =>
                setFormData({...formData, alojamento_indigena: value})
              }
              disabled={isLoading}
            />
          </View>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Auxílio Creche</Text>
            <Switch
              value={formData.auxilio_creche}
              onValueChange={value =>
                setFormData({...formData, auxilio_creche: value})
              }
              disabled={isLoading}
            />
          </View>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Auxílio Moradia</Text>
            <Switch
              value={formData.auxilio_moradia}
              onValueChange={value =>
                setFormData({...formData, auxilio_moradia: value})
              }
              disabled={isLoading}
            />
          </View>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Bolsa Estudantil</Text>
            <Switch
              value={formData.bolsa_estudantil}
              onValueChange={value =>
                setFormData({...formData, bolsa_estudantil: value})
              }
              disabled={isLoading}
            />
          </View>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Bolsa Permanência MEC</Text>
            <Switch
              value={formData.bolsa_permanencia_mec}
              onValueChange={value =>
                setFormData({...formData, bolsa_permanencia_mec: value})
              }
              disabled={isLoading}
            />
          </View>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>PAIQ</Text>
            <Switch
              value={formData.paiq}
              onValueChange={value => setFormData({...formData, paiq: value})}
              disabled={isLoading}
            />
          </View>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Moradia Estudantil</Text>
            <Switch
              value={formData.moradia_estudantil}
              onValueChange={value =>
                setFormData({...formData, moradia_estudantil: value})
              }
              disabled={isLoading}
            />
          </View>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Isenção RU</Text>
            <Switch
              value={formData.isencao_ru}
              onValueChange={value =>
                setFormData({...formData, isencao_ru: value})
              }
              disabled={isLoading}
            />
          </View>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Isenção Esporte</Text>
            <Switch
              value={formData.isencao_esporte}
              onValueChange={value =>
                setFormData({...formData, isencao_esporte: value})
              }
              disabled={isLoading}
            />
          </View>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Isenção Idiomas</Text>
            <Switch
              value={formData.isencao_idiomas}
              onValueChange={value =>
                setFormData({...formData, isencao_idiomas: value})
              }
              disabled={isLoading}
            />
          </View>
        </View>

        {/* Issue Button */}
        <View style={styles.buttonContainer}>
          {isLoading ? (
            <LoadingIndicator message="Emitindo credencial..." />
          ) : (
            <TouchableOpacity
              style={styles.issueButton}
              onPress={handleIssueCredential}
              disabled={isLoading}>
              <Text style={styles.issueButtonText}>Emitir Credencial</Text>
            </TouchableOpacity>
          )}
        </View>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 16,
  },
  chainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chainBadge: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#e8f0fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chainEmptyState: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  chainEmptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  chainButton: {
    backgroundColor: '#1565C0',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  chainButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  chainList: {
    marginBottom: 16,
  },
  chainIssuerCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#90CAF9',
  },
  chainRootCard: {
    borderLeftColor: '#1565C0',
    backgroundColor: '#e8f0fe',
  },
  chainIssuerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chainIssuerIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  chainIssuerInfo: {
    flex: 1,
  },
  chainIssuerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  chainIssuerDid: {
    fontSize: 11,
    color: '#666',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  chainParentLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
    marginLeft: 30,
  },
  chainConnector: {
    alignItems: 'center',
    marginVertical: 2,
  },
  chainConnectorText: {
    fontSize: 16,
    color: '#90CAF9',
  },
  chainRegisterSection: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 16,
  },
  chainRegisterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  parentSelectorLabel: {
    fontSize: 13,
    color: '#555',
    marginBottom: 6,
  },
  parentSelectorRow: {
    flexDirection: 'row',
    marginBottom: 4,
    maxHeight: 40,
  },
  parentChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
  },
  parentChipSelected: {
    backgroundColor: '#1565C0',
    borderColor: '#1565C0',
  },
  parentChipText: {
    fontSize: 12,
    color: '#333',
  },
  parentChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  parentSelectedHint: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
    fontStyle: 'italic',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#c62828',
  },
  errorText: {
    fontSize: 12,
    color: '#c62828',
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statusButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    alignItems: 'center',
  },
  statusButtonActive: {
    backgroundColor: '#003366',
    borderColor: '#003366',
  },
  statusButtonText: {
    fontSize: 16,
    color: '#666',
  },
  statusButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  buttonContainer: {
    marginTop: 8,
    marginBottom: 32,
  },
  issueButton: {
    backgroundColor: '#003366',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  issueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  credentialToken: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 4,
    marginBottom: 12,
  },
  copyButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default IssuerScreen;
