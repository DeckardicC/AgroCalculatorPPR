import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {Product} from '../models/Product';
import {formatCurrency} from '../utils/formatting';

interface ProductCardProps {
  product: Product;
  onPress?: (product: Product) => void;
  showEfficacy?: boolean;
  efficacy?: number;
  costPerHectare?: number;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  showEfficacy = false,
  efficacy,
  costPerHectare,
}) => {
  const handlePress = () => {
    if (onPress) {
      onPress(product);
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      disabled={!onPress}>
      <View style={styles.header}>
        <Text style={styles.name}>{product.name}</Text>
        {product.nameEn && (
          <Text style={styles.nameEn}>{product.nameEn}</Text>
        )}
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Действующее вещество:</Text>
          <Text style={styles.value}>{product.activeIngredient}</Text>
        </View>

        {product.concentration && (
          <View style={styles.detailRow}>
            <Text style={styles.label}>Концентрация:</Text>
            <Text style={styles.value}>{product.concentration}</Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <Text style={styles.label}>Дозировка:</Text>
          <Text style={styles.value}>
            {product.minDosage} - {product.maxDosage} {product.unitDosage}
          </Text>
        </View>

        {product.waitingPeriod && (
          <View style={styles.detailRow}>
            <Text style={styles.label}>Срок ожидания:</Text>
            <Text style={styles.value}>{product.waitingPeriod} дней</Text>
          </View>
        )}

        {showEfficacy && efficacy !== undefined && (
          <View style={styles.detailRow}>
            <Text style={styles.label}>Эффективность:</Text>
            <Text style={[styles.value, styles.efficacy]}>
              {efficacy.toFixed(1)}%
            </Text>
          </View>
        )}

        {costPerHectare !== undefined && (
          <View style={styles.detailRow}>
            <Text style={styles.label}>Стоимость/га:</Text>
            <Text style={[styles.value, styles.cost]}>
              {formatCurrency(costPerHectare)}
            </Text>
          </View>
        )}

        {product.pricePerUnit && (
          <View style={styles.detailRow}>
            <Text style={styles.label}>Цена:</Text>
            <Text style={styles.value}>
              {formatCurrency(product.pricePerUnit)} / {product.unit}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 4,
  },
  nameEn: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  details: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  efficacy: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  cost: {
    color: '#1976D2',
    fontWeight: 'bold',
  },
});

export default ProductCard;

