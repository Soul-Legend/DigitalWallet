import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../App';
import {MaterialIcons} from '@expo/vector-icons';
import DIDService from '../services/DIDService';
import StorageService from '../services/StorageService';
import zkProofServiceInstance from '../services/ZKProofService';
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

      // Ensure ZK proof keys are provisioned (idempotent operation)
      await zkProofServiceInstance.provisionBundledZkeys();

      // Check if holder DID already exists
      const existingDID = await StorageService.getHolderDID();

      if (existingDID) {
        // Not first launch, update store and navigate to home
        setHolderDID(existingDID);
        navigation.replace('MainTabs');
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
    navigation.replace('MainTabs');
  };

  const renderContent = () => {
    switch (initState) {
      case 'checking':
        return (
          <View style={styles.contentContainer}>
            <View style={styles.loadingCircle}>
              <ActivityIndicator size="large" color="#003a8c" />
            </View>
            <Text style={styles.loadingTitle}>
              Verificando inicialização...
            </Text>
            <Text style={styles.loadingSubtext}>
              Aguarde enquanto preparamos sua carteira
            </Text>
          </View>
        );

      case 'generating':
        return (
          <View style={styles.contentContainer}>
            <View style={styles.loadingCircle}>
              <ActivityIndicator size="large" color="#003a8c" />
            </View>
            <Text style={styles.loadingTitle}>
              Gerando sua identidade digital...
            </Text>
            <Text style={styles.loadingSubtext}>
              Isso pode levar alguns segundos
            </Text>
          </View>
        );

      case 'success':
        return (
          <View style={styles.contentContainer}>
            {/* Success Icon */}
            <View style={styles.successIconCircle}>
              <MaterialIcons name="check" size={48} color="#002202" />
            </View>

            {/* Title */}
            <Text style={styles.successTitle}>
              Identidade Acadêmica{'\n'}Criada
            </Text>

            {/* Description */}
            <Text style={styles.infoText}>
              Seu DID (Decentralized Identifier) foi gerado e armazenado com
              segurança no seu dispositivo.
            </Text>

            {/* DID Display Card */}
            <View style={styles.didCard}>
              <View style={styles.didCardHeader}>
                <MaterialIcons name="fingerprint" size={16} color="#003a8c" />
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
                <MaterialIcons name="shield" size={16} color="#006511" />
              </View>
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
              activeOpacity={0.85}>
              <Text style={styles.continueButtonText}>Continuar</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        );

      case 'error':
        return (
          <View style={styles.contentContainer}>
            <View style={styles.errorIconCircle}>
              <MaterialIcons name="error-outline" size={48} color="#ba1a1a" />
            </View>
            <Text style={styles.errorTitle}>Erro na Inicialização</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
              activeOpacity={0.85}>
              <MaterialIcons name="refresh" size={20} color="#ffffff" />
              <Text style={styles.retryButtonText}>Tentar Novamente</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Subtle gradient overlay */}
      <View style={styles.gradientOverlay} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top Branding */}
        <View style={styles.branding}>
          <MaterialIcons name="school" size={28} color="#003a8c" />
          <Text style={styles.brandingText}>SSI Universitário</Text>
        </View>

        {renderContent()}
      </ScrollView>
    </SafeAreaView>
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
    paddingTop: 20,
    paddingBottom: 16,
    gap: 10,
  },
  brandingText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#003a8c', // primary
    letterSpacing: -0.3,
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  // Loading States
  loadingCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#d9e2ff', // primaryFixed
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  loadingTitle: {
    fontSize: 20,
    color: '#003a8c',
    fontWeight: '700',
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 15,
    color: '#434653', // on-surface-variant
    marginTop: 8,
    textAlign: 'center',
  },
  // Success State
  successIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#8ffb85', // tertiary-fixed
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    shadowColor: '#73dd6b',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 6,
  },
  successTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#1b1b1c', // on-surface
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -0.8,
    lineHeight: 40,
  },
  infoText: {
    fontSize: 16,
    color: '#434653', // on-surface-variant
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
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
  didLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#434653', // on-surface-variant
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
    fontWeight: '500',
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
    gap: 10,
    shadowColor: '#003a8c',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
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
  errorTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ba1a1a',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -0.5,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 3,
    shadowColor: '#ba1a1a',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default InitializationScreen;
