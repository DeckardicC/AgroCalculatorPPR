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
import FieldRepository from '../../repositories/FieldRepository';
import {Field} from '../../models/Field';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

type FieldListScreenNavigationProp = StackNavigationProp<RootStackParamList, 'FieldList'>;

const FieldListScreen = () => {
  const navigation = useNavigation<FieldListScreenNavigationProp>();
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const allFields = await FieldRepository.getAll();
      setFields(allFields);
    } catch (error) {
      console.error('Error loading fields:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить поля');
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = () => {
    navigation.navigate('FieldDetail', {fieldId: 0});
  };

  const handleFieldPress = (field: Field) => {
    navigation.navigate('FieldDetail', {fieldId: field.id!});
  };

  const getSoilTypeLabel = (soilType?: string) => {
    switch (soilType) {
      case 'sand':
        return 'Песчаная';
      case 'loam':
        return 'Суглинок';
      case 'chernozem':
        return 'Чернозем';
      case 'clay':
        return 'Глина';
      default:
        return 'Не указано';
    }
  };

  const renderField = ({item}: {item: Field}) => {
    return (
      <TouchableOpacity
        style={styles.fieldCard}
        onPress={() => handleFieldPress(item)}>
        <View style={styles.fieldHeader}>
          <Text style={styles.fieldName}>{item.name}</Text>
          <Text style={styles.fieldArea}>{item.area} га</Text>
        </View>

        {item.soilType && (
          <View style={styles.fieldInfo}>
            <Text style={styles.fieldLabel}>Тип почвы:</Text>
            <Text style={styles.fieldValue}>{getSoilTypeLabel(item.soilType)}</Text>
          </View>
        )}

        {item.description && (
          <Text style={styles.fieldDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <LoadingSpinner message="Загрузка полей..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <TouchableOpacity style={styles.addButton} onPress={handleAddField}>
          <Text style={styles.addButtonText}>+ Добавить поле</Text>
        </TouchableOpacity>

        <FlatList
          data={fields}
          keyExtractor={item => item.id?.toString() || ''}
          renderItem={renderField}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              title="Поля не добавлены"
              message='Нажмите "Добавить поле" чтобы создать новое поле'
              icon="🏞️"
            />
          }
          refreshing={loading}
          onRefresh={loadData}
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
  fieldCard: {
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
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
    flex: 1,
  },
  fieldArea: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
  },
  fieldInfo: {
    flexDirection: 'row',
    marginTop: 8,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  fieldValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  fieldDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
});

export default FieldListScreen;
