/**
 * Learn IAS Module
 * Elite: Deep analysis and essay writing for UPSC/State PSC
 */

import { ModuleConfig } from '../../src/modules/interfaces';

export const LearnIASConfig: ModuleConfig = {
  id: 'learn-ias',
  name: 'Learn IAS',
  version: '1.0.0',
  description: 'Deep analysis and essay writing for UPSC/State PSC preparation',
  icon: '🎓',
  routes: [
    {
      path: '/learn-ias',
      component: require('./screens/HomeScreen').default,
      name: 'Home',
      icon: '🏠',
      requiresAuth: true,
    },
    {
      path: '/learn-ias/prelims',
      component: require('./screens/PrelimsScreen').default,
      name: 'Prelims',
      icon: '📖',
      requiresAuth: true,
    },
    {
      path: '/learn-ias/mains',
      component: require('./screens/MainsScreen').default,
      name: 'Mains',
      icon: '✍️',
      requiresAuth: true,
    },
    {
      path: '/learn-ias/essay',
      component: require('./screens/EssayScreen').default,
      name: 'Essay',
      icon: '📝',
      requiresAuth: true,
    },
    {
      path: '/learn-ias/interview',
      component: require('./screens/InterviewScreen').default,
      name: 'Interview',
      icon: '🎤',
      requiresAuth: true,
    },
    {
      path: '/learn-ias/optional',
      component: require('./screens/OptionalScreen').default,
      name: 'Optional',
      icon: '📚',
      requiresAuth: true,
    },
  ],
  services: [
    {
      name: 'content',
      endpoint: '/api/learn-ias/content',
      methods: [
        { name: 'getTopics', type: 'GET', path: '/topics' },
        { name: 'getEssayPrompts', type: 'GET', path: '/essays' },
        { name: 'submitAnswer', type: 'POST', path: '/answers' },
      ],
    },
  ],
  permissions: ['read:content', 'write:progress', 'submit:essays'],
};

/**
 * Module Features:
 * 
 * 1. Deep Analysis Mode
 *    - In-depth articles and analysis
 *    - Linkage building exercises
 *    - Multi-dimensional perspectives
 * 
 * 2. Essay Writing Practice
 *    - Daily essay prompts
 *    - AI-powered evaluation
 *    - Structure and coherence feedback
 * 
 * 3. Prelims Preparation
 *    - CSAT practice
 *    - Current affairs integration
 *    - Conceptual clarity focus
 * 
 * 4. Mains Preparation
 *    - Answer writing practice
 *    - GS Papers 1-4
 *    - Optional subject support
 * 
 * 5. Interview Preparation
 *    - Mock interviews with AI
 *    - DAF-based questions
 *    - Current affairs discussion
 * 
 * 6. Shared Topics Integration
 *    - History, Polity (deeper analysis than Govt Jobs)
 *    - Current Affairs (analytical perspective)
 *    - Geography, Economy (advanced level)
 * 
 * 7. Study Plan
 *    - Rigorous year-long preparation
 *    - Daily targets and tracking
 *    - Revision schedules
 */
