import React, {useCallback, useEffect, useState} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import ProductSelectionService, {RecommendedProduct} from '../../services/ProductSelectionService';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import ProductCard from '../../components/ProductCard';

type ProductResultsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'ProductResults'
>;
type ProductResultsScreenRouteProp = RouteProp<RootStackParamList, 'ProductResults'>;

const ProductResultsScreen = () => {
  const navigation = useNavigation<ProductResultsScreenNavigationProp>();
  const route = useRoute<ProductResultsScreenRouteProp>();
  const {cropId, pestIds, conditions} = route.params;

  const [recommendations, setRecommendations] = useState<RecommendedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      const results = await ProductSelectionService.selectProducts({
        cropId,
        pestIds,
        soilType: conditions.soilType,
        temperature: conditions.temperature,
        humidity: conditions.humidity,
        isLowHumidity: conditions.isLowHumidity,
        daysUntilHarvest: conditions.daysUntilHarvest,
        area: conditions.area,
        cropPhase: conditions.cropPhase,
      });
      setRecommendations(results);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
    }
  }, [conditions.area, conditions.cropPhase, conditions.daysUntilHarvest, conditions.humidity, conditions.isLowHumidity, conditions.soilType, conditions.temperature, cropId, pestIds]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  const handleSelectProduct = (product: RecommendedProduct) => {
    navigation.navigate('Calculation', {
      productId: product.product.id!,
      area: conditions.area,
      conditions,
    });
  };

  const renderProduct = ({item}: {item: RecommendedProduct}) => (
    <View style={styles.productContainer}>
      <ProductCard
        product={item.product}
        onPress={() => handleSelectProduct(item)}
        showEfficacy={true}
        efficacy={item.efficacy}
        costPerHectare={item.costPerHectare}
      />
      {item.warnings.length > 0 && (
        <View style={styles.warningsContainer}>
          {item.warnings.map((warning, index) => (
            <Text key={index} style={styles.warning}>
              ⚠️ {warning}
            </Text>
          ))}
        </View>
      )}
      <TouchableOpacity
        style={styles.calculateButton}
        onPress={() => handleSelectProduct(item)}>
        <Text style={styles.calculateButtonText}>Рассчитать раствор</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <LoadingSpinner message="Подбор препаратов..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>
          Найдено препаратов: {recommendations.length}
        </Text>

        <FlatList
          data={recommendations}
          keyExtractor={item => item.product.id?.toString() || ''}
          renderItem={renderProduct}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              title="Препараты не найдены"
              message="Попробуйте изменить условия поиска или выбрать других вредителей"
              icon="🔍"
            />
          }
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  productContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 16,
  },
  warningsContainer: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
  },
  warning: {
    fontSize: 12,
    color: '#E65100',
    marginBottom: 4,
  },
  calculateButton: {
    backgroundColor: '#2E7D32',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  calculateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProductResultsScreen;

