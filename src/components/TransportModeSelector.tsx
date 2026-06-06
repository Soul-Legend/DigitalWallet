import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';
import {TransportMode} from '../services/TransportService';
import {scaleFontSize} from '../utils/theme';

interface TransportModeSelectorProps {
  selectedMode: TransportMode;
  onSelectMode: (mode: TransportMode) => void;
  disabled?: boolean;
}

const TRANSPORT_OPTIONS: {
  mode: TransportMode;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  description: string;
}[] = [
  {
    mode: 'clipboard',
    label: 'Clipboard',
    icon: 'content-copy',
    description: 'Copiar/Colar manual',
  },
  {
    mode: 'qrcode',
    label: 'QR Code',
    icon: 'qr-code-scanner',
    description: 'Leitura via câmera',
  },
];

const TransportModeSelector: React.FC<TransportModeSelectorProps> = ({
  selectedMode,
  onSelectMode,
  disabled = false,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Modo de Transporte</Text>
      <View style={styles.optionsRow}>
        {TRANSPORT_OPTIONS.map(option => {
          const isSelected = selectedMode === option.mode;
          return (
            <TouchableOpacity
              key={option.mode}
              style={[
                styles.option,
                isSelected && styles.optionSelected,
                disabled && styles.optionDisabled,
              ]}
              onPress={() => onSelectMode(option.mode)}
              disabled={disabled}
              activeOpacity={0.8}>
              <MaterialIcons
                name={option.icon}
                size={28}
                color={isSelected ? '#003a8c' : '#737784'}
                style={styles.optionIcon}
              />
              <Text
                style={[
                  styles.optionLabel,
                  isSelected && styles.optionLabelSelected,
                ]}>
                {option.label}
              </Text>
              <Text
                style={[
                  styles.optionDescription,
                  isSelected && styles.optionDescriptionSelected,
                ]}>
                {option.description}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff', // surface-container-lowest
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    // Ambient shadow
    shadowColor: '#1b1b1c',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 2,
  },
  title: {
    fontSize: scaleFontSize(16),
    fontWeight: '700',
    color: '#003a8c', // primary
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  option: {
    flex: 1,
    backgroundColor: '#f6f3f2', // surface-container-low
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    // No borders
  },
  optionSelected: {
    backgroundColor: '#d9e2ff', // primary-fixed
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionIcon: {
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: scaleFontSize(14),
    fontWeight: '700',
    color: '#434653', // on-surface-variant
    marginBottom: 4,
  },
  optionLabelSelected: {
    color: '#001a41', // on-primary-fixed
  },
  optionDescription: {
    fontSize: scaleFontSize(11),
    color: '#737784', // outline
    textAlign: 'center',
    lineHeight: scaleFontSize(16),
  },
  optionDescriptionSelected: {
    color: '#003a8c', // primary
  },
});

export default TransportModeSelector;
