import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import PestRepository from '../../repositories/PestRepository';
import {Pest, PestType} from '../../models/Pest';

type PestSelectionScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'PestSelection'
>;
type PestSelectionScreenRouteProp = RouteProp<RootStackParamList, 'PestSelection'>;

const PestSelectionScreen = () => {
  const navigation = useNavigation<PestSelectionScreenNavigationProp>();
  const route = useRoute<PestSelectionScreenRouteProp>();
  const {cropId} = route.params;

  const [pests, setPests] = useState<Pest[]>([]);
  const [filteredPests, setFilteredPests] = useState<Pest[]>([]);
  const [selectedPests, setSelectedPests] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<PestType | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPests = useCallback(async () => {
    try {
      setLoading(true);
      const allPests = await PestRepository.getAll();
      setPests(allPests);
      setFilteredPests(allPests);
    } catch (error) {
      console.error('Error loading pests:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const filterPests = useCallback(() => {
    let filtered = pests;

    if (selectedType) {
      filtered = filtered.filter(pest => pest.type === selectedType);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        pest =>
          pest.name.toLowerCase().includes(query) ||
          (pest.nameEn && pest.nameEn.toLowerCase().includes(query)),
      );
    }

    setFilteredPests(filtered);
  }, [pests, searchQuery, selectedType]);

  useEffect(() => {
    loadPests();
  }, [loadPests]);

  useEffect(() => {
    filterPests();
  }, [filterPests]);

  const togglePest = (pestId: number) => {
    setSelectedPests(prev =>
      prev.includes(pestId) ? prev.filter(id => id !== pestId) : [...prev, pestId],
    );
  };

  const handleContinue = () => {
    if (selectedPests.length > 0) {
      navigation.navigate('Conditions', {
        cropId,
        pestIds: selectedPests,
      });
    }
  };

  const pestTypes = [
    {key: null, label: 'Все'},
    {key: PestType.WEED, label: 'Сорняки'},
    {key: PestType.DISEASE, label: 'Болезни'},
    {key: PestType.INSECT, label: 'Вредители'},
  ];

  const renderPest = ({item}: {item: Pest}) => {
    const isSelected = selectedPests.includes(item.id!);
    return (
      <TouchableOpacity
        style={[styles.pestCard, isSelected && styles.pestCardSelected]}
        onPress={() => togglePest(item.id!)}>
        <View style={styles.pestCardContent}>
          <Text style={styles.pestName}>{item.name}</Text>
          {item.nameEn && <Text style={styles.pestNameEn}>{item.nameEn}</Text>}
          <Text style={styles.pestType}>
            {pestTypes.find(t => t.key === item.type)?.label}
          </Text>
        </View>
        {isSelected && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Загрузка вредителей...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск вредителя..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <View style={styles.typesContainer}>
          <FlatList
            horizontal
            data={pestTypes}
            keyExtractor={item => item.key || 'all'}
            renderItem={({item}) => (
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  selectedType === item.key && styles.typeButtonActive,
                ]}
                onPress={() => setSelectedType(item.key)}>
                <Text
                  style={[
                    styles.typeButtonText,
                    selectedType === item.key && styles.typeButtonTextActive,
                  ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
            showsHorizontalScrollIndicator={false}
          />
        </View>

        <Text style={styles.selectedCount}>
          Выбрано: {selectedPests.length}
        </Text>

        <FlatList
          data={filteredPests}
          keyExtractor={item => item.id?.toString() || ''}
          renderItem={renderPest}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Вредители не найдены</Text>
            </View>
          }
        />

        {selectedPests.length > 0 && (
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>Продолжить</Text>
          </TouchableOpacity>
        )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  typesContainer: {
    marginBottom: 16,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  typeButtonActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  typeButtonText: {
    color: '#666',
    fontSize: 14,
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  selectedCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 80,
  },
  pestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pestCardSelected: {
    borderWidth: 2,
    borderColor: '#2E7D32',
    backgroundColor: '#E8F5E9',
  },
  pestCardContent: {
    flex: 1,
  },
  pestName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1B5E20',
    marginBottom: 4,
  },
  pestNameEn: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  pestType: {
    fontSize: 12,
    color: '#999',
  },
  checkmark: {
    fontSize: 24,
    color: '#2E7D32',
    fontWeight: 'bold',
    marginLeft: 12,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  continueButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default PestSelectionScreen;

