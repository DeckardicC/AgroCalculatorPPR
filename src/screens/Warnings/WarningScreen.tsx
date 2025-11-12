import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, Text, StyleSheet, ScrollView, RefreshControl} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import WarningService, {WarningCategory, WarningItem, WarningSeverity, WarningSummary} from '../../services/WarningService';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

const categoryTitles: Record<WarningCategory, string> = {
  resistance: 'Риск резистентности',
  phytotoxicity: 'Фитотоксичность',
  quarantine: 'Карантинные ограничения',
  inventory: 'Складские остатки',
  weather: 'Неблагоприятная погода',
};

const severityStyles: Record<WarningSeverity, {container: object; text: object}> = {
  critical: {
    container: {backgroundColor: '#FFEBEE', borderLeftColor: '#D32F2F'},
    text: {color: '#D32F2F'},
  },
  caution: {
    container: {backgroundColor: '#FFF8E1', borderLeftColor: '#FFA000'},
    text: {color: '#F57C00'},
  },
  info: {
    container: {backgroundColor: '#E3F2FD', borderLeftColor: '#1976D2'},
    text: {color: '#1976D2'},
  },
};

const WarningScreen = () => {
  const [summary, setSummary] = useState<WarningSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadWarnings = useCallback(async () => {
    try {
      setLoading(true);
      const result = await WarningService.getWarnings();
      setSummary(result);
    } catch (error) {
      console.error('Error loading warnings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadWarnings();
  }, [loadWarnings]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadWarnings();
  }, [loadWarnings]);

  const groupedWarnings = useMemo(() => {
    if (!summary) return [];
    const groups = new Map<WarningCategory, WarningItem[]>();
    summary.warnings.forEach(warning => {
      const list = groups.get(warning.category) ?? [];
      list.push(warning);
      groups.set(warning.category, list);
    });
    return Array.from(groups.entries()).map(([category, warnings]) => ({category, warnings}));
  }, [summary]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <LoadingSpinner message="Анализ рисков..." />
      </SafeAreaView>
    );
  }

  if (!summary || summary.warnings.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <EmptyState
          title="Предупреждения отсутствуют"
          message="Все системы работают в штатном режиме."
          icon="✅"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <Text style={styles.title}>Система предупреждений</Text>
        <Text style={styles.subtitle}>
          Обновлено: {new Date(summary.generatedAt).toLocaleString('ru-RU')}
        </Text>

        {groupedWarnings.map(group => (
          <View key={group.category} style={styles.section}>
            <Text style={styles.sectionTitle}>{categoryTitles[group.category]}</Text>
            {group.warnings.map(item => {
              const severity = severityStyles[item.severity];
              return (
                <View
                  key={item.id}
                  style={[styles.warningCard, severity.container]}
                >
                  <Text style={[styles.warningTitle, severity.text]}>{item.title}</Text>
                  <Text style={styles.warningMessage}>{item.message}</Text>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
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
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 12,
  },
  warningCard: {
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  warningMessage: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
});

export default WarningScreen;
