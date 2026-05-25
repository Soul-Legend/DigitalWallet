import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {SafeAreaProvider} from 'react-native-safe-area-context';

// Import screens
import InitializationScreen from './screens/InitializationScreen';
import HomeScreen from './screens/HomeScreen';
import IssuerScreen from './screens/IssuerScreen';
import HolderScreen from './screens/HolderScreen';
import VerifierScreen from './screens/VerifierScreen';
import LogsScreen from './screens/LogsScreen';
import GlossaryScreen from './screens/GlossaryScreen';

export type RootStackParamList = {
  Initialization: undefined;
  Home: undefined;
  Emissor: undefined;
  Titular: undefined;
  Verificador: undefined;
  Logs: undefined;
  Glossario: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Initialization"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#1351b4',
            },
            headerTintColor: '#ffffff',
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
            name="Home"
            component={HomeScreen}
            options={{title: 'Carteira Identidade Acadêmica'}}
          />
          <Stack.Screen
            name="Emissor"
            component={IssuerScreen}
            options={{title: 'Módulo Emissor'}}
          />
          <Stack.Screen
            name="Titular"
            component={HolderScreen}
            options={{title: 'Módulo Titular'}}
          />
          <Stack.Screen
            name="Verificador"
            component={VerifierScreen}
            options={{title: 'Módulo Verificador'}}
          />
          <Stack.Screen
            name="Logs"
            component={LogsScreen}
            options={{title: 'Painel de Logs'}}
          />
          <Stack.Screen
            name="Glossario"
            component={GlossaryScreen}
            options={{title: 'Glossário SSI'}}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
