import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
} from 'react-native';
import {useAppStore} from '../stores/useAppStore';
import {StudentData} from '../types';
import LoadingIndicator from '../components/LoadingIndicator';
import SuccessMessage from '../components/SuccessMessage';
import ErrorMessage from '../components/ErrorMessage';

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

    if (!validateForm()) {
      setGeneralError('Por favor, corrija os erros no formulário');
      return;
    }

    setIsLoading(true);

    try {
      // Simulate credential issuance (will be implemented in future tasks)
      await new Promise(resolve => setTimeout(resolve, 1500));

      addLog({
        operation: 'credential_issuance',
        module: 'emissor',
        details: {
          algorithm: 'EdDSA',
          did_method: 'did:web',
        },
        success: true,
      });

      setSuccessMessage('Credencial emitida com sucesso!');

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
});

export default IssuerScreen;
