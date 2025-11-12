import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import DashboardScreen from '../screens/DashboardScreen';
import ProductSelectionScreen from '../screens/ProductSelectionScreen';
import CropSelectionScreen from '../screens/ProductSelection/CropSelectionScreen';
import PestSelectionScreen from '../screens/ProductSelection/PestSelectionScreen';
import ConditionsScreen from '../screens/ProductSelection/ConditionsScreen';
import ProductResultsScreen from '../screens/ProductSelection/ProductResultsScreen';
import CalculationScreen from '../screens/CalculationScreen';
import FieldListScreen from '../screens/Fields/FieldListScreen';
import FieldDetailScreen from '../screens/Fields/FieldDetailScreen';
import TreatmentListScreen from '../screens/Treatments/TreatmentListScreen';
import TreatmentDetailScreen from '../screens/Treatments/TreatmentDetailScreen';
import TreatmentPlanningScreen from '../screens/Treatments/TreatmentPlanningScreen';
import WarehouseScreen from '../screens/WarehouseScreen';
import SettingsScreen from '../screens/SettingsScreen';
import EconomicAnalyticsScreen from '../screens/Analytics/EconomicAnalyticsScreen';
import AgronomicAnalyticsScreen from '../screens/Analytics/AgronomicAnalyticsScreen';
import WarningScreen from '../screens/Warnings/WarningScreen';
import SearchScreen from '../screens/Search/SearchScreen';
import ReportsScreen from '../screens/ReportsScreen';

export type RootStackParamList = {
  Dashboard: undefined;
  ProductSelection: undefined;
  CropSelection: undefined;
  PestSelection: {cropId: number};
  Conditions: {cropId: number; pestIds: number[]};
  ProductResults: {
    cropId: number;
    pestIds: number[];
    conditions: any;
  };
  Calculation:
    | {
        productId?: number | null;
        area?: number;
        conditions?: any;
      }
    | undefined;
  FieldList: undefined;
  FieldDetail: {fieldId: number};
  TreatmentList: undefined;
  TreatmentDetail: {treatmentId?: number};
  TreatmentPlanning: undefined;
  Warehouse: undefined;
  Settings: undefined;
  EconomicAnalytics: undefined;
  AgronomicAnalytics: undefined;
  Warnings: undefined;
  Search: undefined;
  Reports: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Dashboard"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2E7D32',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}>
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{title: 'AgroCalculator PPR'}}
        />
        <Stack.Screen
          name="ProductSelection"
          component={ProductSelectionScreen}
          options={{title: 'Подбор препаратов'}}
        />
        <Stack.Screen
          name="CropSelection"
          component={CropSelectionScreen}
          options={{title: 'Выбор культуры'}}
        />
        <Stack.Screen
          name="PestSelection"
          component={PestSelectionScreen}
          options={{title: 'Выбор вредителей'}}
        />
        <Stack.Screen
          name="Conditions"
          component={ConditionsScreen}
          options={{title: 'Условия обработки'}}
        />
        <Stack.Screen
          name="ProductResults"
          component={ProductResultsScreen}
          options={{title: 'Рекомендуемые препараты'}}
        />
        <Stack.Screen
          name="Calculation"
          component={CalculationScreen}
          options={{title: 'Расчет раствора'}}
        />
        <Stack.Screen
          name="FieldList"
          component={FieldListScreen}
          options={{title: 'Поля'}}
        />
        <Stack.Screen
          name="FieldDetail"
          component={FieldDetailScreen}
          options={{title: 'Карточка поля'}}
        />
        <Stack.Screen
          name="TreatmentList"
          component={TreatmentListScreen}
          options={{title: 'Обработки'}}
        />
        <Stack.Screen
          name="TreatmentDetail"
          component={TreatmentDetailScreen}
          options={{title: 'Карточка обработки'}}
        />
        <Stack.Screen
          name="TreatmentPlanning"
          component={TreatmentPlanningScreen}
          options={{title: 'План обработок'}}
        />
        <Stack.Screen
          name="Warehouse"
          component={WarehouseScreen}
          options={{title: 'Склад'}}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{title: 'Настройки'}}
        />
        <Stack.Screen
          name="EconomicAnalytics"
          component={EconomicAnalyticsScreen}
          options={{title: 'Экономическая аналитика'}}
        />
        <Stack.Screen
          name="AgronomicAnalytics"
          component={AgronomicAnalyticsScreen}
          options={{title: 'Агрономическая аналитика'}}
        />
        <Stack.Screen
          name="Warnings"
          component={WarningScreen}
          options={{title: 'Система предупреждений'}}
        />
        <Stack.Screen
          name="Search"
          component={SearchScreen}
          options={{title: 'Расширенный поиск'}}
        />
        <Stack.Screen
          name="Reports"
          component={ReportsScreen}
          options={{title: 'Экспорт отчётов'}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

