import React, {useState, useCallback} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../navigation/AppNavigator';
import FieldRepository from '../repositories/FieldRepository';
import TreatmentRepository from '../repositories/TreatmentRepository';
import WarehouseRepository from '../repositories/WarehouseRepository';
import LoadingSpinner from '../components/LoadingSpinner';
import StatsCard from '../components/StatsCard';

type DashboardScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Dashboard'>;

const DashboardScreen = () => {
  const navigation = useNavigation<DashboardScreenNavigationProp>();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalFields: 0,
    totalArea: 0,
    totalTreatments: 0,
    expiringProducts: 0,
  });

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [allFields, allTreatments] = await Promise.all([
        FieldRepository.getAll(),
        TreatmentRepository.getAll(),
      ]);

      const totalArea = allFields.reduce((sum, field) => sum + field.area, 0);
      const expiringProducts = await WarehouseRepository.getExpiringSoon(30);

      setStats({
        totalFields: allFields.length,
        totalArea: totalArea,
        totalTreatments: allTreatments.length,
        expiringProducts: expiringProducts.length,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData]),
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LoadingSpinner message="Загрузка..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.appName}>AgroCalculator PPR</Text>
          <Text style={styles.tagline}>Оффлайн калькулятор для агронома</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.heroBanner}>
            <Text style={styles.heroText}>
              Полнофункциональные расчёты, аналитика и склад в одном приложении
            </Text>
          </View>

          {/* Statistics */}
          <View style={styles.statsContainer}>
            <StatsCard
              title="Поля"
              value={stats.totalFields}
              icon="🏞️"
              color="#2E7D32"
            />
            <StatsCard
              title="Площадь"
              value={stats.totalArea.toFixed(1)}
              unit="га"
              icon="📐"
              color="#1976D2"
            />
            <StatsCard
              title="Обработки"
              value={stats.totalTreatments}
              icon="📋"
              color="#7B1FA2"
            />
            {stats.expiringProducts > 0 && (
              <StatsCard
                title="Истекает"
                value={stats.expiringProducts}
                icon="⚠️"
                color="#D32F2F"
              />
            )}
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <Text style={styles.sectionTitle}>Быстрый доступ</Text>
            
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Search')}>
              <View style={styles.actionIconContainer}>
                <Text style={styles.actionIcon}>🔎</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Поиск и фильтры</Text>
                <Text style={styles.actionDescription}>
                  Быстрая фильтрация культур, вредителей и препаратов
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('ProductSelection')}>
              <View style={styles.actionIconContainer}>
                <Text style={styles.actionIcon}>🌾</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Подбор препаратов</Text>
                <Text style={styles.actionDescription}>
                  Интеллектуальный подбор средств защиты растений
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Calculation')}>
              <View style={styles.actionIconContainer}>
                <Text style={styles.actionIcon}>🧪</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Расчет растворов</Text>
                <Text style={styles.actionDescription}>
                  Расчет рабочих растворов и баковых смесей
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('TreatmentList')}>
              <View style={styles.actionIconContainer}>
                <Text style={styles.actionIcon}>📋</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Учет обработок</Text>
                <Text style={styles.actionDescription}>
                  Ведение истории обработок и планирование
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Warnings')}>
              <View style={styles.actionIconContainer}>
                <Text style={styles.actionIcon}>⚠️</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Предупреждения</Text>
                <Text style={styles.actionDescription}>
                  Риски резистентности, фитотоксичности и условий хранения
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('EconomicAnalytics')}>
              <View style={styles.actionIconContainer}>
                <Text style={styles.actionIcon}>📊</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Экономическая аналитика</Text>
                <Text style={styles.actionDescription}>
                  Стоимость по культурам и эффективность препаратов
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('AgronomicAnalytics')}>
              <View style={styles.actionIconContainer}>
                <Text style={styles.actionIcon}>🌱</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Агрономическая аналитика</Text>
                <Text style={styles.actionDescription}>
                  Эффективность защиты и динамика вредителей
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Reports')}>
              <View style={styles.actionIconContainer}>
                <Text style={styles.actionIcon}>📄</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Экспорт отчётов</Text>
                <Text style={styles.actionDescription}>
                  Получите CSV-файлы по обработкам, аналитике и складу
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('TreatmentPlanning')}>
              <View style={styles.actionIconContainer}>
                <Text style={styles.actionIcon}>📆</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>План обработок</Text>
                <Text style={styles.actionDescription}>
                  Сезонный календарь и напоминания
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('FieldList')}>
              <View style={styles.actionIconContainer}>
                <Text style={styles.actionIcon}>🏞️</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Поля</Text>
                <Text style={styles.actionDescription}>
                  Управление полями и севооборотом
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Warehouse')}>
              <View style={styles.actionIconContainer}>
                <Text style={styles.actionIcon}>📦</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Склад</Text>
                <Text style={styles.actionDescription}>
                  Учет препаратов на складе
                  {stats.expiringProducts > 0 && (
                    <Text style={styles.warningText}>
                      {' '}({stats.expiringProducts} истекает)
                    </Text>
                  )}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Settings')}>
              <View style={styles.actionIconContainer}>
                <Text style={styles.actionIcon}>⚙️</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Настройки</Text>
                <Text style={styles.actionDescription}>
                  Настройки приложения
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    flexGrow: 1,
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
  header: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  appName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tagline: {
    marginTop: 4,
    fontSize: 12,
    color: '#C8E6C9',
  },
  content: {
    padding: 16,
  },
  heroBanner: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  heroText: {
    fontSize: 14,
    color: '#1B5E20',
    lineHeight: 18,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickActions: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 16,
  },
  actionCard: {
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
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionIcon: {
    fontSize: 24,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  warningText: {
    color: '#FF9800',
    fontWeight: '600',
  },
});

export default DashboardScreen;
