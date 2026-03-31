import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

interface ErrorMessageProps {
  message: string;
  details?: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({message, details}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.message}>{message}</Text>
      {details && <Text style={styles.details}>{details}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#c62828',
    padding: 16,
    marginVertical: 8,
    borderRadius: 4,
  },
  icon: {
    fontSize: 24,
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#c62828',
    marginBottom: 4,
  },
  details: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});

export default ErrorMessage;
