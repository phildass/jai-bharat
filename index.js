/**
 * Jai Bharat Super-App
 * Entry Point
 */

import { AppRegistry } from 'react-native';
import { name as appName } from './package.json';
import { ModuleRegistry } from './src/modules/ModuleRegistry';
import { LearnGovtJobsConfig } from './modules/learn-govt-jobs';
import { LearnIASConfig } from './modules/learn-ias';

// Register modules
ModuleRegistry.register(LearnGovtJobsConfig);
ModuleRegistry.register(LearnIASConfig);

// Main App Component (to be implemented)
const App = () => {
  return null; // Placeholder - actual implementation needed
};

AppRegistry.registerComponent(appName, () => App);

export default App;
