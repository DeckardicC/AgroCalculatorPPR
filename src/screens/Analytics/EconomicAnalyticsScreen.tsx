import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, Text, StyleSheet, ScrollView, RefreshControl} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import AnalyticsService, {EconomicAnalytics, SeasonalCostStat} from '../../services/AnalyticsService';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import StatsCard from '../../components/StatsCard';
import {formatCurrency, formatNumber} from '../../utils/formatting';

const EconomicAnalyticsScreen = () => {
  const [analytics, setAnalytics] = useState<EconomicAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const data = await AnalyticsService.getEconomicAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading economic analytics:', error);
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

  const topCrops = useMemo(() => analytics?.crops.slice(0, 5) ?? [], [analytics]);
  const topProducts = useMemo(() => analytics?.products.slice(0, 5) ?? [], [analytics]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <LoadingSpinner message="Расчет аналитики..." />
      </SafeAreaView>
    );
  }

  if (!analytics || (analytics.crops.length === 0 && analytics.products.length === 0)) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <EmptyState
          title="Недостаточно данных"
          message="Добавьте обработки и препараты, чтобы увидеть экономическую аналитику"
          icon="📊"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        <Text style={styles.title}>Экономическая аналитика</Text>

        <View style={styles.summarySection}>
          <StatsCard
            title="Всего обработок"
            value={analytics.totals.totalTreatments}
            icon="📋"
            color="#7B1FA2"
            style={styles.summaryCard}
          />
          <StatsCard
            title="Общая площадь"
            value={formatNumber(analytics.totals.totalArea, 1)}
            unit="га"
            icon="📐"
            color="#1976D2"
            style={styles.summaryCard}
          />
          <StatsCard
            title="Общие затраты"
            value={formatCurrency(analytics.totals.totalCost)}
            icon="💰"
            color="#D32F2F"
            style={styles.summaryCard}
          />
        </View>

        {topCrops.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ТОП культур по затратам</Text>
            {topCrops.map(crop => (
              <View key={`crop-${crop.cropId}`} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{crop.cropName}</Text>
                  <Text style={styles.cardSubtitle}>{formatCurrency(crop.costPerHectare)} / га</Text>
                </View>
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>Обработки:</Text>
                  <Text style={styles.cardValue}>{crop.treatments}</Text>
                </View>
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>Площадь:</Text>
                  <Text style={styles.cardValue}>{formatNumber(crop.totalArea, 2)} га</Text>
                </View>
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>Затраты:</Text>
                  <Text style={styles.cardValue}>{formatCurrency(crop.totalCost)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {topProducts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ТОП препаратов по затратам</Text>
            {topProducts.map(product => (
              <View key={`product-${product.productId}`} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{product.productName}</Text>
                  {typeof product.estimatedEfficacy === 'number' && (
                    <Text style={styles.cardSubtitle}>
                      Эффективность ~ {formatNumber(product.estimatedEfficacy, 1)}%
                    </Text>
                  )}
                </View>
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>Применений:</Text>
                  <Text style={styles.cardValue}>{product.applications}</Text>
                </View>
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>Общая дозировка:</Text>
                  <Text style={styles.cardValue}>{formatNumber(product.totalDosage, 2)}</Text>
                </View>
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>Затраты:</Text>
                  <Text style={styles.cardValue}>{formatCurrency(product.totalCost)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {analytics.seasons.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Сезонный анализ затрат</Text>
            {analytics.seasons.map(season => (
              <SeasonRow key={season.season} season={season} />
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ROI</Text>
          <Text style={styles.note}>
            Для расчета ROI требуется информация о урожайности и доходах. Добавьте соответствующие данные,
            чтобы получить точные показатели окупаемости.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const SeasonRow = ({season}: {season: SeasonalCostStat}) => {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{season.season} сезон</Text>
        <Text style={styles.cardSubtitle}>{formatCurrency(season.totalCost)}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Обработки:</Text>
        <Text style={styles.cardValue}>{season.totalTreatments}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Площадь:</Text>
        <Text style={styles.cardValue}>{formatNumber(season.totalArea, 2)} га</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Средняя стоимость / обработку:</Text>
        <Text style={styles.cardValue}>{formatCurrency(season.avgCostPerTreatment)}</Text>
      </View>
    </View>
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
  note: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default EconomicAnalyticsScreen;
