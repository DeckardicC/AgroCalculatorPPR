import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import TreatmentRepository from '../../repositories/TreatmentRepository';
import {Treatment} from '../../models/Treatment';
import {formatDate} from '../../utils/formatting';
import FieldRepository from '../../repositories/FieldRepository';
import CropRepository from '../../repositories/CropRepository';
import {Field} from '../../models/Field';
import {Crop} from '../../models/Crop';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

type TreatmentListScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'TreatmentList'
>;

interface TreatmentWithDetails extends Treatment {
  fieldName?: string;
  cropName?: string;
}

const TreatmentListScreen = () => {
  const navigation = useNavigation<TreatmentListScreenNavigationProp>();
  const [treatments, setTreatments] = useState<TreatmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTreatments();
  }, []);

  const loadTreatments = async () => {
    try {
      setLoading(true);
      const allTreatments = await TreatmentRepository.getAll();
      const fields = await FieldRepository.getAll();
      const crops = await CropRepository.getAll();

      const fieldsMap = new Map<number, Field>();
      fields.forEach(field => {
        if (field.id) {
          fieldsMap.set(field.id, field);
        }
      });

      const cropsMap = new Map<number, Crop>();
      crops.forEach(crop => {
        if (crop.id) {
          cropsMap.set(crop.id, crop);
        }
      });

      const treatmentsWithDetails: TreatmentWithDetails[] = allTreatments.map(treatment => ({
        ...treatment,
        fieldName: fieldsMap.get(treatment.fieldId)?.name,
        cropName: cropsMap.get(treatment.cropId)?.name,
      }));

      setTreatments(treatmentsWithDetails);
    } catch (error) {
      console.error('Error loading treatments:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить обработки');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTreatment = () => {
    navigation.navigate('TreatmentDetail', {treatmentId: undefined});
  };

  const handleTreatmentPress = (treatment: Treatment) => {
    navigation.navigate('TreatmentDetail', {treatmentId: treatment.id});
  };


  const renderTreatment = ({item}: {item: TreatmentWithDetails}) => (
    <TouchableOpacity
      style={styles.treatmentCard}
      onPress={() => handleTreatmentPress(item)}>
      <View style={styles.treatmentHeader}>
        <Text style={styles.treatmentDate}>
          {formatDate(item.treatmentDate)}
        </Text>
        {item.totalCost && (
          <Text style={styles.treatmentCost}>{item.totalCost.toFixed(2)} руб</Text>
        )}
      </View>

      <Text style={styles.treatmentField}>
        {item.fieldName || `Поле #${item.fieldId}`}
      </Text>
      <Text style={styles.treatmentCrop}>
        {item.cropName || `Культура #${item.cropId}`}
      </Text>
      <Text style={styles.treatmentArea}>Площадь: {item.area} га</Text>

      {item.products && item.products.length > 0 && (
        <Text style={styles.treatmentProducts}>
          Препаратов: {item.products.length}
        </Text>
      )}

      {item.weatherTemperature && (
        <Text style={styles.treatmentWeather}>
          Температура: {item.weatherTemperature}°C
          {item.weatherHumidity && `, Влажность: ${item.weatherHumidity}%`}
        </Text>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <LoadingSpinner message="Загрузка обработок..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <TouchableOpacity style={styles.addButton} onPress={handleAddTreatment}>
          <Text style={styles.addButtonText}>+ Добавить обработку</Text>
        </TouchableOpacity>

        <FlatList
          data={treatments}
          keyExtractor={item => item.id?.toString() || ''}
          renderItem={renderTreatment}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              title="Обработки не добавлены"
              message='Нажмите "Добавить обработку" чтобы создать новую запись'
              icon="📋"
            />
          }
          refreshing={loading}
          onRefresh={loadTreatments}
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
  addButton: {
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 16,
  },
  treatmentCard: {
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
  treatmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  treatmentDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  treatmentCost: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
  },
  treatmentField: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  treatmentCrop: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  treatmentArea: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  treatmentProducts: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  treatmentWeather: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
});

export default TreatmentListScreen;
