import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, Text, StyleSheet, ScrollView, RefreshControl} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import AgronomicAnalyticsService, {
  AgronomicAnalytics,
  PestControlStat,
  AgronomicRecommendation,
} from '../../services/AgronomicAnalyticsService';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import StatsCard from '../../components/StatsCard';
import {formatNumber} from '../../utils/formatting';

const AgronomicAnalyticsScreen = () => {
  const [analytics, setAnalytics] = useState<AgronomicAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const data = await AgronomicAnalyticsService.getAgronomicAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading agronomic analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadAnalytics();
  }, [loadAnalytics]);

  const topPests = useMemo(() => analytics?.pests.slice(0, 5) ?? [], [analytics]);
  const recommendations = useMemo(() => analytics?.recommendations ?? [], [analytics]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <LoadingSpinner message="Расчет агрономической аналитики..." />
      </SafeAreaView>
    );
  }

  if (!analytics || analytics.pests.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <EmptyState
          title="Недостаточно данных"
          message="Добавьте обработки и препараты, чтобы увидеть агрономическую аналитику"
          icon="🌱"
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
        <Text style={styles.title}>Агрономическая аналитика</Text>

        <View style={styles.summarySection}>
          <StatsCard
            title="Вредители под контролем"
            value={analytics.totals.totalPests}
            icon="🪲"
            color="#7B1FA2"
            style={styles.summaryCard}
          />
          <StatsCard
            title="Всего обработок"
            value={analytics.totals.totalTreatments}
            icon="📋"
            color="#2E7D32"
            style={styles.summaryCard}
          />
          <StatsCard
            title="Средняя эффективность"
            value={formatNumber(analytics.totals.overallAvgEfficacy, 1)}
            unit="%"
            icon="⚗️"
            color={analytics.totals.overallAvgEfficacy >= 85 ? '#2E7D32' : '#FFA000'}
            style={styles.summaryCard}
          />
        </View>

        {topPests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ТОП вредителей по числу обработок</Text>
            {topPests.map(pest => (
              <PestCard key={`pest-${pest.pestId}`} pest={pest} />
            ))}
          </View>
        )}

        {analytics.seasons.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Сезонное сравнение</Text>
            {analytics.seasons.map(season => (
              <View key={`season-${season.season}`} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{season.season} сезон</Text>
                  <Text style={styles.cardSubtitle}>{season.totalTreatments} обработок</Text>
                </View>
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>Уникальные вредители:</Text>
                  <Text style={styles.cardValue}>{season.uniquePests}</Text>
                </View>
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>Уникальные препараты:</Text>
                  <Text style={styles.cardValue}>{season.uniqueProducts}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {analytics.trends.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Динамика по вредителям</Text>
            {analytics.trends.slice(0, 5).map(trend => (
              <View key={`trend-${trend.pestId}`} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{trend.pestName}</Text>
                  <Text style={styles.cardSubtitle}>Динамика по сезонам</Text>
                </View>
                {trend.seasons.map(item => (
                  <View key={`${trend.pestId}-${item.season}`} style={styles.cardRow}>
                    <Text style={styles.cardLabel}>{item.season}:</Text>
                    <Text style={styles.cardValue}>{item.treatments} обработок</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {recommendations.length > 0 && (
          <RecommendationsSection recommendations={recommendations} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const PestCard = ({pest}: {pest: PestControlStat}) => {
  const topProduct = pest.products[0];
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>{pest.pestName}</Text>
          <Text style={styles.cardSubtitle}>Тип: {translatePestType(pest.pestType)}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{formatNumber(pest.avgEfficacy, 1)}%</Text>
        </View>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Обработок:</Text>
        <Text style={styles.cardValue}>{pest.treatments}</Text>
      </View>
      {topProduct && (
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Чаще всего:</Text>
          <Text style={styles.cardValue}>
            {topProduct.productName} ({formatNumber(topProduct.avgEfficacy, 1)}%)
          </Text>
        </View>
      )}
      {pest.products.slice(0, 3).map(product => (
        <View key={`pest-${pest.pestId}-product-${product.productId}`} style={styles.productRow}>
          <Text style={styles.productName}>{product.productName}</Text>
          <Text style={styles.productInfo}>
            {product.applications} раз · {formatNumber(product.avgEfficacy, 1)}%
          </Text>
        </View>
      ))}
    </View>
  );
};

const RecommendationsSection = ({
  recommendations,
}: {
  recommendations: AgronomicRecommendation[];
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Рекомендации</Text>
    {recommendations.map(recommendation => (
      <View key={`rec-${recommendation.pestId}`} style={[styles.card, styles.warningCard]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{recommendation.pestName}</Text>
          <Text style={[styles.cardSubtitle, styles.warningText]}>
            Средняя эффективность: {formatNumber(recommendation.avgEfficacy, 1)}%
          </Text>
        </View>
        <Text style={styles.warningMessage}>{recommendation.message}</Text>
        <Text style={styles.warningFooter}>
          Обработок: {recommendation.treatments}
        </Text>
      </View>
    ))}
  </View>
);

const translatePestType = (type: string): string => {
  switch (type) {
    case 'weed':
      return 'Сорняк';
    case 'disease':
      return 'Болезнь';
    case 'insect':
      return 'Насекомое';
    case 'nematode':
      return 'Нематода';
    default:
      return 'Неизвестно';
  }
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
    marginBottom: 16,
  },
  summarySection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  summaryCard: {
    width: '31%',
    minWidth: 120,
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
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B5E20',
    flex: 1,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardLabel: {
    fontSize: 13,
    color: '#777',
    flex: 1,
  },
  cardValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  productName: {
    fontSize: 13,
    color: '#555',
    flex: 1,
  },
  productInfo: {
    fontSize: 13,
    color: '#777',
  },
  badge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  badgeText: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  warningCard: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FFA000',
  },
  warningText: {
    color: '#E65100',
  },
  warningMessage: {
    fontSize: 14,
    color: '#E65100',
    marginBottom: 8,
  },
  warningFooter: {
    fontSize: 12,
    color: '#8D6E63',
  },
});

export default AgronomicAnalyticsScreen;
