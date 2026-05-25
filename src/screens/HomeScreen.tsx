import React, {useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../App';
import {useAppStore} from '../stores/useAppStore';
import {AppModule, AppModuleType} from '../utils/constants';

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Home'
>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

const HomeScreen: React.FC<Props> = ({navigation}) => {
  const setCurrentModule = useAppStore(state => state.setCurrentModule);

  useEffect(() => {
    setCurrentModule(AppModule.HOME);
  }, [setCurrentModule]);
  const modules = [
    {
      name: 'Minha Carteira',
      description:
        'Acesse e gerencie suas credenciais digitais armazenadas com segurança.',
      route: 'Titular' as const,
      icon: '🔐',
      iconBg: '#d9e2ff', // primary-fixed
      iconColor: '#003a8c',
    },
    {
      name: 'Emitir Credencial',
      description:
        'Emita novas credenciais verificáveis para outros estudantes ou entidades.',
      route: 'Emissor' as const,
      icon: '🛡️',
      iconBg: '#ffe089', // secondary-fixed
      iconColor: '#6e5700',
    },
    {
      name: 'Validar',
      description:
        'Verifique a autenticidade de credenciais apresentadas a você.',
      route: 'Verificador' as const,
      icon: '✅',
      iconBg: '#8ffb85', // tertiary-fixed
      iconColor: '#004a09',
    },
    {
      name: 'Eventos',
      description:
        'Consulte o histórico de atividades e logs de suas credenciais.',
      route: 'Logs' as const,
      icon: '📜',
      iconBg: '#e5e2e1', // surface-container-highest
      iconColor: '#1b1b1c',
    },
    {
      name: 'Glossário',
      description: 'Aprenda os termos técnicos e conceitos do ecossistema SSI.',
      route: 'Glossario' as const,
      icon: '📖',
      iconBg: '#e5e2e1', // surface-container-highest
      iconColor: '#1b1b1c',
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.heroGradientOverlay} />
        <Text style={styles.heroTitle}>Olá, Estudante</Text>
        <Text style={styles.heroSubtitle}>
          Bem-vindo à sua Carteira Digital SSI. Gerencie suas credenciais
          verificáveis de forma segura e soberana.
        </Text>
      </View>

      {/* Feature Cards */}
      <View style={styles.modulesContainer}>
        {modules.map(module => (
          <TouchableOpacity
            key={module.route}
            style={styles.moduleCard}
            onPress={() => {
              setCurrentModule(
                module.route.toLowerCase() as AppModuleType,
              );
              navigation.navigate(module.route);
            }}
            accessible={true}
            accessibilityLabel={`Módulo ${module.name}`}
            accessibilityHint={module.description}
            accessibilityRole="button">
            <View
              style={[
                styles.moduleIconContainer,
                {backgroundColor: module.iconBg},
              ]}>
              <Text style={styles.moduleIcon} accessible={false}>
                {module.icon}
              </Text>
            </View>
            <Text style={styles.moduleName}>{module.name}</Text>
            <Text style={styles.moduleDescription}>{module.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fcf9f8', // surface
  },
  contentContainer: {
    paddingBottom: 32,
  },
  heroSection: {
    backgroundColor: '#1351b4', // primary-container
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 12,
    borderRadius: 12,
    padding: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  heroGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#b8cbff', // on-primary-container
    lineHeight: 24,
  },
  modulesContainer: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  moduleCard: {
    backgroundColor: '#ffffff', // surface-container-lowest
    borderRadius: 12,
    padding: 24,
    marginBottom: 12,
    // Ambient shadow per DESIGN.md (no borders)
    shadowColor: '#1b1b1c',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 2,
    minHeight: 44, // Minimum touch target
  },
  moduleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  moduleIcon: {
    fontSize: 24,
  },
  moduleName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1b1b1c', // on-surface
    marginBottom: 8,
  },
  moduleDescription: {
    fontSize: 14,
    color: '#434653', // on-surface-variant
    lineHeight: 20,
  },
});

export default HomeScreen;
