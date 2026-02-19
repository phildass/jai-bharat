# Module Integration Guide

This guide explains how to integrate mini-apps as modules into the Jai Bharat Super-App.

## Module Requirements

Each module must:
1. Implement the `ModuleConfig` interface
2. Export its configuration from `index.ts`
3. Register with the `ModuleRegistry`
4. Follow the shared data contracts

## Step-by-Step Integration

### 1. Create Module Structure

```bash
mkdir modules/my-module
cd modules/my-module
npm init -y
```

Create the following structure:
```
my-module/
├── package.json
├── index.ts          # Module config & exports
├── screens/          # Module screens
├── components/       # Module-specific components
└── services/         # Module-specific services
```

### 2. Implement Module Config

Create `index.ts`:

```typescript
import { ModuleConfig } from '../../src/modules/interfaces';

export const MyModuleConfig: ModuleConfig = {
  id: 'my-module',
  name: 'My Module',
  version: '1.0.0',
  description: 'Description of my module',
  icon: '📦',
  routes: [
    {
      path: '/my-module',
      component: require('./screens/HomeScreen').default,
      name: 'Home',
      icon: '🏠',
      requiresAuth: true,
    },
    // Add more routes
  ],
  services: [
    {
      name: 'content',
      endpoint: '/api/my-module/content',
      methods: [
        { name: 'getData', type: 'GET', path: '/data' },
      ],
    },
  ],
  permissions: ['read:content', 'write:progress'],
};
```

### 3. Create Module Screens

Create `screens/HomeScreen.tsx`:

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const HomeScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to My Module</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default HomeScreen;
```

### 4. Register Module with Shell

In your app initialization (e.g., `App.tsx`):

```typescript
import { ModuleRegistry } from './src/modules/ModuleRegistry';
import { MyModuleConfig } from './modules/my-module';

// Register modules
ModuleRegistry.register(MyModuleConfig);
```

### 5. Use Shared Services

#### Authentication

```typescript
import { authService } from '../../src/core/auth/AuthService';

// Check if user is authenticated
const isAuthenticated = authService.isAuthenticated();

// Get current user
const user = authService.getCurrentUser();

// Subscribe to auth changes
const unsubscribe = authService.subscribe((authState) => {
  console.log('Auth state changed:', authState);
});
```

#### Content Sync

```typescript
import { contentSyncService } from '../../src/services/sync/ContentSyncService';

// Store content that can be shared
await contentSyncService.storeContent({
  contentId: 'topic-123',
  title: 'Introduction to Polity',
  category: 'polity',
  contentType: 'text',
  content: { /* content data */ },
  tags: ['basics', 'constitution'],
  applicableFor: ['learn-govt-jobs', 'learn-ias'],
});

// Get content for your module
const content = await contentSyncService.getContentForModule('my-module');
```

#### Progress Sync

```typescript
import { progressSyncService } from '../../src/services/sync/ProgressSyncService';

// Store user progress
await progressSyncService.storeProgress(userId, {
  topicId: 'polity-101',
  topicName: 'Constitution Basics',
  category: 'polity',
  masteryLevel: 85,
  completedOn: new Date(),
  sourceModule: 'my-module',
  applicableModules: ['learn-govt-jobs', 'learn-ias'],
});

// Get progress for a topic
const progress = await progressSyncService.getProgress(userId, 'polity-101');
```

### 6. Implement Module Navigation

Use React Navigation within your module:

```typescript
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './screens/HomeScreen';
import DetailScreen from './screens/DetailScreen';

const Stack = createStackNavigator();

export const MyModuleNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Detail" component={DetailScreen} />
    </Stack.Navigator>
  );
};
```

### 7. Add Module Dependencies

Update `package.json`:

```json
{
  "name": "@jai-bharat/my-module",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "react-native": "^0.72.0"
  }
}
```

## Integration Patterns

### Pattern 1: Same Stack (Fully Compatible)

If the module uses the same tech stack (React Native):
- Direct integration as a workspace package
- Shared dependencies
- Full access to Shell services

### Pattern 2: Different Stack (Isolated Module)

If the module uses a different stack (Flutter, Native):
- Wrap in a WebView or native module
- Communicate via message passing
- Limited shared service access

### Pattern 3: Legacy Module (Gradual Migration)

If the module has legacy code:
- Create an adapter layer
- Gradually refactor to match interfaces
- Document migration plan

## Best Practices

### 1. State Management

Use module-local state:
```typescript
import { useState, useEffect } from 'react';

const MyComponent = () => {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    // Load data
  }, []);
  
  return (/* ... */);
};
```

### 2. API Calls

Use the shared API service:
```typescript
import { apiIntegrationService } from '../../src/services/api/APIIntegrationService';

// Fetch data from external API
const jobs = await apiIntegrationService.fetchAllJobs(filters);
```

### 3. Styling

Follow the app's design system:
```typescript
import { StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../src/shared/styles';

const styles = StyleSheet.create({
  container: {
    padding: spacing.medium,
    backgroundColor: colors.background,
  },
  title: {
    ...typography.heading,
    color: colors.primary,
  },
});
```

### 4. Error Handling

Handle errors gracefully:
```typescript
try {
  const data = await fetchData();
} catch (error) {
  console.error('Error:', error);
  // Show user-friendly error message
}
```

### 5. Testing

Write tests for your module:
```typescript
import { render } from '@testing-library/react-native';
import HomeScreen from './screens/HomeScreen';

describe('HomeScreen', () => {
  it('renders correctly', () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText('Welcome')).toBeTruthy();
  });
});
```

## Migration Strategy

### For Existing Apps

If migrating an existing app:

1. **Audit Phase**
   - Identify dependencies
   - Check compatibility
   - Document differences

2. **Adapter Phase**
   - Create interface adapters
   - Wrap incompatible parts
   - Test integration

3. **Refactor Phase**
   - Gradually align with Shell contracts
   - Migrate state management
   - Update navigation

4. **Optimization Phase**
   - Remove redundant code
   - Optimize bundle size
   - Improve performance

### Migration Checklist

- [ ] Module implements ModuleConfig interface
- [ ] Module screens use shared navigation
- [ ] Module uses authService for authentication
- [ ] Module stores shared content via contentSyncService
- [ ] Module syncs progress via progressSyncService
- [ ] Module follows app styling guidelines
- [ ] Module has proper error handling
- [ ] Module has tests
- [ ] Module documentation is complete

## Troubleshooting

### Module Not Loading

Check:
1. Module is registered in ModuleRegistry
2. Module config is exported correctly
3. Routes are defined properly
4. Dependencies are installed

### Navigation Issues

Check:
1. Navigation structure matches Shell expectations
2. Route paths are unique
3. Components are exported correctly

### Shared Services Not Working

Check:
1. Services are imported correctly
2. User is authenticated (for protected services)
3. Service initialization is complete

## Examples

### Example 1: Simple Content Module

```typescript
// modules/content-module/index.ts
export const ContentModuleConfig: ModuleConfig = {
  id: 'content-module',
  name: 'Content',
  version: '1.0.0',
  description: 'Simple content module',
  icon: '📄',
  routes: [
    {
      path: '/content',
      component: require('./screens/ContentScreen').default,
      name: 'Content',
    },
  ],
};
```

### Example 2: Interactive Quiz Module

```typescript
// modules/quiz-module/index.ts
export const QuizModuleConfig: ModuleConfig = {
  id: 'quiz-module',
  name: 'Quiz',
  version: '1.0.0',
  description: 'Interactive quiz module',
  icon: '❓',
  routes: [
    {
      path: '/quiz',
      component: require('./screens/QuizScreen').default,
      name: 'Quiz',
      requiresAuth: true,
    },
  ],
  permissions: ['read:content', 'write:progress'],
};
```

## Support

For integration support:
- Check documentation: `/docs`
- Review examples: `/modules/learn-govt-jobs` and `/modules/learn-ias`
- Contact: dev@jaibharat.cloud
