/**
 * Learn Govt Jobs Module
 * Foundation: Speed-driven prep for SSC, Banking, Railways, Police
 */

import { ModuleConfig } from '../../src/modules/interfaces';

export const LearnGovtJobsConfig: ModuleConfig = {
  id: 'learn-govt-jobs',
  name: 'Learn Govt Jobs',
  version: '1.0.0',
  description: 'Speed-driven preparation for SSC, Banking, Railways, Police exams',
  icon: '📚',
  routes: [
    {
      path: '/learn-govt-jobs',
      component: require('./screens/HomeScreen').default,
      name: 'Home',
      icon: '🏠',
      requiresAuth: true,
    },
    {
      path: '/learn-govt-jobs/ssc',
      component: require('./screens/SSCScreen').default,
      name: 'SSC',
      icon: '📝',
      requiresAuth: true,
    },
    {
      path: '/learn-govt-jobs/banking',
      component: require('./screens/BankingScreen').default,
      name: 'Banking',
      icon: '🏦',
      requiresAuth: true,
    },
    {
      path: '/learn-govt-jobs/railways',
      component: require('./screens/RailwaysScreen').default,
      name: 'Railways',
      icon: '🚂',
      requiresAuth: true,
    },
    {
      path: '/learn-govt-jobs/police',
      component: require('./screens/PoliceScreen').default,
      name: 'Police',
      icon: '👮',
      requiresAuth: true,
    },
    {
      path: '/learn-govt-jobs/practice',
      component: require('./screens/PracticeScreen').default,
      name: 'Practice',
      icon: '✏️',
      requiresAuth: true,
    },
  ],
  services: [
    {
      name: 'content',
      endpoint: '/api/learn-govt-jobs/content',
      methods: [
        { name: 'getTopics', type: 'GET', path: '/topics' },
        { name: 'getQuestions', type: 'GET', path: '/questions' },
      ],
    },
  ],
  permissions: ['read:content', 'write:progress'],
};

/**
 * Module Features:
 * 
 * 1. Speed-Driven MCQ Practice
 *    - Timed quizzes for quick problem-solving
 *    - MCQ drill mode
 *    - Instant feedback
 * 
 * 2. Exam-Specific Sections
 *    - SSC CGL, CHSL, MTS
 *    - Banking (IBPS, SBI, RBI)
 *    - Railways (RRB NTPC, Group D)
 *    - Police (State & Central)
 * 
 * 3. Shared Topics Integration
 *    - History, Polity, Geography (linked with Learn IAS)
 *    - Current Affairs (synced daily)
 *    - General Science & Reasoning
 * 
 * 4. Progress Tracking
 *    - Topic-wise mastery
 *    - Speed metrics
 *    - Weak areas identification
 * 
 * 5. Mock Tests
 *    - Full-length mock exams
 *    - Sectional tests
 *    - Previous year papers
 */
