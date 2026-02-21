/**
 * App Navigator
 * Top-level navigation for Jai Bharat: Core, Learn Govt Jobs, Learn IAS
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import JobsListScreen   from '../screens/jobs/JobsListScreen';
import JobDetailScreen  from '../screens/jobs/JobDetailScreen';
import JobsNearMeScreen from '../screens/jobs/JobsNearMeScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Jobs"
        screenOptions={{
          headerStyle:     { backgroundColor: '#4F46E5' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen
          name="Jobs"
          component={JobsListScreen}
          options={{ title: '🇮🇳 Govt Jobs' }}
        />
        <Stack.Screen
          name="JobDetail"
          component={JobDetailScreen}
          options={{ title: 'Job Details' }}
        />
        <Stack.Screen
          name="JobsNearMe"
          component={JobsNearMeScreen}
          options={{ title: 'Jobs Near Me' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
