import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {SafeAreaProvider} from 'react-native-safe-area-context';

// Import screens (will be created in subsequent tasks)
import HomeScreen from './screens/HomeScreen';
import IssuerScreen from './screens/IssuerScreen';
import HolderScreen from './screens/HolderScreen';
import VerifierScreen from './screens/VerifierScreen';
import LogsScreen from './screens/LogsScreen';

export type RootStackParamList = {
  Home: undefined;
  Emissor: undefined;
  Titular: undefined;
  Verificador: undefined;
  Logs: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#003366',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}>
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
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
