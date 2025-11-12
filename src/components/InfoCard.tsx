import React from 'react';
import {View, Text, StyleSheet, ViewStyle, TextStyle} from 'react-native';

interface InfoCardProps {
  title: string;
  value: string | number;
  unit?: string;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  valueStyle?: TextStyle;
}

const InfoCard: React.FC<InfoCardProps> = ({
  title,
  value,
  unit,
  style,
  titleStyle,
  valueStyle,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.title, titleStyle]}>{title}</Text>
      <View style={styles.valueContainer}>
        <Text style={[styles.value, valueStyle]}>
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  unit: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#666',
  },
});

export default InfoCard;

