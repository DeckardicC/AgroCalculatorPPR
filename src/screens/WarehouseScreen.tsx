import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Picker} from '@react-native-picker/picker';
import WarehouseRepository from '../repositories/WarehouseRepository';
import ProductRepository from '../repositories/ProductRepository';
import {WarehouseInventory} from '../models/Warehouse';
import {Product} from '../models/Product';
import {formatDate, formatDaysUntilExpiration} from '../utils/formatting';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const WarehouseScreen = () => {
  const [inventory, setInventory] = useState<WarehouseInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    productId: null as number | null,
    quantity: '',
    unit: '',
    purchaseDate: '',
    expirationDate: '',
    purchasePrice: '',
  });

  useEffect(() => {
    loadInventory();
    loadProducts();
  }, []);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const allInventory = await WarehouseRepository.getAll();
      setInventory(allInventory);
    } catch (error) {
      console.error('Error loading inventory:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить складской учет');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const list = await ProductRepository.getAll();
      setProducts(list);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const openAddModal = () => {
    setForm({
      productId: null,
      quantity: '',
      unit: '',
      purchaseDate: '',
      expirationDate: '',
      purchasePrice: '',
    });
    setFormError(null);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSaving(false);
  };

  const selectedProduct = useMemo(() => {
    const productId = form.productId ?? undefined;
    return products.find(product => product.id === productId);
  }, [products, form.productId]);

  const parseDateInput = (value: string) => {
    if (!value.trim()) return undefined;
    const parts = value.split('-');
    if (parts.length !== 3) {
      throw new Error('Используйте формат ГГГГ-ММ-ДД');
    }
    const [year, month, day] = parts.map(Number);
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) {
      throw new Error('Некорректная дата');
    }
    return Math.floor(date.getTime() / 1000);
  };

  const handleSave = async () => {
    try {
      if (!form.productId) {
        setFormError('Выберите препарат');
        return;
      }

      const quantity = parseFloat(form.quantity.replace(',', '.'));
      if (Number.isNaN(quantity) || quantity <= 0) {
        setFormError('Укажите количество (число больше 0)');
        return;
      }

      const purchasePrice = form.purchasePrice
        ? parseFloat(form.purchasePrice.replace(',', '.'))
        : undefined;
      if (purchasePrice !== undefined && Number.isNaN(purchasePrice)) {
        setFormError('Цена должна быть числом');
        return;
      }

      const purchaseDate = form.purchaseDate ? parseDateInput(form.purchaseDate) : undefined;
      const expirationDate = form.expirationDate
        ? parseDateInput(form.expirationDate)
        : undefined;

      setSaving(true);
      await WarehouseRepository.create({
        productId: form.productId,
        quantity,
        unit: form.unit || selectedProduct?.unit || 'л',
        purchaseDate,
        expirationDate,
        purchasePrice,
      });

      closeModal();
      await loadInventory();
      Alert.alert('Склад', 'Партия успешно добавлена.');
    } catch (error: any) {
      console.error('Failed to save inventory item', error);
      setFormError(error?.message ?? 'Не удалось сохранить запись.');
      setSaving(false);
    }
  };

  const isExpiringSoon = (expirationDate?: number) => {
    if (!expirationDate) return false;
    const daysUntilExpiration =
      (expirationDate - Math.floor(Date.now() / 1000)) / (24 * 60 * 60);
    return daysUntilExpiration <= 30 && daysUntilExpiration > 0;
  };

  const isExpired = (expirationDate?: number) => {
    if (!expirationDate) return false;
    return expirationDate < Math.floor(Date.now() / 1000);
  };

  const renderItem = ({item}: {item: WarehouseInventory}) => {
    const expiringSoon = isExpiringSoon(item.expirationDate);
    const expired = isExpired(item.expirationDate);

    return (
      <View
        style={[
          styles.inventoryCard,
          expired && styles.inventoryCardExpired,
          expiringSoon && styles.inventoryCardExpiring,
        ]}>
        <View style={styles.inventoryHeader}>
          <Text style={styles.productName}>
            {item.product?.name || `Продукт #${item.productId}`}
          </Text>
          {expired && <Text style={styles.expiredBadge}>Просрочено</Text>}
          {expiringSoon && !expired && (
            <Text style={styles.expiringBadge}>Скоро истечет</Text>
          )}
        </View>

        <View style={styles.inventoryDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Количество:</Text>
            <Text style={styles.detailValue}>
              {item.quantity} {item.unit}
            </Text>
          </View>

          {item.expirationDate && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Срок годности:</Text>
              <Text
                style={[
                  styles.detailValue,
                  expired && styles.detailValueExpired,
                  expiringSoon && !expired && styles.detailValueExpiring,
                ]}>
                {formatDate(item.expirationDate)} ({formatDaysUntilExpiration(item.expirationDate)})
              </Text>
            </View>
          )}

          {item.purchasePrice && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Цена покупки:</Text>
              <Text style={styles.detailValue}>
                {item.purchasePrice.toFixed(2)} руб
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyWrapper}>
      <EmptyState
        title="Склад пуст"
        message="Добавьте препарат, чтобы отслеживать остатки и сроки годности"
        icon="📦"
      />
      <TouchableOpacity style={styles.primaryButton} onPress={openAddModal}>
        <Text style={styles.primaryButtonText}>Добавить первый препарат</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <LoadingSpinner message="Загрузка склада..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Modal visible={modalVisible} animationType="slide" onRequestClose={closeModal}>
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView
            style={styles.modalFlex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTitle}>Новая партия на складе</Text>
              <Text style={styles.modalSubtitle}>
                Укажите препарат, количество и дополнительные параметры партии
              </Text>

              {formError && <Text style={styles.modalError}>{formError}</Text>}

              <View style={styles.modalGroup}>
                <Text style={styles.modalLabel}>Препарат</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={form.productId ?? null}
                    onValueChange={value =>
                      setForm(prev => ({
                        ...prev,
                        productId: typeof value === 'number' ? value : null,
                        unit:
                          typeof value === 'number'
                            ? products.find(p => p.id === value)?.unit || prev.unit
                            : prev.unit,
                      }))
                    }>
                    <Picker.Item label="Выберите препарат..." value={null} />
                    {products
                      .filter(product => product.id !== undefined)
                      .map(product => (
                        <Picker.Item key={product.id} label={product.name} value={product.id} />
                      ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.modalGroupRow}>
                <View style={[styles.modalGroup, styles.modalGroupHalf]}>
                  <Text style={styles.modalLabel}>Количество</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={form.quantity}
                    onChangeText={value => setForm(prev => ({...prev, quantity: value}))}
                    keyboardType="numeric"
                    placeholder="Например, 25"
                  />
                </View>
                <View style={[styles.modalGroup, styles.modalGroupHalf]}>
                  <Text style={styles.modalLabel}>Единица</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={form.unit || selectedProduct?.unit || ''}
                    onChangeText={value => setForm(prev => ({...prev, unit: value}))}
                    placeholder="л, кг, г"
                  />
                </View>
              </View>

              <View style={styles.modalGroupRow}>
                <View style={[styles.modalGroup, styles.modalGroupHalf]}>
                  <Text style={styles.modalLabel}>Дата закупки</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={form.purchaseDate}
                    onChangeText={value => setForm(prev => ({...prev, purchaseDate: value}))}
                    placeholder="ГГГГ-ММ-ДД"
                  />
                </View>
                <View style={[styles.modalGroup, styles.modalGroupHalf]}>
                  <Text style={styles.modalLabel}>Срок годности</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={form.expirationDate}
                    onChangeText={value => setForm(prev => ({...prev, expirationDate: value}))}
                    placeholder="ГГГГ-ММ-ДД"
                  />
                </View>
              </View>

              <View style={styles.modalGroup}>
                <Text style={styles.modalLabel}>Цена закупки, ₽</Text>
                <TextInput
                  style={styles.modalInput}
                  value={form.purchasePrice}
                  onChangeText={value => setForm(prev => ({...prev, purchasePrice: value}))}
                  keyboardType="numeric"
                  placeholder="Например, 1200"
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.secondaryButton, saving && styles.buttonDisabled]}
                  onPress={closeModal}
                  disabled={saving}>
                  <Text style={styles.secondaryButtonText}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, saving && styles.buttonDisabled]}
                  onPress={handleSave}
                  disabled={saving}>
                  <Text style={styles.primaryButtonText}>
                    {saving ? 'Сохранение...' : 'Сохранить'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      <View style={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Складской учет</Text>
            <Text style={styles.subtitle}>Всего позиций: {inventory.length}</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Text style={styles.addButtonText}>+ Добавить</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={inventory}
          keyExtractor={item => item.id?.toString() || ''}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          refreshing={loading}
          onRefresh={loadInventory}
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
  header: {
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  addButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    elevation: 2,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 16,
  },
  inventoryCard: {
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
  inventoryCardExpiring: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  inventoryCardExpired: {
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
    backgroundColor: '#FFEBEE',
  },
  inventoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
    flex: 1,
  },
  expiredBadge: {
    backgroundColor: '#D32F2F',
    color: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  expiringBadge: {
    backgroundColor: '#FF9800',
    color: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  inventoryDetails: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  detailValueExpired: {
    color: '#D32F2F',
  },
  detailValueExpiring: {
    color: '#FF9800',
  },
  emptyWrapper: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: '#2E7D32',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  modalFlex: {
    flex: 1,
  },
  modalContent: {
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalError: {
    backgroundColor: '#FFEBEE',
    borderColor: '#E57373',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    color: '#C62828',
    marginBottom: 16,
  },
  modalGroup: {
    marginBottom: 16,
  },
  modalGroupRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalGroupHalf: {
    flex: 1,
  },
  modalLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
    fontWeight: '600',
  },
  modalInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  pickerWrapper: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  secondaryButton: {
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    color: '#555',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default WarehouseScreen;
