import React, {useCallback, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import {format} from 'date-fns';
import {TreatmentPlanWithDetails} from '../../models/TreatmentPlan';
import TreatmentPlanningService from '../../services/TreatmentPlanningService';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

interface PlanSection {
  title: string;
  data: TreatmentPlanWithDetails[];
}

const TreatmentPlanningScreen = () => {
  const [plans, setPlans] = useState<TreatmentPlanWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      const seasonPlan = await TreatmentPlanningService.getSeasonPlan();
      setPlans(seasonPlan);
    } catch (error) {
      console.error('Error loading treatment plans:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPlans();
    }, [loadPlans]),
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadPlans();
  }, [loadPlans]);

  const handleComplete = useCallback(async (planId: number) => {
    await TreatmentPlanningService.markCompleted(planId);
    loadPlans();
  }, [loadPlans]);

  const handleSnooze = useCallback(async (planId: number, days: number = 7) => {
    await TreatmentPlanningService.snoozePlan(planId, days);
    loadPlans();
  }, [loadPlans]);

  const sections = useMemo<PlanSection[]>(() => {
    const grouped = new Map<string, TreatmentPlanWithDetails[]>();

    plans.forEach(plan => {
      const groupKey = format(new Date(plan.plannedDate * 1000), 'LLLL yyyy');
      const items = grouped.get(groupKey) ?? [];
      items.push(plan);
      grouped.set(groupKey, items);
    });

    return Array.from(grouped.entries()).map(([title, data]) => ({title, data}));
  }, [plans]);

  const renderPlan = ({item}: {item: TreatmentPlanWithDetails}) => {
    const statusInfo = getStatusInfo(item.status, item.isOverdue, item.isDueSoon);
    const plannedDateLabel = format(new Date(item.plannedDate * 1000), 'dd MMMM yyyy');

    return (
      <View
        style={[
          styles.planCard,
          statusInfo.containerStyle,
        ]}>
        <View style={styles.planHeader}>
          <Text style={styles.planField}>{item.fieldName ?? 'Неизвестное поле'}</Text>
          <View style={[styles.statusBadge, statusInfo.badgeStyle]}>
            <Text style={[styles.statusText, statusInfo.badgeTextStyle]}>{statusInfo.label}</Text>
          </View>
        </View>

        {item.cropName && (
          <Text style={styles.planCrop}>{item.cropName}</Text>
        )}

        <View style={styles.planRow}>
          <Text style={styles.planLabel}>Дата обработки:</Text>
          <Text style={styles.planValue}>{plannedDateLabel}</Text>
        </View>

        {item.plannedWindowLabel && (
          <View style={styles.planRow}>
            <Text style={styles.planLabel}>Окно проведения:</Text>
            <Text style={styles.planValue}>{item.plannedWindowLabel}</Text>
          </View>
        )}

        {typeof item.daysUntil === 'number' && (
          <View style={styles.planRow}>
            <Text style={styles.planLabel}>До обработки:</Text>
            <Text style={[styles.planValue, statusInfo.daysTextStyle]}>
              {item.daysUntil >= 0 ? `${item.daysUntil} дн.` : `Просрочено на ${Math.abs(item.daysUntil)} дн.`}
            </Text>
          </View>
        )}

        {item.recommendedProductNames && item.recommendedProductNames.length > 0 && (
          <View style={styles.planRow}>
            <Text style={styles.planLabel}>Рекомендуемые препараты:</Text>
            <Text style={styles.planValue}>
              {item.recommendedProductNames.join(', ')}
            </Text>
          </View>
        )}

        {item.reason && (
          <Text style={styles.planReason}>{item.reason}</Text>
        )}

        {item.warehouseStatus && (
          <View style={styles.planRow}>
            <Text style={styles.planLabel}>Склад:</Text>
            <Text style={[styles.planValue, getWarehouseStatusStyle(item.warehouseStatus)]}>
              {getWarehouseStatusLabel(item.warehouseStatus)}
            </Text>
          </View>
        )}

        {item.status !== 'completed' && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={() => handleComplete(item.id!)}>
              <Text style={styles.actionButtonText}>Отметить выполненной</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.snoozeButton]}
              onPress={() => handleSnooze(item.id!, 7)}>
              <Text style={styles.snoozeButtonText}>Перенести на +7 дн.</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <LoadingSpinner message="Формирование сезонного плана..." />
      </SafeAreaView>
    );
  }

  if (plans.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <EmptyState
          title="План обработок отсутствует"
          message="Добавьте поля и обработки, чтобы сформировать сезонный план"
          icon="📆"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <SectionList
        sections={sections}
        keyExtractor={item => `plan-${item.id}`}
        renderItem={renderPlan}
        renderSectionHeader={({section}) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
};

const getStatusInfo = (
  status: TreatmentPlanWithDetails['status'],
  isOverdue?: boolean,
  isDueSoon?: boolean,
) => {
  if (isOverdue) {
    return {
      label: 'Просрочено',
      badgeStyle: styles.statusBadgeOverdue,
      badgeTextStyle: styles.statusBadgeTextLight,
      containerStyle: styles.planCardOverdue,
      daysTextStyle: styles.planValueOverdue,
    };
  }

  if (status === 'completed') {
    return {
      label: 'Завершено',
      badgeStyle: styles.statusBadgeCompleted,
      badgeTextStyle: styles.statusBadgeTextLight,
      containerStyle: styles.planCardCompleted,
      daysTextStyle: styles.planValueCompleted,
    };
  }

  if (isDueSoon) {
    return {
      label: 'Скоро',
      badgeStyle: styles.statusBadgeSoon,
      badgeTextStyle: styles.statusBadgeTextLight,
      containerStyle: styles.planCardSoon,
      daysTextStyle: styles.planValueSoon,
    };
  }

  if (status === 'snoozed') {
    return {
      label: 'Перенесено',
      badgeStyle: styles.statusBadgeSnoozed,
      badgeTextStyle: styles.statusBadgeTextDark,
      containerStyle: undefined,
      daysTextStyle: undefined,
    };
  }

  return {
    label: status === 'in_progress' ? 'В работе' : 'Запланировано',
    badgeStyle: styles.statusBadgePlanned,
    badgeTextStyle: styles.statusBadgeTextLight,
    containerStyle: undefined,
    daysTextStyle: undefined,
  };
};

const getWarehouseStatusLabel = (
  status: NonNullable<TreatmentPlanWithDetails['warehouseStatus']>,
) => {
  switch (status) {
    case 'ok':
      return 'Запас в норме';
    case 'low_stock':
      return 'Мало остатка';
    case 'no_stock':
      return 'Нет препарата';
    default:
      return 'Неизвестно';
  }
};

const getWarehouseStatusStyle = (
  status: NonNullable<TreatmentPlanWithDetails['warehouseStatus']>,
) => {
  switch (status) {
    case 'ok':
      return styles.warehouseOk;
    case 'low_stock':
      return styles.warehouseLow;
    case 'no_stock':
      return styles.warehouseEmpty;
    default:
      return undefined;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 12,
    marginTop: 16,
  },
  planCard: {
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
  planCardOverdue: {
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
    backgroundColor: '#FFEBEE',
  },
  planCardSoon: {
    borderLeftWidth: 4,
    borderLeftColor: '#FFA000',
    backgroundColor: '#FFF3E0',
  },
  planCardCompleted: {
    opacity: 0.8,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planField: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
    flex: 1,
  },
  planCrop: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  planLabel: {
    fontSize: 13,
    color: '#777',
    flex: 1,
  },
  planValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  planReason: {
    fontSize: 13,
    color: '#555',
    marginTop: 8,
    lineHeight: 18,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadgePlanned: {
    backgroundColor: '#2E7D32',
  },
  statusBadgeCompleted: {
    backgroundColor: '#4CAF50',
  },
  statusBadgeOverdue: {
    backgroundColor: '#D32F2F',
  },
  statusBadgeSoon: {
    backgroundColor: '#FFA000',
  },
  statusBadgeSnoozed: {
    backgroundColor: '#E0E0E0',
  },
  statusBadgeTextLight: {
    color: '#FFFFFF',
  },
  statusBadgeTextDark: {
    color: '#333333',
  },
  planValueOverdue: {
    color: '#D32F2F',
    fontWeight: '600',
  },
  planValueSoon: {
    color: '#F57C00',
    fontWeight: '600',
  },
  planValueCompleted: {
    color: '#388E3C',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  completeButton: {
    backgroundColor: '#2E7D32',
  },
  snoozeButton: {
    backgroundColor: '#E0E0E0',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  snoozeButtonText: {
    color: '#333333',
    fontSize: 14,
    fontWeight: '600',
  },
  warehouseOk: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  warehouseLow: {
    color: '#FFA000',
    fontWeight: '600',
  },
  warehouseEmpty: {
    color: '#D32F2F',
    fontWeight: '600',
  },
});

export default TreatmentPlanningScreen;
