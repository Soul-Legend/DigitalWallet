import React, {useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';
import {useAppStore} from '../stores/useAppStore';
import {AppModule, AppModuleType} from '../utils/constants';

type MaterialIconName = keyof typeof MaterialIcons.glyphMap;

interface Props {
  navigation: any;
}

const HomeScreen: React.FC<Props> = ({navigation}) => {
  const setCurrentModule = useAppStore(state => state.setCurrentModule);

  useEffect(() => {
    setCurrentModule(AppModule.HOME);
  }, [setCurrentModule]);

  const modules: {
    name: string;
    description: string;
    route: string;
    icon: MaterialIconName;
    iconBg: string;
    iconColor: string;
    isStackRoute?: boolean;
  }[] = [
    {
      name: 'Minha Carteira',
      description:
        'Acesse e gerencie suas credenciais digitais armazenadas com segurança.',
      route: 'Titular',
      icon: 'account-balance-wallet',
      iconBg: '#d9e2ff', // primary-fixed
      iconColor: '#003a8c',
      isStackRoute: true,
    },
    {
      name: 'Emitir Credencial',
      description:
        'Emita novas credenciais verificáveis para outros estudantes ou entidades.',
      route: 'Emissor',
      icon: 'add-moderator',
      iconBg: '#ffe089', // secondary-fixed
      iconColor: '#6e5700',
    },
    {
      name: 'Validar',
      description:
        'Verifique a autenticidade de credenciais apresentadas a você.',
      route: 'Verificador',
      icon: 'verified-user',
      iconBg: '#8ffb85', // tertiary-fixed
      iconColor: '#004a09',
    },
    {
      name: 'Eventos',
      description:
        'Consulte o histórico de atividades e logs de suas credenciais.',
      route: 'Logs',
      icon: 'history-edu',
      iconBg: '#eae7e7', // surface-container-high
      iconColor: '#1b1b1c',
    },
    {
      name: 'Glossário',
      description: 'Aprenda os termos técnicos e conceitos do ecossistema SSI.',
      route: 'Glossario',
      icon: 'menu-book',
      iconBg: '#eae7e7', // surface-container-high
      iconColor: '#1b1b1c',
    },
    {
      name: 'Diagnósticos E2E',
      description: 'Execute testes automatizados no dispositivo e exporte relatórios.',
      route: 'Diagnostics',
      icon: 'build',
      iconBg: '#f0eded', // surface-container
      iconColor: '#434653',
      isStackRoute: true,
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.heroGradientOverlay} />
        <Text style={styles.heroEyebrow}>CARTEIRA DIGITAL SSI</Text>
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
              if (module.isStackRoute) {
                // Navigate via parent stack navigator
                navigation.navigate(module.route);
              } else {
                // Navigate to tab by jumping
                navigation.navigate(module.route);
              }
            }}
            activeOpacity={0.7}
            accessible={true}
            accessibilityLabel={`Módulo ${module.name}`}
            accessibilityHint={module.description}
            accessibilityRole="button">
            <View style={styles.moduleCardInner}>
              <View
                style={[
                  styles.moduleIconContainer,
                  {backgroundColor: module.iconBg},
                ]}>
                <MaterialIcons
                  name={module.icon}
                  size={24}
                  color={module.iconColor}
                />
              </View>
              <View style={styles.moduleTextContainer}>
                <Text style={styles.moduleName}>{module.name}</Text>
                <Text style={styles.moduleDescription}>{module.description}</Text>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={24}
                color="#c3c6d5"
              />
            </View>
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
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 28,
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
    borderRadius: 16,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#b8cbff', // on-primary-container
    lineHeight: 22,
  },
  modulesContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  moduleCard: {
    backgroundColor: '#ffffff', // surface-container-lowest
    borderRadius: 16,
    marginBottom: 10,
    // Ambient shadow per DESIGN.md (no borders)
    shadowColor: '#1b1b1c',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 2,
    minHeight: 44, // Minimum touch target
  },
  moduleCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  moduleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleTextContainer: {
    flex: 1,
  },
  moduleName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1b1b1c', // on-surface
    marginBottom: 4,
  },
  moduleDescription: {
    fontSize: 13,
    color: '#434653', // on-surface-variant
    lineHeight: 18,
  },
});

export default HomeScreen;
