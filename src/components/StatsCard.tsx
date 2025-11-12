import React from 'react';
import {View, Text, StyleSheet, ViewStyle} from 'react-native';

interface StatsCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: string;
  color?: string;
  style?: ViewStyle;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  unit,
  icon,
  color = '#2E7D32',
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <Text style={styles.title}>{title}</Text>
      <View style={styles.valueContainer}>
        <Text style={[styles.value, {color}]}>
          {value} {unit && <Text style={styles.unit}>{unit}</Text>}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    margin: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
  },
  icon: {
    fontSize: 32,
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  valueContainer: {
    alignItems: 'center',
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  unit: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#666',
  },
});

export default StatsCard;

