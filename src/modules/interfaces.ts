/**
 * Module Interface
 * Defines the contract that all mini-app modules must implement
 */

export interface ModuleConfig {
  id: string;
  name: string;
  version: string;
  description: string;
  icon: string;
  routes: ModuleRoute[];
  services?: ModuleService[];
  permissions?: string[];
}

export interface ModuleRoute {
  path: string;
  component: React.ComponentType<any>;
  name: string;
  icon?: string;
  requiresAuth?: boolean;
}

export interface ModuleService {
  name: string;
  endpoint: string;
  methods: ServiceMethod[];
}

export interface ServiceMethod {
  name: string;
  type: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
}

/**
 * Module Registry
 * Manages all registered modules in the Shell
 */
export interface ModuleRegistry {
  register(config: ModuleConfig): void;
  unregister(moduleId: string): void;
  getModule(moduleId: string): ModuleConfig | undefined;
  getAllModules(): ModuleConfig[];
  getModuleRoutes(): ModuleRoute[];
}

/**
 * Shared Data Interface
 * For cross-module data sharing (progress, content, etc.)
 */
export interface SharedData {
  userId: string;
  moduleId: string;
  dataType: 'progress' | 'content' | 'profile';
  data: any;
  timestamp: Date;
}

/**
 * Progress Sync Interface
 * For syncing user progress across modules
 */
export interface ProgressSync {
  topicId: string;
  topicName: string;
  category: string; // 'history', 'polity', 'current-affairs', etc.
  masteryLevel: number; // 0-100
  completedOn: Date;
  sourceModule: string;
  applicableModules: string[];
}

/**
 * Content Sync Interface
 * For sharing content across modules
 */
export interface ContentSync {
  contentId: string;
  title: string;
  category: string;
  contentType: 'text' | 'video' | 'quiz' | 'pdf';
  content: any;
  tags: string[];
  applicableFor: string[]; // module IDs
}

/**
 * User Profile Interface
 * Shared across all modules via SSO
 */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  preferences: UserPreferences;
  documents: DigiLockerDocument[];
  eligibility: EligibilityCriteria;
  location: UserLocation;
}

export interface UserPreferences {
  language: string;
  voiceEnabled: boolean;
  notificationsEnabled: boolean;
  targetExams: string[];
}

export interface DigiLockerDocument {
  id: string;
  type: string;
  name: string;
  uri: string;
  verifiedOn: Date;
}

export interface EligibilityCriteria {
  education: string[];
  age: number;
  category: 'GEN' | 'OBC' | 'SC' | 'ST' | 'EWS';
  state: string;
  district: string;
}

export interface UserLocation {
  state: string;
  district: string;
  taluk?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}
