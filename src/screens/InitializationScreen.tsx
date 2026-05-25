import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../App';
import DIDService from '../services/DIDService';
import StorageService from '../services/StorageService';
import {useAppStore} from '../stores/useAppStore';

type InitializationScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Initialization'
>;

interface Props {
  navigation: InitializationScreenNavigationProp;
}

type InitializationState = 'checking' | 'generating' | 'success' | 'error';

const InitializationScreen: React.FC<Props> = ({navigation}) => {
  const [initState, setInitState] = useState<InitializationState>('checking');
  const [generatedDID, setGeneratedDID] = useState<string>('');
  const [error, setError] = useState<string>('');
  const setHolderDID = useAppStore(appState => appState.setHolderDID);

  const generateIdentity = async () => {
    try {
      setInitState('generating');
      setError('');

      // Generate holder identity using did:key method
      const {did} = await DIDService.generateHolderIdentity('key');

      // Update state
      setGeneratedDID(did);
      setHolderDID(did);
      setInitState('success');
    } catch (err) {
      setInitState('error');
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao gerar identidade digital'
      );
    }
  };

  const checkFirstLaunch = async () => {
    try {
      setInitState('checking');

      // Check if holder DID already exists
      const existingDID = await StorageService.getHolderDID();

      if (existingDID) {
        // Not first launch, update store and navigate to home
        setHolderDID(existingDID);
        navigation.replace('Home');
      } else {
        // First launch, generate identity
        await generateIdentity();
      }
    } catch (err) {
      setInitState('error');
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao verificar inicialização'
      );
    }
  };

  useEffect(() => {
    checkFirstLaunch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetry = () => {
    generateIdentity();
  };

  const handleContinue = () => {
    navigation.replace('Home');
  };

  const renderContent = () => {
    switch (initState) {
      case 'checking':
        return (
          <View style={styles.contentContainer}>
            <ActivityIndicator size="large" color="#1351b4" />
            <Text style={styles.loadingText}>
              Verificando inicialização...
            </Text>
          </View>
        );

      case 'generating':
        return (
          <View style={styles.contentContainer}>
            <ActivityIndicator size="large" color="#1351b4" />
            <Text style={styles.loadingText}>
              Gerando sua identidade digital...
            </Text>
            <Text style={styles.subText}>
              Isso pode levar alguns segundos
            </Text>
          </View>
        );

      case 'success':
        return (
          <View style={styles.contentContainer}>
            {/* Success Icon */}
            <View style={styles.successIconCircle}>
              <Text style={styles.successCheckmark}>✓</Text>
            </View>

            {/* Title */}
            <Text style={styles.successTitle}>
              Identidade Acadêmica Criada
            </Text>

            {/* Description */}
            <Text style={styles.infoText}>
              Seu DID (Decentralized Identifier) foi gerado e armazenado com
              segurança no seu dispositivo.
            </Text>

            {/* DID Display Card */}
            <View style={styles.didCard}>
              <View style={styles.didCardHeader}>
                <Text style={styles.didFingerprint}>🔑</Text>
                <Text style={styles.didLabel}>
                  SEU IDENTIFICADOR DESCENTRALIZADO
                </Text>
              </View>
              <View style={styles.didCodeContainer}>
                <Text style={styles.didText} numberOfLines={3}>
                  {generatedDID}
                </Text>
              </View>
              <View style={styles.didFooter}>
                <Text style={styles.didFooterText}>Armazenado localmente</Text>
                <Text style={styles.didShield}>🛡️</Text>
              </View>
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}>
              <Text style={styles.continueButtonText}>Continuar</Text>
              <Text style={styles.continueArrow}>→</Text>
            </TouchableOpacity>
          </View>
        );

      case 'error':
        return (
          <View style={styles.contentContainer}>
            <View style={styles.errorIconCircle}>
              <Text style={styles.errorExclamation}>!</Text>
            </View>
            <Text style={styles.errorTitle}>Erro na Inicialização</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryButtonText}>Tentar Novamente</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Branding */}
      <View style={styles.branding}>
        <Text style={styles.brandingIcon}>🎓</Text>
        <Text style={styles.brandingText}>SSI Universitário</Text>
      </View>

      {/* Subtle gradient overlay */}
      <View style={styles.gradientOverlay} />

      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fcf9f8', // surface
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(0, 58, 140, 0.03)', // very subtle primary tint
  },
  branding: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
    paddingBottom: 16,
    gap: 8,
  },
  brandingIcon: {
    fontSize: 28,
  },
  brandingText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#003a8c', // primary
    letterSpacing: 0.5,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 18,
    color: '#003a8c',
    marginTop: 20,
    fontWeight: '600',
  },
  subText: {
    fontSize: 14,
    color: '#434653', // on-surface-variant
    marginTop: 8,
  },
  // Success State
  successIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#8ffb85', // tertiary-fixed
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#73dd6b',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  successCheckmark: {
    fontSize: 48,
    color: '#002202', // on-tertiary-fixed
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1b1b1c', // on-surface
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  infoText: {
    fontSize: 17,
    color: '#434653', // on-surface-variant
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 26,
    maxWidth: 340,
  },
  // DID Card
  didCard: {
    width: '100%',
    backgroundColor: '#f6f3f2', // surface-container-low
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
    borderLeftWidth: 4,
    borderLeftColor: '#003a8c', // primary
  },
  didCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  didFingerprint: {
    fontSize: 14,
  },
  didLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1b1b1c', // on-surface
    letterSpacing: 1,
  },
  didCodeContainer: {
    backgroundColor: '#e5e2e1', // surface-container-highest
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  didText: {
    fontSize: 13,
    color: '#434653', // on-surface-variant
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  didFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  didFooterText: {
    fontSize: 12,
    color: '#434653', // on-surface-variant
  },
  didShield: {
    fontSize: 14,
  },
  // Continue Button
  continueButton: {
    width: '100%',
    backgroundColor: '#003a8c', // primary
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#003a8c',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  continueArrow: {
    color: '#ffffff',
    fontSize: 20,
  },
  // Error State
  errorIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#ffdad6', // error-container
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  errorExclamation: {
    fontSize: 48,
    color: '#ba1a1a', // error
    fontWeight: 'bold',
  },
  errorTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ba1a1a',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#434653',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#ba1a1a',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#ba1a1a',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default InitializationScreen;
