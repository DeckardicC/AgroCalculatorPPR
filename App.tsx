/**
 * AgroCalculator PPR
 * Full-featured offline agricultural calculator application
 * for crop protection products (PPR) calculations
 */

import React, {useEffect, useState} from 'react';
import {StatusBar, useColorScheme, View, Text, ActivityIndicator} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import DatabaseService from './src/services/DatabaseService';

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await DatabaseService.initialize();
        setIsLoading(false);
      } catch (err) {
        console.error('App initialization error:', err);
        setError('Ошибка инициализации базы данных');
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  if (isLoading) {
    return (
      <GestureHandlerRootView style={{flex: 1}}>
        <SafeAreaProvider>
          <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5'}}>
            <ActivityIndicator size="large" color="#2E7D32" />
            <Text style={{marginTop: 16, color: '#666'}}>Инициализация базы данных...</Text>
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  if (error) {
    return (
      <GestureHandlerRootView style={{flex: 1}}>
        <SafeAreaProvider>
          <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5', padding: 20}}>
            <Text style={{fontSize: 18, color: '#D32F2F', textAlign: 'center'}}>{error}</Text>
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor="#2E7D32"
        />
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
