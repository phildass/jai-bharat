/**
 * App Navigator
 * Top-level navigation for Jai Bharat.
 * Tabs: Home | Jobs | Near Me
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

import JobsSearchScreen from '../screens/jobs/JobsSearchScreen';
import JobDetailScreen from '../screens/jobs/JobDetailScreen';
import JobsNearMeScreen from '../screens/jobs/JobsNearMeScreen';

// ─── Home placeholder ─────────────────────────────────────────────────────────
function HomeScreen() {
  return (
    <View style={styles.homeContainer}>
      <Text style={styles.homeTitle}>🇮🇳 Jai Bharat</Text>
      <Text style={styles.homeSubtitle}>India Govt. Jobs. Everywhere. Anywhere. Every Job.</Text>
    </View>
  );
}

// ─── Jobs stack (Search → Detail) ────────────────────────────────────────────
const JobsStack = createStackNavigator();
function JobsNavigator() {
  return (
    <JobsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#FF6B35' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <JobsStack.Screen
        name="JobsList"
        component={JobsSearchScreen}
        options={{ headerShown: false }}
      />
      <JobsStack.Screen
        name="JobDetail"
        component={JobDetailScreen}
        options={{ title: 'Job Details' }}
      />
    </JobsStack.Navigator>
  );
}

// ─── Bottom tabs ──────────────────────────────────────────────────────────────
const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#FF6B35',
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarStyle: { borderTopColor: '#E5E7EB' },
          headerShown: false,
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ tabBarLabel: 'Home', tabBarIcon: () => <Text>🏠</Text> }}
        />
        <Tab.Screen
          name="Jobs"
          component={JobsNavigator}
          options={{ tabBarLabel: 'Jobs', tabBarIcon: () => <Text>💼</Text> }}
        />
        <Tab.Screen
          name="NearMe"
          component={JobsNearMeScreen}
          options={{ tabBarLabel: 'Near Me', tabBarIcon: () => <Text>��</Text> }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  homeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  homeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 8,
  },
  homeSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
