import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Picker} from '@react-native-picker/picker';
import OfflineService from '../services/OfflineService';
import SettingsService from '../services/SettingsService';
import {UserSettings, UnitsSystem} from '../models/UserSettings';

const unitLabels: Record<UnitsSystem, string> = {
  metric: 'Метрическая (га, л)',
  imperial: 'Имперская (ac, gal)',
};

const SettingsScreen = () => {
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [form, setForm] = useState<UserSettings | null>(null);
  const [defaultAreaInput, setDefaultAreaInput] = useState('');
  const [sprayerInput, setSprayerInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [exportVisible, setExportVisible] = useState(false);
  const [importVisible, setImportVisible] = useState(false);
  const [exportData, setExportData] = useState('');
  const [exportIssues, setExportIssues] = useState<string[]>([]);
  const [importText, setImportText] = useState('');
  const [importIssues, setImportIssues] = useState<string[]>([]);
  const [importLoading, setImportLoading] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const stored = await SettingsService.getSettings();
      setForm(stored);
      setDefaultAreaInput(stored.defaultArea !== undefined ? String(stored.defaultArea) : '');
      setSprayerInput(
        stored.defaultSprayerCapacity !== undefined ? String(stored.defaultSprayerCapacity) : '',
      );
      setError(null);
    } catch (err) {
      console.error('Failed to load settings', err);
      setError('Не удалось загрузить настройки.');
    } finally {
      setSettingsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateForm = useCallback(
    (partial: Partial<UserSettings>) => {
      setForm(prev => (prev ? {...prev, ...partial} : prev));
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!form) {
      return;
    }
    try {
      setSaving(true);
      setError(null);

      const parsedArea = defaultAreaInput.trim().length > 0 ? parseFloat(defaultAreaInput) : undefined;
      const parsedSprayer =
        sprayerInput.trim().length > 0 ? parseFloat(sprayerInput) : undefined;

      const next: UserSettings = {
        ...form,
        defaultArea: parsedArea,
        defaultSprayerCapacity: parsedSprayer,
      };

      const saved = await SettingsService.updateSettings(next);
      setForm(saved);
      setDefaultAreaInput(saved.defaultArea !== undefined ? String(saved.defaultArea) : '');
      setSprayerInput(
        saved.defaultSprayerCapacity !== undefined ? String(saved.defaultSprayerCapacity) : '',
      );
      Alert.alert('Настройки сохранены', 'Изменения успешно применены.');
    } catch (err: any) {
      console.error('Failed to save settings', err);
      setError(err?.message ?? 'Не удалось сохранить настройки.');
    } finally {
      setSaving(false);
    }
  }, [defaultAreaInput, form, sprayerInput]);

  const handleUnitsChange = useCallback(
    async (units: UnitsSystem) => {
      try {
        const saved = await SettingsService.setUnits(units);
        setForm(saved);
        setDefaultAreaInput(saved.defaultArea !== undefined ? String(saved.defaultArea) : '');
        setSprayerInput(
          saved.defaultSprayerCapacity !== undefined ? String(saved.defaultSprayerCapacity) : '',
        );
        setError(null);
      } catch (err: any) {
        setError(err?.message ?? 'Не удалось обновить единицы измерения.');
      }
    },
    [],
  );

  const languageOptions = useMemo(
    () => [
      {label: 'Русский', value: 'ru'},
      {label: 'English', value: 'en'},
    ],
    [],
  );

  const handleExport = useCallback(async () => {
    try {
      const result = await OfflineService.exportData();
      setExportData(result.json);
      setExportIssues(result.issues);
      setExportVisible(true);
    } catch (err) {
      console.error('Export error:', err);
      Alert.alert('Ошибка экспорта', 'Не удалось создать резервную копию данных.');
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!importText.trim()) {
      Alert.alert('Импорт данных', 'Вставьте данные резервной копии перед импортом.');
      return;
    }
    try {
      setImportLoading(true);
      const result = await OfflineService.importData(importText.trim());
      setImportIssues(result.issues);
      Alert.alert('Импорт завершён', 'Данные успешно восстановлены.', [
        {
          text: 'OK',
          onPress: () => {
            setImportVisible(false);
            setImportText('');
            loadSettings();
          },
        },
      ]);
    } catch (err) {
      console.error('Import error:', err);
      Alert.alert('Ошибка импорта', 'Не удалось восстановить данные. Проверьте формат JSON.');
    } finally {
      setImportLoading(false);
    }
  }, [importText, loadSettings]);

  if (!settingsLoaded || !form) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Загрузка настроек...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Единицы и язык</Text>

            <View style={styles.settingItemColumn}>
              <Text style={styles.settingLabel}>Система единиц</Text>
              <View style={styles.unitsRow}>
                {(['metric', 'imperial'] as UnitsSystem[]).map(option => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.unitChip, form.units === option && styles.unitChipActive]}
                    onPress={() => handleUnitsChange(option)}>
                    <Text
                      style={[styles.unitChipText, form.units === option && styles.unitChipTextActive]}>
                      {unitLabels[option]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.settingItemColumn}>
              <Text style={styles.settingLabel}>Язык интерфейса</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={form.language}
                  onValueChange={value => updateForm({language: value})}>
                  {languageOptions.map(option => (
                    <Picker.Item key={option.value} label={option.label} value={option.value} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Значения по умолчанию</Text>

            <View style={styles.settingItemColumn}>
              <Text style={styles.settingLabel}>Площадь по умолчанию, га</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={defaultAreaInput}
                onChangeText={setDefaultAreaInput}
                placeholder="Например, 50"
              />
            </View>

            <View style={styles.settingItemColumn}>
              <Text style={styles.settingLabel}>Вместимость опрыскивателя, л</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={sprayerInput}
                onChangeText={setSprayerInput}
                placeholder="Например, 300"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Уведомления</Text>

            <View style={styles.settingItem}>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Включить уведомления</Text>
                <Text style={styles.settingDescription}>
                  Предупреждения об обработках, складах и рисках резистентности
                </Text>
              </View>
              <Switch
                value={form.notificationsEnabled}
                onValueChange={value => updateForm({notificationsEnabled: value})}
                trackColor={{false: '#E0E0E0', true: '#4CAF50'}}
                thumbColor={form.notificationsEnabled ? '#2E7D32' : '#f4f3f4'}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Напоминания о плановых работах</Text>
                <Text style={styles.settingDescription}>
                  Уведомлять об обработках из сезонного плана
                </Text>
              </View>
              <Switch
                value={form.remindersEnabled}
                onValueChange={value => updateForm({remindersEnabled: value})}
                trackColor={{false: '#E0E0E0', true: '#4CAF50'}}
                thumbColor={form.remindersEnabled ? '#2E7D32' : '#f4f3f4'}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Резервное копирование</Text>
            <Text style={styles.sectionDescription}>
              Создавайте резервные копии и восстанавливайте данные. Экспорт включает культуры,
              вредителей, препараты, обработки, склад, матрицу совместимости и настройки пользователя.
            </Text>

            <View style={styles.settingItem}>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Автоматическое резервное копирование</Text>
                <Text style={styles.settingDescription}>
                  Автоматическое создание локальных резервных копий (офлайн)
                </Text>
              </View>
              <Switch
                value={form.autoBackupEnabled}
                onValueChange={value => updateForm({autoBackupEnabled: value})}
                trackColor={{false: '#E0E0E0', true: '#4CAF50'}}
                thumbColor={form.autoBackupEnabled ? '#2E7D32' : '#f4f3f4'}
              />
            </View>

            <TouchableOpacity style={styles.actionButton} onPress={handleExport}>
              <Text style={styles.actionButtonText}>Экспортировать данные (JSON)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonSecondary]}
              onPress={() => {
                setImportIssues([]);
                setImportVisible(true);
              }}>
              <Text style={styles.actionButtonText}>Импортировать данные (JSON)</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Сохранить</Text>
            )}
          </TouchableOpacity>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>О приложении</Text>

            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Версия</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>База данных</Text>
              <Text style={styles.infoValue}>SQLite (оффлайн)</Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Разработчик</Text>
              <Text style={styles.infoValue}>Видякин Дмитрий Александрович</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Поддержка</Text>
            <Text style={styles.supportText}>
              Полнофункциональное оффлайн приложение для агрономических расчётов. Все данные хранятся
              локально на вашем устройстве.
            </Text>
          </View>
        </View>
      </ScrollView>

      <Modal visible={exportVisible} animationType="slide" onRequestClose={() => setExportVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Резервная копия</Text>
          <Text style={styles.modalDescription}>
            Скопируйте текст ниже и сохраните в безопасном месте. Он содержит резервную копию всех
            данных приложения.
          </Text>
          {exportIssues.length > 0 && (
            <View style={styles.issueBox}>
              <Text style={styles.issueTitle}>Проверка данных</Text>
              {exportIssues.map(issue => (
                <Text key={issue} style={styles.issueText}>
                  • {issue}
                </Text>
              ))}
            </View>
          )}
          <ScrollView style={styles.exportContainer}>
            <Text selectable style={styles.exportText}>
              {exportData}
            </Text>
          </ScrollView>
          <TouchableOpacity
            style={[styles.actionButton, styles.modalButton]}
            onPress={() => setExportVisible(false)}>
            <Text style={styles.actionButtonText}>Закрыть</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

      <Modal visible={importVisible} animationType="slide" onRequestClose={() => setImportVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Импорт данных</Text>
          <Text style={styles.modalDescription}>
            Вставьте JSON, полученный при экспорте. Текущие данные будут перезаписаны.
          </Text>
          <TextInput
            style={styles.importInput}
            multiline
            textAlignVertical="top"
            placeholder="Вставьте сюда данные резервной копии"
            value={importText}
            onChangeText={setImportText}
          />
          {importIssues.length > 0 && (
            <View style={styles.issueBox}>
              <Text style={styles.issueTitle}>Результаты проверки</Text>
              {importIssues.map(issue => (
                <Text key={issue} style={styles.issueText}>
                  • {issue}
                </Text>
              ))}
            </View>
          )}
          {importLoading ? (
            <ActivityIndicator size="large" color="#2E7D32" style={styles.loadingIndicator} />
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.modalButton]}
              onPress={handleImport}>
              <Text style={styles.actionButtonText}>Импортировать</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, styles.modalButtonSecondary]}
            onPress={() => setImportVisible(false)}>
            <Text style={styles.actionButtonText}>Отмена</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  content: {
    flex: 1,
  },
  errorText: {
    backgroundColor: '#FFEBEE',
    color: '#C62828',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 16,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  settingItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  settingItemColumn: {
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
  settingContent: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  unitsRow: {
    flexDirection: 'column',
    gap: 8,
  },
  unitChip: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#E8F5E9',
  },
  unitChipActive: {
    backgroundColor: '#1B5E20',
  },
  unitChipText: {
    color: '#1B5E20',
    fontSize: 14,
    fontWeight: '600',
  },
  unitChipTextActive: {
    color: '#FFFFFF',
  },
  pickerWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontSize: 16,
    color: '#333',
  },
  actionButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  actionButtonSecondary: {
    backgroundColor: '#1B5E20',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#1B5E20',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  supportText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 16,
  },
  exportContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  exportText: {
    fontSize: 12,
    color: '#333',
  },
  modalButton: {
    marginTop: 16,
  },
  modalButtonSecondary: {
    marginTop: 12,
    backgroundColor: '#555',
  },
  importInput: {
    minHeight: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontSize: 13,
    color: '#333',
  },
  issueBox: {
    marginTop: 16,
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  issueTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 6,
  },
  issueText: {
    fontSize: 13,
    color: '#8D6E63',
    marginBottom: 2,
  },
  loadingIndicator: {
    marginTop: 16,
  },
});

export default SettingsScreen;
