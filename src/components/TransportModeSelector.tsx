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
    label: 'Texto (Colar)',
    icon: 'content-copy',
  },
  {
    mode: 'qrcode',
    label: 'Câmera (QR)',
    icon: 'qr-code-scanner',
  },
];

const TransportModeSelector: React.FC<TransportModeSelectorProps> = ({
  selectedMode,
  onSelectMode,
  disabled = false,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Como você deseja inserir os dados?</Text>
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
                size={16}
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
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  title: {
    fontSize: scaleFontSize(12),
    fontWeight: '700',
    color: '#737784',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  optionsRow: {
    flexDirection: 'row',
    backgroundColor: '#e5e2e1', // surface-container-highest
    borderRadius: 8,
    padding: 4,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  optionSelected: {
    backgroundColor: '#ffffff',
    shadowColor: '#1b1b1c',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionIcon: {
    marginBottom: 0,
  },
  optionLabel: {
    fontSize: scaleFontSize(13),
    fontWeight: '600',
    color: '#434653',
  },
  optionLabelSelected: {
    color: '#003a8c', // primary
  },
});

export default TransportModeSelector;
