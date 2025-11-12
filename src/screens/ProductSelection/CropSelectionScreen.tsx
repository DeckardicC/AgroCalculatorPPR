import React, {useEffect, useState} from 'react';
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
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import CropRepository from '../../repositories/CropRepository';
import {Crop, CropCategory} from '../../models/Crop';

type CropSelectionScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'CropSelection'
>;

const CropSelectionScreen = () => {
  const navigation = useNavigation<CropSelectionScreenNavigationProp>();
  const [crops, setCrops] = useState<Crop[]>([]);
  const [filteredCrops, setFilteredCrops] = useState<Crop[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CropCategory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCrops();
  }, []);

  useEffect(() => {
    filterCrops();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedCategory, crops]);

  const loadCrops = async () => {
    try {
      setLoading(true);
      const allCrops = await CropRepository.getAll();
      setCrops(allCrops);
      setFilteredCrops(allCrops);
    } catch (error) {
      console.error('Error loading crops:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCrops = () => {
    let filtered = crops;

    if (selectedCategory) {
      filtered = filtered.filter(crop => crop.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        crop =>
          crop.name.toLowerCase().includes(query) ||
          (crop.nameEn && crop.nameEn.toLowerCase().includes(query)),
      );
    }

    setFilteredCrops(filtered);
  };

  const handleSelectCrop = (crop: Crop) => {
    navigation.navigate('PestSelection', {cropId: crop.id!});
  };

  const categories = [
    {key: null, label: 'Все'},
    {key: CropCategory.CEREALS, label: 'Зерновые'},
    {key: CropCategory.TECHNICAL, label: 'Технические'},
    {key: CropCategory.VEGETABLES, label: 'Овощные'},
    {key: CropCategory.FRUIT, label: 'Плодовые'},
  ];

  const renderCrop = ({item}: {item: Crop}) => (
    <TouchableOpacity
      style={styles.cropCard}
      onPress={() => handleSelectCrop(item)}>
      <Text style={styles.cropName}>{item.name}</Text>
      {item.nameEn && <Text style={styles.cropNameEn}>{item.nameEn}</Text>}
      <Text style={styles.cropCategory}>
        {categories.find(c => c.key === item.category)?.label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Загрузка культур...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск культуры..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <View style={styles.categoriesContainer}>
          <FlatList
            horizontal
            data={categories}
            keyExtractor={item => item.key || 'all'}
            renderItem={({item}) => (
              <TouchableOpacity
                style={[
                  styles.categoryButton,
                  selectedCategory === item.key && styles.categoryButtonActive,
                ]}
                onPress={() => setSelectedCategory(item.key)}>
                <Text
                  style={[
                    styles.categoryButtonText,
                    selectedCategory === item.key && styles.categoryButtonTextActive,
                  ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
            showsHorizontalScrollIndicator={false}
          />
        </View>

        <FlatList
          data={filteredCrops}
          keyExtractor={item => item.id?.toString() || ''}
          renderItem={renderCrop}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Культуры не найдены</Text>
            </View>
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
  categoriesContainer: {
    marginBottom: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  categoryButtonActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  categoryButtonText: {
    color: '#666',
    fontSize: 14,
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 16,
  },
  cropCard: {
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
  cropName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1B5E20',
    marginBottom: 4,
  },
  cropNameEn: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  cropCategory: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});

export default CropSelectionScreen;

