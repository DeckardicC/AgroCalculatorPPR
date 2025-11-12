import React, {useCallback, useMemo, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Share,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import ReportService, {GeneratedReport} from '../services/ReportService';
import EmptyState from '../components/EmptyState';

interface ReportOption {
  id: string;
  title: string;
  description: string;
  generator: () => Promise<GeneratedReport>;
}

const ReportsScreen = () => {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [allLoading, setAllLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [error, setError] = useState<string | null>(null);

  const options = useMemo<ReportOption[]>(
    () => [
      {
        id: 'treatments',
        title: 'Отчёт по обработкам',
        description: 'CSV-файл с обработками, погодой и израсходованными препаратами',
        generator: () => ReportService.generateTreatmentReport(),
      },
      {
        id: 'economic-analytics',
        title: 'Экономическая аналитика',
        description: 'Сводная стоимость по культурам, препаратам и сезонам',
        generator: () => ReportService.generateEconomicAnalyticsReport(),
      },
      {
        id: 'agronomic-analytics',
        title: 'Агрономическая аналитика',
        description: 'Эффективность защиты по вредителям и рекомендации',
        generator: () => ReportService.generateAgronomicAnalyticsReport(),
      },
      {
        id: 'treatment-plans',
        title: 'План обработок',
        description: 'Планируемые обработки с окнами выполнения и рекомендуемыми продуктами',
        generator: () => ReportService.generateTreatmentPlanReport(),
      },
      {
        id: 'warehouse',
        title: 'Складской отчёт',
        description: 'Остатки препаратов, срок годности и стоимость закупки',
        generator: () => ReportService.generateWarehouseReport(),
      },
    ],
    [],
  );

  const openModal = useCallback((generated: GeneratedReport[]) => {
    setReports(generated);
    setModalVisible(true);
  }, []);

  const handleGenerate = useCallback(
    async (option: ReportOption) => {
      setError(null);
      setLoadingId(option.id);
      try {
        const result = await option.generator();
        openModal([result]);
      } catch (err) {
        console.error('Failed to generate report', err);
        setError('Не удалось сформировать отчёт. Попробуйте ещё раз.');
      } finally {
        setLoadingId(null);
      }
    },
    [openModal],
  );

  const handleGenerateAll = useCallback(async () => {
    setError(null);
    setAllLoading(true);
    try {
      const generated = await ReportService.generateAllReports();
      openModal(generated);
    } catch (err) {
      console.error('Failed to generate all reports', err);
      setError('Не удалось сформировать пакет отчётов.');
    } finally {
      setAllLoading(false);
    }
  }, [openModal]);

  const handleShare = useCallback(async (report: GeneratedReport) => {
    try {
      await Share.share({
        title: report.title,
        message: report.content,
      });
    } catch (err) {
      console.error('Share error', err);
      setError('Не удалось поделиться отчётом.');
    }
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Экспорт отчётов</Text>
        <Text style={styles.subtitle}>
          Сформируйте CSV-файлы и поделитесь ими через почту или мессенджеры. Файлы открываются в Excel и Google Sheets.
        </Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Доступные отчёты</Text>
          <TouchableOpacity
            style={[styles.primaryButton, allLoading && styles.disabledButton]}
            onPress={handleGenerateAll}
            disabled={allLoading}>
            {allLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Экспортировать все</Text>
            )}
          </TouchableOpacity>
        </View>

        {options.map(option => (
          <View key={option.id} style={styles.reportCard}>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{option.title}</Text>
              <Text style={styles.cardDescription}>{option.description}</Text>
            </View>
            <TouchableOpacity
              style={[styles.secondaryButton, loadingId === option.id && styles.disabledButton]}
              onPress={() => handleGenerate(option)}
              disabled={loadingId === option.id}>
              {loadingId === option.id ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Сформировать</Text>
              )}
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Готовые отчёты</Text>
          <Text style={styles.modalSubtitle}>
            Нажмите «Поделиться», чтобы отправить CSV-файл или скопировать содержимое.
          </Text>

          {reports.length === 0 ? (
            <EmptyState
              title="Нет данных"
              message="Отчёт не содержит записей"
              icon="📭"
            />
          ) : (
            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
              {reports.map(report => (
                <View key={report.id} style={styles.reportBlock}>
                  <View style={styles.reportHeader}>
                    <View style={styles.reportHeaderInfo}>
                      <Text style={styles.reportTitle}>{report.title}</Text>
                      <Text style={styles.reportFilename}>{report.filename}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.shareButton}
                      onPress={() => handleShare(report)}>
                      <Text style={styles.shareButtonText}>Поделиться</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView horizontal style={styles.csvContainer}>
                    <Text selectable style={styles.csvText}>
                      {report.content}
                    </Text>
                  </ScrollView>
                </View>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, styles.modalCloseButton]}
            onPress={() => setModalVisible(false)}>
            <Text style={styles.buttonText}>Закрыть</Text>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#555',
    marginBottom: 20,
    lineHeight: 20,
  },
  errorText: {
    backgroundColor: '#FFEBEE',
    color: '#C62828',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1B5E20',
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardContent: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B5E20',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#1B5E20',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#555',
    marginBottom: 16,
    lineHeight: 20,
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    paddingBottom: 24,
  },
  reportBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  reportHeaderInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B5E20',
  },
  reportFilename: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
  },
  shareButton: {
    backgroundColor: '#1976D2',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  csvContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#FAFAFA',
  },
  csvText: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'Courier',
  },
  modalCloseButton: {
    marginTop: 8,
  },
});

export default ReportsScreen;
