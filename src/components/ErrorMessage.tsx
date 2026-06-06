import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';
import {scaleFontSize} from '../utils/theme';

interface ErrorMessageProps {
  message: string;
  details?: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({message, details}) => {
  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityLabel={`Erro: ${message}${details ? '. ' + details : ''}`}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive">
      <MaterialIcons name="error" size={24} color="#ba1a1a" style={styles.icon} accessible={false} />
      <View style={styles.content}>
        <Text style={styles.message}>{message}</Text>
        {details && <Text style={styles.details}>{details}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffdad6', // error-container
    borderLeftWidth: 4,
    borderLeftColor: '#ba1a1a', // error
    padding: 16,
    marginVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  icon: {
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  message: {
    fontSize: scaleFontSize(14),
    fontWeight: '700',
    color: '#93000a', // on-error-container
    marginBottom: 4,
  },
  details: {
    fontSize: scaleFontSize(13),
    color: '#410002', // on-error-container
    lineHeight: scaleFontSize(18),
  },
});

export default ErrorMessage;
