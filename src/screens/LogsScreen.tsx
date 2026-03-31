import React, {useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {useAppStore} from '../stores/useAppStore';

const LogsScreen: React.FC = () => {
  const setCurrentModule = useAppStore(state => state.setCurrentModule);

  useEffect(() => {
    setCurrentModule('logs');
  }, [setCurrentModule]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.text}>Painel de Logs</Text>
        <Text style={styles.subtext}>
          Funcionalidade será implementada nas próximas tarefas
        </Text>
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 400,
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 12,
  },
  subtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default LogsScreen;
