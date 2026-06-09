import React, {useRef, useCallback} from 'react';
import {Animated, Easing, StatusBar} from 'react-native';
import {NavigationContainer, useFocusEffect} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {MaterialIcons} from '@expo/vector-icons';

// Import screens
import InitializationScreen from './screens/InitializationScreen';
import HomeScreen from './screens/HomeScreen';
import IssuerScreen from './screens/IssuerScreen';
import HolderScreen from './screens/HolderScreen';
import VerifierScreen from './screens/VerifierScreen';
import LogsScreen from './screens/LogsScreen';
import GlossaryScreen from './screens/GlossaryScreen';
import DiagnosticsScreen from './screens/DiagnosticsScreen';

// ── Type Definitions ─────────────────────────────────────────────────
export type RootStackParamList = {
  Initialization: undefined;
  MainTabs: undefined;
  Diagnostics: undefined;
  // Keep legacy route names so existing navigation.navigate() calls still work
  Home: undefined;
  Emissor: undefined;
  Titular: undefined;
  Verificador: undefined;
  Logs: undefined;
  Glossario: undefined;
};

export type TabParamList = {
  Home: undefined;
  Emissor: undefined;
  Titular: undefined;
  Verificador: undefined;
  Logs: undefined;
  Glossario: undefined;
};

// ── Navigators ───────────────────────────────────────────────────────
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// ── Design Tokens (inline for nav) ───────────────────────────────────
const NAV_COLORS = {
  headerBg: '#1351b4',
  tabBarBg: '#fcf9f8',
  tabBarBorder: 'rgba(229, 226, 225, 0.2)',
  tabActive: '#1351b4',
  tabInactive: '#94a3b8',
  white: '#ffffff',
};

// ── Tab Icon Mapping ────────────────────────────────────────────────
const TAB_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  Home: 'menu',
  Titular: 'account-balance-wallet',
  Emissor: 'add-moderator',
  Verificador: 'verified-user',
  Logs: 'history-edu',
  Glossario: 'menu-book',
};

const TAB_LABELS: Record<string, string> = {
  Home: 'Menu',
  Titular: 'Vault',
  Emissor: 'Issue',
  Verificador: 'Verify',
  Logs: 'Logs',
  Glossario: 'Glossary',
};

// ── Animations ───────────────────────────────────────────────────────
const withTabAnimation = (WrappedComponent: React.ComponentType<any>) => {
  return function AnimatedTabWrapper(props: any) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(15)).current;

    useFocusEffect(
      useCallback(() => {
        fadeAnim.setValue(0);
        translateY.setValue(15);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 250,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]).start();
      }, [fadeAnim, translateY]),
    );

    return (
      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{translateY}],
        }}>
        <WrappedComponent {...props} />
      </Animated.View>
    );
  };
};

const AnimatedHome = withTabAnimation(HomeScreen);
const AnimatedHolder = withTabAnimation(HolderScreen);
const AnimatedIssuer = withTabAnimation(IssuerScreen);
const AnimatedVerifier = withTabAnimation(VerifierScreen);
const AnimatedLogs = withTabAnimation(LogsScreen);
const AnimatedGlossary = withTabAnimation(GlossaryScreen);

// ── Bottom Tab Navigator ─────────────────────────────────────────────
function MainTabNavigator(): React.JSX.Element {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarIcon: ({color, size}) => {
          const iconName = TAB_ICONS[route.name] || 'help-outline';
          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarLabel: TAB_LABELS[route.name] || route.name,
        tabBarActiveTintColor: NAV_COLORS.tabActive,
        tabBarInactiveTintColor: NAV_COLORS.tabInactive,
        tabBarStyle: {
          backgroundColor: NAV_COLORS.tabBarBg,
          borderTopColor: NAV_COLORS.tabBarBorder,
          borderTopWidth: 1,
          paddingTop: 6,
          paddingBottom: 8,
          height: 64,
          shadowColor: 'rgba(0, 0, 0, 0.05)',
          shadowOffset: {width: 0, height: -4},
          shadowOpacity: 1,
          shadowRadius: 20,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600' as const,
          textTransform: 'uppercase' as const,
          letterSpacing: 0.8,
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
      })}>
      <Tab.Screen
        name="Home"
        component={AnimatedHome}
        options={{title: 'Menu Principal'}}
      />
      <Tab.Screen
        name="Titular"
        component={AnimatedHolder}
        options={{title: 'Minha Carteira Acadêmica'}}
      />
      <Tab.Screen
        name="Emissor"
        component={AnimatedIssuer}
        options={{title: 'Nova Credencial Acadêmica'}}
      />
      <Tab.Screen
        name="Verificador"
        component={AnimatedVerifier}
        options={{title: 'Verificador de Credenciais'}}
      />
      <Tab.Screen
        name="Logs"
        component={AnimatedLogs}
        options={{title: 'Atividades de Segurança'}}
      />
      <Tab.Screen
        name="Glossario"
        component={AnimatedGlossary}
        options={{title: 'Glossário SSI'}}
      />
    </Tab.Navigator>
  );
}

// ── Root Stack Navigator ─────────────────────────────────────────────
function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#fcf9f8" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Initialization"
          screenOptions={{
            animation: 'slide_from_right',
            headerStyle: {
              backgroundColor: NAV_COLORS.headerBg,
            },
            headerTintColor: NAV_COLORS.white,
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            headerShadowVisible: false,
          }}>
          <Stack.Screen
            name="Initialization"
            component={InitializationScreen}
            options={{headerShown: false}}
          />
          <Stack.Screen
            name="MainTabs"
            component={MainTabNavigator}
            options={{headerShown: false}}
          />
          <Stack.Screen
            name="Diagnostics"
            component={DiagnosticsScreen}
            options={{title: 'Diagnósticos E2E'}}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
