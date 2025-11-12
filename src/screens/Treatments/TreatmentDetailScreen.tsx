import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import TreatmentRepository from '../../repositories/TreatmentRepository';
import {Treatment, TreatmentProduct} from '../../models/Treatment';
import FieldRepository from '../../repositories/FieldRepository';
import CropRepository from '../../repositories/CropRepository';
import ProductRepository from '../../repositories/ProductRepository';
import {Field} from '../../models/Field';
import {Crop} from '../../models/Crop';
import {Product} from '../../models/Product';
import {format} from 'date-fns';

type TreatmentDetailScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'TreatmentDetail'
>;
type TreatmentDetailScreenRouteProp = RouteProp<RootStackParamList, 'TreatmentDetail'>;

const TreatmentDetailScreen = () => {
  const navigation = useNavigation<TreatmentDetailScreenNavigationProp>();
  const route = useRoute<TreatmentDetailScreenRouteProp>();
  const treatmentId = route.params?.treatmentId;

  const [treatment, setTreatment] = useState<Treatment>({
    fieldId: 0,
    cropId: 0,
    treatmentDate: Math.floor(Date.now() / 1000),
    area: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState<Field[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [_products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<TreatmentProduct[]>([]);

  const isNewTreatment = !treatmentId;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [allFields, allCrops, allProducts] = await Promise.all([
        FieldRepository.getAll(),
        CropRepository.getAll(),
        ProductRepository.getAll(),
      ]);
      setFields(allFields);
      setCrops(allCrops);
      setProducts(allProducts);

      if (!isNewTreatment && treatmentId) {
        const loadedTreatment = await TreatmentRepository.getById(treatmentId);
        if (loadedTreatment) {
          setTreatment(loadedTreatment);
          if (loadedTreatment.products) {
            setSelectedProducts(loadedTreatment.products);
          }
        }
      }
    } catch (error) {
      console.error('Error loading treatment:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить данные обработки');
    } finally {
      setLoading(false);
    }
  }, [isNewTreatment, treatmentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    if (treatment.fieldId === 0) {
      Alert.alert('Ошибка', 'Выберите поле');
      return;
    }

    if (treatment.cropId === 0) {
      Alert.alert('Ошибка', 'Выберите культуру');
      return;
    }

    if (treatment.area <= 0) {
      Alert.alert('Ошибка', 'Введите площадь обработки');
      return;
    }

    try {
      setSaving(true);
      const treatmentToSave: Treatment = {
        ...treatment,
        products: selectedProducts,
      };

      if (isNewTreatment) {
        await TreatmentRepository.create(treatmentToSave);
        Alert.alert('Успешно', 'Обработка добавлена', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        await TreatmentRepository.update(treatmentToSave);
        Alert.alert('Успешно', 'Обработка обновлена', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      }
    } catch (error) {
      console.error('Error saving treatment:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить обработку');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (timestamp: number) => {
    try {
      return format(new Date(timestamp * 1000), 'yyyy-MM-dd');
    } catch {
      return format(new Date(), 'yyyy-MM-dd');
    }
  };

  const handleDateChange = (dateString: string) => {
    try {
      const date = new Date(dateString);
      setTreatment({...treatment, treatmentDate: Math.floor(date.getTime() / 1000)});
    } catch {
      // Invalid date
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Загрузка...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const selectedField = fields.find(f => f.id === treatment.fieldId);
  const selectedCrop = crops.find(c => c.id === treatment.cropId);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Поле *</Text>
            <View style={styles.pickerContainer}>
              <Text
                style={styles.pickerText}
                onPress={() => {
                  // Show field picker - simplified for now
                  Alert.alert('Выбор поля', 'Выберите поле', [
                    ...fields.map(field => ({
                      text: field.name,
                      onPress: () => setTreatment({...treatment, fieldId: field.id!}),
                    })),
                    {text: 'Отмена', style: 'cancel'},
                  ]);
                }}>
                {selectedField ? selectedField.name : 'Выберите поле'}
              </Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Культура *</Text>
            <View style={styles.pickerContainer}>
              <Text
                style={styles.pickerText}
                onPress={() => {
                  Alert.alert('Выбор культуры', 'Выберите культуру', [
                    ...crops.map(crop => ({
                      text: crop.name,
                      onPress: () => setTreatment({...treatment, cropId: crop.id!}),
                    })),
                    {text: 'Отмена', style: 'cancel'},
                  ]);
                }}>
                {selectedCrop ? selectedCrop.name : 'Выберите культуру'}
              </Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Дата обработки *</Text>
            <TextInput
              style={styles.input}
              value={formatDate(treatment.treatmentDate)}
              onChangeText={handleDateChange}
              placeholder="YYYY-MM-DD"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Площадь обработки (га) *</Text>
            <TextInput
              style={styles.input}
              value={treatment.area.toString()}
              onChangeText={area =>
                setTreatment({...treatment, area: parseFloat(area) || 0})
              }
              keyboardType="numeric"
              placeholder="0"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Температура воздуха (°C)</Text>
            <TextInput
              style={styles.input}
              value={treatment.weatherTemperature?.toString() || ''}
              onChangeText={temp =>
                setTreatment({
                  ...treatment,
                  weatherTemperature: temp ? parseFloat(temp) : undefined,
                })
              }
              keyboardType="numeric"
              placeholder="Не указано"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Влажность воздуха (%)</Text>
            <TextInput
              style={styles.input}
              value={treatment.weatherHumidity?.toString() || ''}
              onChangeText={hum =>
                setTreatment({
                  ...treatment,
                  weatherHumidity: hum ? parseFloat(hum) : undefined,
                })
              }
              keyboardType="numeric"
              placeholder="Не указано"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Скорость ветра (м/с)</Text>
            <TextInput
              style={styles.input}
              value={treatment.weatherWindSpeed?.toString() || ''}
              onChangeText={wind =>
                setTreatment({
                  ...treatment,
                  weatherWindSpeed: wind ? parseFloat(wind) : undefined,
                })
              }
              keyboardType="numeric"
              placeholder="Не указано"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Оператор</Text>
            <TextInput
              style={styles.input}
              value={treatment.operatorName || ''}
              onChangeText={operatorName => setTreatment({...treatment, operatorName})}
              placeholder="ФИО оператора"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Техника</Text>
            <TextInput
              style={styles.input}
              value={treatment.equipmentType || ''}
              onChangeText={equipmentType =>
                setTreatment({...treatment, equipmentType})
              }
              placeholder="Тип опрыскивателя"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Стоимость (руб)</Text>
            <TextInput
              style={styles.input}
              value={treatment.totalCost?.toString() || ''}
              onChangeText={cost =>
                setTreatment({
                  ...treatment,
                  totalCost: cost ? parseFloat(cost) : undefined,
                })
              }
              keyboardType="numeric"
              placeholder="0"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Примечания</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={treatment.notes || ''}
              onChangeText={notes => setTreatment({...treatment, notes})}
              placeholder="Дополнительная информация"
              multiline
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>
                {isNewTreatment ? 'Создать обработку' : 'Сохранить изменения'}
              </Text>
            )}
          </TouchableOpacity>
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
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 12,
  },
  pickerText: {
    fontSize: 16,
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default TreatmentDetailScreen;
