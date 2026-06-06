import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
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
  Home: 'account-balance-wallet',
  Emissor: 'add-moderator',
  Verificador: 'verified-user',
  Logs: 'history-edu',
  Glossario: 'menu-book',
};

const TAB_LABELS: Record<string, string> = {
  Home: 'Vault',
  Emissor: 'Issue',
  Verificador: 'Verify',
  Logs: 'Logs',
  Glossario: 'Glossary',
};

// ── Bottom Tab Navigator ─────────────────────────────────────────────
function MainTabNavigator(): React.JSX.Element {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({route}) => ({
        headerStyle: {
          backgroundColor: NAV_COLORS.headerBg,
          shadowColor: 'rgba(0, 26, 69, 0.2)',
          shadowOffset: {width: 0, height: 4},
          shadowOpacity: 1,
          shadowRadius: 12,
          elevation: 8,
        },
        headerTintColor: NAV_COLORS.white,
        headerTitleStyle: {
          fontWeight: '700' as const,
          fontSize: 18,
          letterSpacing: -0.3,
        },
        headerShadowVisible: false,
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
        component={HomeScreen}
        options={{title: 'Carteira Identidade Acadêmica'}}
      />
      <Tab.Screen
        name="Emissor"
        component={IssuerScreen}
        options={{title: 'Nova Credencial Acadêmica'}}
      />
      <Tab.Screen
        name="Verificador"
        component={VerifierScreen}
        options={{title: 'Verificador de Credenciais'}}
      />
      <Tab.Screen
        name="Logs"
        component={LogsScreen}
        options={{title: 'Atividades de Segurança'}}
      />
      <Tab.Screen
        name="Glossario"
        component={GlossaryScreen}
        options={{title: 'Glossário SSI'}}
      />
    </Tab.Navigator>
  );
}

// ── Root Stack Navigator ─────────────────────────────────────────────
function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Initialization"
          screenOptions={{
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
          {/* Holder is accessed from Home via navigation, not a tab */}
          <Stack.Screen
            name="Titular"
            component={HolderScreen}
            options={{title: 'Minha Carteira Acadêmica'}}
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
