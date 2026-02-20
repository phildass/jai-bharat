/**
 * Jai Bharat Super-App
 * Entry Point
 */

import React from 'react';
import { AppRegistry } from 'react-native';
import { name as appName } from './package.json';
import { ModuleRegistry } from './src/modules/ModuleRegistry';
import { LearnGovtJobsConfig } from './modules/learn-govt-jobs';
import { LearnIASConfig } from './modules/learn-ias';
import SubscriptionGuard from './src/core/shell/SubscriptionGuard';
import AppNavigator from './src/navigation/AppNavigator';

// Register modules
ModuleRegistry.register(LearnGovtJobsConfig);
ModuleRegistry.register(LearnIASConfig);

// Main App Component
const App = () => {
  return (
    <SubscriptionGuard>
      <AppNavigator />
    </SubscriptionGuard>
  );
};

AppRegistry.registerComponent(appName, () => App);

export default App;
