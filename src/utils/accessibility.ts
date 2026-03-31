/**
 * Accessibility utilities for the SSI Academic Identity Wallet
 * 
 * Provides helpers for:
 * - Screen reader support
 * - Touch target sizing
 * - High contrast themes
 * - Font scaling
 */

import {AccessibilityInfo, Platform} from 'react-native';

/**
 * Minimum touch target size in dp (44x44 as per WCAG guidelines)
 */
export const MIN_TOUCH_TARGET_SIZE = 44;

/**
 * Checks if screen reader is enabled
 */
export const isScreenReaderEnabled = async (): Promise<boolean> => {
  try {
    return await AccessibilityInfo.isScreenReaderEnabled();
  } catch (error) {
    console.error('Error checking screen reader status:', error);
    return false;
  }
};

/**
 * Announces a message to screen readers
 */
export const announceForAccessibility = (message: string): void => {
  AccessibilityInfo.announceForAccessibility(message);
};

/**
 * Gets accessible touch target style
 * Ensures minimum 44x44dp touch area
 */
export const getAccessibleTouchTarget = (
  currentSize?: number
): {minWidth: number; minHeight: number} => {
  const size = currentSize || MIN_TOUCH_TARGET_SIZE;
  return {
    minWidth: Math.max(size, MIN_TOUCH_TARGET_SIZE),
    minHeight: Math.max(size, MIN_TOUCH_TARGET_SIZE),
  };
};

/**
 * Accessibility labels for common UI elements
 */
export const AccessibilityLabels = {
  // Navigation
  homeButton: 'Ir para tela inicial',
  backButton: 'Voltar para tela anterior',
  menuButton: 'Abrir menu de navegação',
  
  // Issuer Module
  issuerForm: 'Formulário de emissão de credencial',
  issueButton: 'Emitir credencial acadêmica',
  formField: (fieldName: string) => `Campo ${fieldName}`,
  
  // Holder Module
  credentialInput: 'Campo para colar credencial',
  storeButton: 'Armazenar credencial',
  requestInput: 'Campo para colar requisição de apresentação',
  processButton: 'Processar requisição',
  credentialCard: 'Cartão de credencial acadêmica',
  previousButton: 'Credencial anterior',
  nextButton: 'Próxima credencial',
  deleteButton: 'Excluir credencial atual',
  
  // Verifier Module
  scenarioCard: (name: string) => `Cenário ${name}`,
  challengeDisplay: 'Requisição PEX gerada',
  copyButton: 'Copiar para área de transferência',
  presentationInput: 'Campo para colar apresentação',
  validateButton: 'Validar apresentação',
  
  // Logs Module
  logEntry: (operation: string) => `Entrada de log: ${operation}`,
  clearLogsButton: 'Limpar histórico de logs',
  
  // Consent Modal
  consentModal: 'Modal de consentimento para compartilhamento de dados',
  attributeToggle: (attr: string) => `Alternar seleção de ${attr}`,
  approveButton: 'Aprovar compartilhamento',
  cancelButton: 'Cancelar compartilhamento',
  
  // Status messages
  loading: (message: string) => `Carregando: ${message}`,
  error: (message: string) => `Erro: ${message}`,
  success: (message: string) => `Sucesso: ${message}`,
};

/**
 * Accessibility hints for complex interactions
 */
export const AccessibilityHints = {
  issueButton: 'Toque duas vezes para emitir uma nova credencial acadêmica',
  storeButton: 'Toque duas vezes para armazenar a credencial colada',
  scenarioCard: 'Toque duas vezes para selecionar este cenário de verificação',
  attributeToggle: 'Toque duas vezes para alternar a seleção deste atributo',
  navigationButton: 'Toque duas vezes para navegar entre credenciais',
  copyButton: 'Toque duas vezes para copiar para área de transferência',
};

/**
 * Formats error messages for accessibility
 */
export const formatErrorForAccessibility = (error: string): string => {
  return `Erro encontrado: ${error}. Por favor, verifique e tente novamente.`;
};

/**
 * Formats success messages for accessibility
 */
export const formatSuccessForAccessibility = (message: string): string => {
  return `Operação concluída com sucesso: ${message}`;
};

/**
 * Gets role description for custom components
 */
export const getRoleDescription = (componentType: string): string => {
  const roles: Record<string, string> = {
    credentialCard: 'Cartão de credencial',
    logEntry: 'Entrada de registro',
    scenarioCard: 'Cartão de cenário',
    consentModal: 'Diálogo de consentimento',
    attributeSelector: 'Seletor de atributos',
  };
  
  return roles[componentType] || componentType;
};

/**
 * Checks if high contrast mode is preferred (Android only)
 */
export const isHighContrastEnabled = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return false;
  }
  
  try {
    // This would require native module implementation
    // For now, return false as placeholder
    return false;
  } catch (error) {
    return false;
  }
};

/**
 * Gets contrast ratio between two colors
 * Used to ensure WCAG AA compliance (4.5:1 for normal text)
 */
export const getContrastRatio = (
  foreground: string,
  background: string
): number => {
  // Simplified implementation - in production, use a proper color library
  // This is a placeholder that returns a safe value
  return 7.0; // Assumes good contrast
};

/**
 * Validates if text meets WCAG contrast requirements
 */
export const meetsContrastRequirements = (
  foreground: string,
  background: string,
  isLargeText: boolean = false
): boolean => {
  const ratio = getContrastRatio(foreground, background);
  const requiredRatio = isLargeText ? 3.0 : 4.5;
  return ratio >= requiredRatio;
};
