import React, {useEffect, useState} from 'react';
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
import {Picker} from '@react-native-picker/picker';
import FieldRepository from '../../repositories/FieldRepository';
import {Field, SoilType} from '../../models/Field';

type FieldDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'FieldDetail'>;
type FieldDetailScreenRouteProp = RouteProp<RootStackParamList, 'FieldDetail'>;

const FieldDetailScreen = () => {
  const navigation = useNavigation<FieldDetailScreenNavigationProp>();
  const route = useRoute<FieldDetailScreenRouteProp>();
  const {fieldId} = route.params;

  const [field, setField] = useState<Field>({
    name: '',
    area: 0,
    soilType: SoilType.LOAM,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isNewField = fieldId === 0;

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params.fieldId]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (!isNewField) {
        const loadedField = await FieldRepository.getById(fieldId);
        if (loadedField) {
          setField(loadedField);
        }
      }
    } catch (error) {
      console.error('Error loading field:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить данные поля');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!field.name.trim()) {
      Alert.alert('Ошибка', 'Введите название поля');
      return;
    }

    if (field.area <= 0) {
      Alert.alert('Ошибка', 'Введите площадь поля');
      return;
    }

    try {
      setSaving(true);
      if (isNewField) {
        await FieldRepository.create(field);
        Alert.alert('Успешно', 'Поле добавлено', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        await FieldRepository.update(field);
        Alert.alert('Успешно', 'Поле обновлено', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      }
    } catch (error) {
      console.error('Error saving field:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить поле');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (isNewField) return;

    Alert.alert('Удаление', 'Вы уверены, что хотите удалить это поле?', [
      {
        text: 'Отмена',
        style: 'cancel',
      },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await FieldRepository.delete(fieldId);
            Alert.alert('Успешно', 'Поле удалено', [
              {
                text: 'OK',
                onPress: () => navigation.goBack(),
              },
            ]);
          } catch (error) {
            console.error('Error deleting field:', error);
            Alert.alert('Ошибка', 'Не удалось удалить поле');
          }
        },
      },
    ]);
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

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Название поля *</Text>
            <TextInput
              style={styles.input}
              value={field.name}
              onChangeText={name => setField({...field, name})}
              placeholder="Введите название поля"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Площадь (га) *</Text>
            <TextInput
              style={styles.input}
              value={field.area.toString()}
              onChangeText={area =>
                setField({...field, area: parseFloat(area) || 0})
              }
              keyboardType="numeric"
              placeholder="0"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Тип почвы</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={field.soilType}
                onValueChange={(value: SoilType) => setField({...field, soilType: value})}
                style={styles.picker}>
                <Picker.Item label="Песчаная" value={SoilType.SAND} />
                <Picker.Item label="Суглинок" value={SoilType.LOAM} />
                <Picker.Item label="Чернозем" value={SoilType.CHERNOZEM} />
                <Picker.Item label="Глина" value={SoilType.CLAY} />
              </Picker>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Широта</Text>
            <TextInput
              style={styles.input}
              value={field.latitude?.toString() || ''}
              onChangeText={lat =>
                setField({
                  ...field,
                  latitude: lat ? parseFloat(lat) : undefined,
                })
              }
              keyboardType="numeric"
              placeholder="Не указано"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Долгота</Text>
            <TextInput
              style={styles.input}
              value={field.longitude?.toString() || ''}
              onChangeText={lng =>
                setField({
                  ...field,
                  longitude: lng ? parseFloat(lng) : undefined,
                })
              }
              keyboardType="numeric"
              placeholder="Не указано"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Описание</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={field.description || ''}
              onChangeText={description => setField({...field, description})}
              placeholder="Дополнительная информация о поле"
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
                {isNewField ? 'Создать поле' : 'Сохранить изменения'}
              </Text>
            )}
          </TouchableOpacity>

          {!isNewField && (
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Text style={styles.deleteButtonText}>Удалить поле</Text>
            </TouchableOpacity>
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
    overflow: 'hidden',
  },
  picker: {
    height: 50,
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
  deleteButton: {
    backgroundColor: '#D32F2F',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default FieldDetailScreen;
