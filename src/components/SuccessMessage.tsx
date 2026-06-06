import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';
import {scaleFontSize} from '../utils/theme';

interface SuccessMessageProps {
  message: string;
  details?: string;
}

const SuccessMessage: React.FC<SuccessMessageProps> = ({message, details}) => {
  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityLabel={`Sucesso: ${message}${details ? '. ' + details : ''}`}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite">
      <MaterialIcons name="check-circle" size={24} color="#006511" style={styles.icon} accessible={false} />
      <View style={styles.content}>
        <Text style={styles.message}>{message}</Text>
        {details && <Text style={styles.details}>{details}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#8ffb85', // tertiary-fixed
    borderLeftWidth: 4,
    borderLeftColor: '#006511', // tertiary
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
    color: '#002202', // on-tertiary-fixed
    marginBottom: 4,
  },
  details: {
    fontSize: scaleFontSize(13),
    color: '#002202', // on-tertiary-fixed
    lineHeight: scaleFontSize(18),
  },
});

export default SuccessMessage;
