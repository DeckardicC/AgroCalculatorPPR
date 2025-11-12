import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRoute, RouteProp} from '@react-navigation/native';
import {RootStackParamList} from '../navigation/AppNavigator';
import ProductRepository from '../repositories/ProductRepository';
import CalculationService from '../services/CalculationService';
import {Product} from '../models/Product';
import {Picker} from '@react-native-picker/picker';

type CalculationScreenRouteProp = RouteProp<RootStackParamList, 'Calculation'>;

const CalculationScreen = () => {
  const route = useRoute<CalculationScreenRouteProp>();
  const {productId, area: initialArea, conditions} = route.params ?? {};

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    productId ?? null,
  );
  const [product, setProduct] = useState<Product | null>(null);
  const [area, setArea] = useState<string>(initialArea?.toString() || '10');
  const [listLoading, setListLoading] = useState(true);
  const [productLoading, setProductLoading] = useState(false);
  const [calculation, setCalculation] = useState<any>(null);

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      loadProduct(selectedProductId);
    } else {
      setProduct(null);
      setCalculation(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId]);

  useEffect(() => {
    if (product) {
      calculate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, area, conditions]);

  const loadProducts = useCallback(async () => {
    try {
      setListLoading(true);
      const list = await ProductRepository.getAll();
      setProducts(list);

      if (productId) {
        const exists = list.find(item => item.id === productId);
        if (exists) {
          setSelectedProductId(productId);
        }
      }
    } catch (error) {
      console.error('Error loading product list:', error);
    } finally {
      setListLoading(false);
      if (!productId) {
        setProductLoading(false);
      }
    }
  }, [productId]);

  const loadProduct = useCallback(async (id: number) => {
    try {
      setProductLoading(true);
      const loadedProduct = await ProductRepository.getById(id);
      setProduct(loadedProduct);
    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      setProductLoading(false);
    }
  }, []);

  const calculate = () => {
    if (!product) return;

    const areaNum = parseFloat(area) || 1;
    const dosageAdjustment = CalculationService.calculateAdjustedDosage(product, {
      soilType: conditions?.soilType,
      temperature: conditions?.temperature,
      humidity: conditions?.humidity,
      isLowHumidity: conditions?.isLowHumidity,
    });

    const workingSolution = CalculationService.calculateWorkingSolution(
      areaNum,
      product,
      dosageAdjustment.adjustedDosage,
      {
        sprayerType: 'boom',
        windSpeed: conditions?.windSpeed,
        temperature: conditions?.temperature,
        cropPhase: conditions?.cropPhase,
      },
    );

    setCalculation({
      dosageAdjustment,
      workingSolution,
    });
  };

  const pickerItems = useMemo(() => {
    return products
      .filter(item => item.id !== undefined)
      .map(item => (
        <Picker.Item
          key={item.id}
          label={`${item.name} (${item.type.toLowerCase()})`}
          value={item.id}
        />
      ));
  }, [products]);

  if (listLoading && !product) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Загрузка...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Выберите препарат</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedProductId ?? null}
                onValueChange={value =>
                  setSelectedProductId(typeof value === 'number' ? value : null)
                }>
                <Picker.Item label="Выберите препарат..." value={null} />
                {pickerItems}
              </Picker>
            </View>
          </View>

          {productLoading && (
            <View style={styles.loadingInline}>
              <ActivityIndicator size="small" color="#2E7D32" />
              <Text style={styles.loadingInlineText}>Загрузка данных препарата...</Text>
            </View>
          )}

          {product ? (
            <>
              <View style={styles.productCard}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.activeIngredient}>
                  ДВ: {product.activeIngredient} {product.concentration}
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Площадь обработки (га)</Text>
                <TextInput
                  style={styles.input}
                  value={area}
                  onChangeText={setArea}
                  keyboardType="numeric"
                  placeholder="10"
                />
              </View>

              {calculation && (
                <>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Дозировка</Text>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Базовая дозировка:</Text>
                      <Text style={styles.infoValue}>
                        {calculation.dosageAdjustment.baseDosage.toFixed(2)}{' '}
                        {product.unitDosage}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Скорректированная дозировка:</Text>
                      <Text style={styles.infoValue}>
                        {calculation.dosageAdjustment.adjustedDosage.toFixed(2)}{' '}
                        {product.unitDosage}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Рабочий раствор</Text>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Объем рабочей жидкости:</Text>
                      <Text style={styles.infoValue}>
                        {calculation.workingSolution.recommendedVolume} л/га
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Всего воды:</Text>
                      <Text style={styles.infoValue}>
                        {calculation.workingSolution.waterAmount} л
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Всего препарата:</Text>
                      <Text style={styles.infoValue}>
                        {calculation.workingSolution.productAmount}{' '}
                        {product.unit || 'л'}
                      </Text>
                    </View>
                  </View>

                  {product.waitingPeriod && (
                    <View style={styles.warningCard}>
                      <Text style={styles.warningTitle}>⚠ Интервал ожидания</Text>
                      <Text style={styles.warningText}>
                        {product.waitingPeriod} дней до уборки урожая
                      </Text>
                    </View>
                  )}
                </>
              )}
            </>
          ) : (
            <View style={styles.placeholderCard}>
              <Text style={styles.placeholderTitle}>Выберите препарат</Text>
              <Text style={styles.placeholderText}>
                Подберите препарат из списка, чтобы получить дозировку и объём рабочего раствора
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#D32F2F',
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 8,
  },
  activeIngredient: {
    fontSize: 14,
    color: '#666',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  pickerWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  loadingInline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  loadingInlineText: {
    marginLeft: 12,
    color: '#666',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  warningCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#E65100',
  },
  placeholderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    marginTop: 8,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default CalculationScreen;

