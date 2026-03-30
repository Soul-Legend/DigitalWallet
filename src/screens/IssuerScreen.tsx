import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

const IssuerScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Módulo Emissor</Text>
      <Text style={styles.subtext}>
        Funcionalidade será implementada nas próximas tarefas
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
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

export default IssuerScreen;
