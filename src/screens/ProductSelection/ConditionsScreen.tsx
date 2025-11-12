import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import {Picker} from '@react-native-picker/picker';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {SoilType} from '../../models/Field';
import BBCHService from '../../services/BBCHService';
import CropRepository from '../../repositories/CropRepository';
import type {BBCHPhase} from '../../services/BBCHService';

type ConditionsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Conditions'>;
type ConditionsScreenRouteProp = RouteProp<RootStackParamList, 'Conditions'>;

const ConditionsScreen = () => {
  const navigation = useNavigation<ConditionsScreenNavigationProp>();
  const route = useRoute<ConditionsScreenRouteProp>();
  const {cropId, pestIds} = route.params;

  const [soilType, setSoilType] = useState<SoilType | undefined>(SoilType.LOAM);
  const [temperature, setTemperature] = useState<string>('20');
  const [humidity, setHumidity] = useState<string>('60');
  const [windSpeed, setWindSpeed] = useState<string>('3');
  const [cropPhase, setCropPhase] = useState<number>(30);
  const [daysUntilHarvest, setDaysUntilHarvest] = useState<string>('60');
  const [area, setArea] = useState<string>('10');
  const [phases, setPhases] = useState<BBCHPhase[]>([]);
  const [phaseDescription, setPhaseDescription] = useState<string>('');
  const [bbchRange, setBbchRange] = useState<{min?: number; max?: number}>({});

  useEffect(() => {
    const loadPhases = async () => {
      try {
        const [crop, cropPhases] = await Promise.all([
          CropRepository.getById(cropId),
          BBCHService.getPhasesForCrop(cropId),
        ]);

        if (crop) {
          setBbchRange({min: crop.bbhMin ?? undefined, max: crop.bbhMax ?? undefined});
        }

        if (cropPhases.length > 0) {
          setPhases(cropPhases);
          setCropPhase(cropPhases[0].code);
          setPhaseDescription(cropPhases[0].description);
        } else if (crop?.bbhMin !== undefined) {
          setCropPhase(crop.bbhMin);
        }
      } catch (error) {
        console.error('Failed to load BBCH phases:', error);
      }
    };

    loadPhases();
  }, [cropId]);

  const phaseHint = useMemo(() => {
    if (phaseDescription) {
      return phaseDescription;
    }
    if (bbchRange.min !== undefined && bbchRange.max !== undefined) {
      return `Рекомендуемый диапазон BBCH: ${bbchRange.min} – ${bbchRange.max}`;
    }
    return 'Шкала BBCH от 10 до 99';
  }, [phaseDescription, bbchRange]);

  const handleContinue = () => {
    const conditions = {
      soilType,
      temperature: parseFloat(temperature) || 20,
      humidity: parseFloat(humidity) || 60,
      windSpeed: parseFloat(windSpeed) || 3,
      cropPhase: cropPhase,
      daysUntilHarvest: parseInt(daysUntilHarvest, 10) || 60,
      area: parseFloat(area) || 10,
      isLowHumidity: parseFloat(humidity) < 40,
    };

    navigation.navigate('ProductResults', {
      cropId,
      pestIds,
      conditions,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Погодные условия</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Температура воздуха (°C)</Text>
            <TextInput
              style={styles.input}
              value={temperature}
              onChangeText={setTemperature}
              keyboardType="numeric"
              placeholder="20"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Влажность воздуха (%)</Text>
            <TextInput
              style={styles.input}
              value={humidity}
              onChangeText={setHumidity}
              keyboardType="numeric"
              placeholder="60"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Скорость ветра (м/с)</Text>
            <TextInput
              style={styles.input}
              value={windSpeed}
              onChangeText={setWindSpeed}
              keyboardType="numeric"
              placeholder="3"
            />
          </View>

          <Text style={styles.sectionTitle}>Почвенные условия</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Тип почвы</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={soilType}
                onValueChange={(value: SoilType) => setSoilType(value)}
                style={styles.picker}>
                <Picker.Item label="Песчаная" value={SoilType.SAND} />
                <Picker.Item label="Суглинок" value={SoilType.LOAM} />
                <Picker.Item label="Чернозем" value={SoilType.CHERNOZEM} />
                <Picker.Item label="Глина" value={SoilType.CLAY} />
              </Picker>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Фазы развития</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Фаза развития культуры (BBCH)</Text>
            {phases.length > 0 ? (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={cropPhase}
                  onValueChange={(value: number) => {
                    setCropPhase(value);
                    const phase = phases.find(item => item.code === value);
                    setPhaseDescription(phase?.description ?? '');
                  }}
                  style={styles.picker}>
                  {phases.map(phase => (
                    <Picker.Item key={phase.code} label={`${phase.label}`} value={phase.code} />
                  ))}
                </Picker>
              </View>
            ) : (
              <TextInput
                style={styles.input}
                value={String(cropPhase)}
                onChangeText={text => setCropPhase(parseInt(text || '0', 10) || cropPhase)}
                keyboardType="numeric"
                placeholder="30"
              />
            )}
            <Text style={styles.hint}>{phaseHint}</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Дней до уборки урожая</Text>
            <TextInput
              style={styles.input}
              value={daysUntilHarvest}
              onChangeText={setDaysUntilHarvest}
              keyboardType="numeric"
              placeholder="60"
            />
          </View>

          <Text style={styles.sectionTitle}>Параметры обработки</Text>

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

          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>Подобрать препараты</Text>
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginTop: 24,
    marginBottom: 16,
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
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
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
  continueButton: {
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default ConditionsScreen;

