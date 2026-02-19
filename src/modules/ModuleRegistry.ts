/**
 * Module Registry Implementation
 * Central registry for all mini-app modules
 */

import { ModuleConfig, ModuleRegistry as IModuleRegistry, ModuleRoute } from './interfaces';

class ModuleRegistryImpl implements IModuleRegistry {
  private modules: Map<string, ModuleConfig> = new Map();

  register(config: ModuleConfig): void {
    if (this.modules.has(config.id)) {
      console.warn(`Module ${config.id} is already registered. Updating configuration.`);
    }
    this.modules.set(config.id, config);
    console.log(`Module ${config.name} (${config.id}) registered successfully.`);
  }

  unregister(moduleId: string): void {
    if (!this.modules.has(moduleId)) {
      console.warn(`Module ${moduleId} is not registered.`);
      return;
    }
    this.modules.delete(moduleId);
    console.log(`Module ${moduleId} unregistered successfully.`);
  }

  getModule(moduleId: string): ModuleConfig | undefined {
    return this.modules.get(moduleId);
  }

  getAllModules(): ModuleConfig[] {
    return Array.from(this.modules.values());
  }

  getModuleRoutes(): ModuleRoute[] {
    const routes: ModuleRoute[] = [];
    this.modules.forEach((module) => {
      routes.push(...module.routes);
    });
    return routes;
  }
}

// Singleton instance
export const ModuleRegistry = new ModuleRegistryImpl();
