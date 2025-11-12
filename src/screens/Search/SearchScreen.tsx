import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Picker} from '@react-native-picker/picker';
import SearchService, {
  CropSearchParams,
  PestSearchParams,
  ProductSearchParams,
} from '../../services/SearchService';
import {Product, ProductType} from '../../models/Product';
import {Crop, CropCategory} from '../../models/Crop';
import {Pest, PestType} from '../../models/Pest';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

const tabs = ['products', 'crops', 'pests'] as const;
type ActiveTab = typeof tabs[number];

const SearchScreen = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('products');
  const [query, setQuery] = useState<string>('');
  const [productType, setProductType] = useState<ProductType | null>(null);
  const [pestType, setPestType] = useState<PestType | null>(null);
  const [cropCategory, setCropCategory] = useState<CropCategory | undefined>();
  const [minEfficacy, setMinEfficacy] = useState<string>('90');

  const [products, setProducts] = useState<Product[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [pests, setPests] = useState<Pest[]>([]);
  const [loading, setLoading] = useState(false);

  const executeSearch = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'products') {
        const params: ProductSearchParams = {
          query,
          type: productType,
          minEfficacy: minEfficacy ? parseInt(minEfficacy, 10) : undefined,
        };
        const result = await SearchService.searchProducts(params);
        setProducts(result);
      } else if (activeTab === 'crops') {
        const params: CropSearchParams = {
          query,
          category: cropCategory,
        };
        const result = await SearchService.searchCrops(params);
        setCrops(result);
      } else {
        const params: PestSearchParams = {
          query,
          type: pestType,
        };
        const result = await SearchService.searchPests(params);
        setPests(result);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, query, productType, minEfficacy, cropCategory, pestType]);

  useEffect(() => {
    executeSearch();
  }, [executeSearch]);

  const renderProducts = () => {
    if (loading) {
      return <LoadingSpinner message="Поиск препаратов..." />;
    }
    if (products.length === 0) {
      return (
        <EmptyState
          title="Результаты отсутствуют"
          message="Попробуйте изменить условия поиска"
          icon="🔍"
        />
      );
    }
    return (
      <FlatList
        data={products}
        keyExtractor={item => `${item.id}`}
        renderItem={({item}) => (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>{item.name}</Text>
            {item.nameEn && <Text style={styles.resultSubtitle}>{item.nameEn}</Text>}
            <Text style={styles.resultBody}>Тип: {translateProductType(item.type)}</Text>
            {item.activeIngredient && (
              <Text style={styles.resultBody}>Действующее вещество: {item.activeIngredient}</Text>
            )}
          </View>
        )}
      />
    );
  };

  const renderCrops = () => {
    if (loading) {
      return <LoadingSpinner message="Поиск культур..." />;
    }
    if (crops.length === 0) {
      return (
        <EmptyState
          title="Результаты отсутствуют"
          message="Попробуйте изменить условия поиска"
          icon="🌾"
        />
      );
    }
    return (
      <FlatList
        data={crops}
        keyExtractor={item => `${item.id}`}
        renderItem={({item}) => (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>{item.name}</Text>
            {item.nameEn && <Text style={styles.resultSubtitle}>{item.nameEn}</Text>}
            <Text style={styles.resultBody}>Категория: {translateCropCategory(item.category)}</Text>
            {item.bbhMin !== undefined && item.bbhMax !== undefined && (
              <Text style={styles.resultBody}>
                Рекомендуемый диапазон BBCH: {item.bbhMin} – {item.bbhMax}
              </Text>
            )}
          </View>
        )}
      />
    );
  };

  const renderPests = () => {
    if (loading) {
      return <LoadingSpinner message="Поиск вредителей..." />;
    }
    if (pests.length === 0) {
      return (
        <EmptyState
          title="Результаты отсутствуют"
          message="Попробуйте изменить условия поиска"
          icon="🪲"
        />
      );
    }
    return (
      <FlatList
        data={pests}
        keyExtractor={item => `${item.id}`}
        renderItem={({item}) => (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>{item.name}</Text>
            {item.nameEn && <Text style={styles.resultSubtitle}>{item.nameEn}</Text>}
            <Text style={styles.resultBody}>Тип: {translatePestType(item.type)}</Text>
            {item.category && <Text style={styles.resultBody}>Категория: {item.category}</Text>}
          </View>
        )}
      />
    );
  };

  const renderResults = () => {
    switch (activeTab) {
      case 'products':
        return renderProducts();
      case 'crops':
        return renderCrops();
      case 'pests':
        return renderPests();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Расширенный поиск</Text>
        <View style={styles.tabs}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab)}>
              <Text
                style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}
              >
                {tab === 'products' ? 'Препараты' : tab === 'crops' ? 'Культуры' : 'Вредители'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.searchPanel}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Введите название"
          onSubmitEditing={executeSearch}
        />
        {activeTab === 'products' && (
          <View style={styles.filtersRow}>
            <View style={styles.filterBox}>
              <Text style={styles.filterLabel}>Тип препарата</Text>
              <Picker
                selectedValue={productType}
                onValueChange={value => setProductType(value)}
                style={styles.filterPicker}>
                <Picker.Item label="Все" value={null} />
                <Picker.Item label="Гербициды" value={ProductType.HERBICIDE} />
                <Picker.Item label="Фунгициды" value={ProductType.FUNGICIDE} />
                <Picker.Item label="Инсектициды" value={ProductType.INSECTICIDE} />
                <Picker.Item label="Адъюванты" value={ProductType.ADJUVANT} />
              </Picker>
            </View>
            <View style={styles.filterBox}>
              <Text style={styles.filterLabel}>Мин. эффективность (%)</Text>
              <TextInput
                style={styles.filterInput}
                value={minEfficacy}
                onChangeText={setMinEfficacy}
                keyboardType="numeric"
                placeholder="90"
              />
            </View>
          </View>
        )}

        {activeTab === 'crops' && (
          <View style={styles.filtersRow}>
            <View style={styles.filterBox}>
              <Text style={styles.filterLabel}>Категория культуры</Text>
              <Picker
                selectedValue={cropCategory}
                onValueChange={value => setCropCategory(value)}
                style={styles.filterPicker}>
                <Picker.Item label="Все" value={undefined} />
                <Picker.Item label="Зерновые" value={CropCategory.CEREALS} />
                <Picker.Item label="Технические" value={CropCategory.TECHNICAL} />
                <Picker.Item label="Овощные" value={CropCategory.VEGETABLES} />
                <Picker.Item label="Плодовые" value={CropCategory.FRUIT} />
              </Picker>
            </View>
          </View>
        )}

        {activeTab === 'pests' && (
          <View style={styles.filtersRow}>
            <View style={styles.filterBox}>
              <Text style={styles.filterLabel}>Тип вредителя</Text>
              <Picker
                selectedValue={pestType}
                onValueChange={value => setPestType(value)}
                style={styles.filterPicker}>
                <Picker.Item label="Все" value={null} />
                <Picker.Item label="Сорняки" value={PestType.WEED} />
                <Picker.Item label="Болезни" value={PestType.DISEASE} />
                <Picker.Item label="Вредители" value={PestType.INSECT} />
                <Picker.Item label="Нематоды" value={PestType.NEMATODE} />
              </Picker>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.searchButton} onPress={executeSearch}>
          <Text style={styles.searchButtonText}>Поиск</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.resultsContainer}>{renderResults()}</View>
    </SafeAreaView>
  );
};

const translateProductType = (type: ProductType) => {
  switch (type) {
    case ProductType.HERBICIDE:
      return 'Гербицид';
    case ProductType.FUNGICIDE:
      return 'Фунгицид';
    case ProductType.INSECTICIDE:
      return 'Инсектицид';
    case ProductType.ADJUVANT:
      return 'Адъювант';
    default:
      return type;
  }
};

const translateCropCategory = (category: CropCategory) => {
  switch (category) {
    case CropCategory.CEREALS:
      return 'Зерновые';
    case CropCategory.TECHNICAL:
      return 'Технические';
    case CropCategory.VEGETABLES:
      return 'Овощные';
    case CropCategory.FRUIT:
      return 'Плодовые';
    default:
      return category;
  }
};

const translatePestType = (type: PestType) => {
  switch (type) {
    case PestType.WEED:
      return 'Сорняк';
    case PestType.DISEASE:
      return 'Болезнь';
    case PestType.INSECT:
      return 'Вредитель';
    case PestType.NEMATODE:
      return 'Нематода';
    default:
      return type;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 12,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#1B5E20',
  },
  tabButtonText: {
    fontSize: 14,
    color: '#1B5E20',
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  searchPanel: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  filtersRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
    flexWrap: 'wrap',
  },
  filterBox: {
    flex: 1,
    minWidth: 160,
  },
  filterLabel: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  filterPicker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  filterInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  resultsContainer: {
    flex: 1,
    padding: 16,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B5E20',
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  resultBody: {
    fontSize: 13,
    color: '#555',
    marginTop: 6,
  },
});

export default SearchScreen;
