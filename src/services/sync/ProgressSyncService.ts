/**
 * Progress Sync Service
 * Manages user progress synchronization across modules
 */

import { ProgressSync } from '../../modules/interfaces';

class ProgressSyncService {
  private progressCache: Map<string, Map<string, ProgressSync>> = new Map();

  /**
   * Store user progress for a topic
   */
  async storeProgress(userId: string, progress: ProgressSync): Promise<void> {
    try {
      if (!this.progressCache.has(userId)) {
        this.progressCache.set(userId, new Map());
      }

      const userProgress = this.progressCache.get(userId)!;
      userProgress.set(progress.topicId, progress);

      // Auto-sync to applicable modules
      await this.syncProgressAcrossModules(userId, progress);

      // TODO: Persist to backend
      console.log(`Progress for ${progress.topicName} stored and synced`);
    } catch (error) {
      throw new Error('Failed to store progress: ' + (error as Error).message);
    }
  }

  /**
   * Get user progress for a topic
   */
  async getProgress(userId: string, topicId: string): Promise<ProgressSync | null> {
    const userProgress = this.progressCache.get(userId);
    return userProgress?.get(topicId) || null;
  }

  /**
   * Get all progress for a user
   */
  async getAllProgress(userId: string): Promise<ProgressSync[]> {
    const userProgress = this.progressCache.get(userId);
    return userProgress ? Array.from(userProgress.values()) : [];
  }

  /**
   * Get progress by category
   */
  async getProgressByCategory(userId: string, category: string): Promise<ProgressSync[]> {
    const allProgress = await this.getAllProgress(userId);
    return allProgress.filter(p => p.category === category);
  }

  /**
   * Get progress for a specific module
   */
  async getProgressForModule(userId: string, moduleId: string): Promise<ProgressSync[]> {
    const allProgress = await this.getAllProgress(userId);
    return allProgress.filter(p => 
      p.sourceModule === moduleId || p.applicableModules.includes(moduleId)
    );
  }

  /**
   * Sync progress across applicable modules
   */
  private async syncProgressAcrossModules(userId: string, progress: ProgressSync): Promise<void> {
    // When a user masters a topic in one module, mark it for other modules too
    for (const moduleId of progress.applicableModules) {
      console.log(`Syncing ${progress.topicName} progress to ${moduleId}`);
      // TODO: Notify module of progress update
    }
  }

  /**
   * Get overall mastery level for a user
   */
  async getOverallMastery(userId: string): Promise<number> {
    const allProgress = await this.getAllProgress(userId);
    if (allProgress.length === 0) return 0;

    const totalMastery = allProgress.reduce((sum, p) => sum + p.masteryLevel, 0);
    return Math.round(totalMastery / allProgress.length);
  }

  /**
   * Get category-wise mastery
   */
  async getCategoryMastery(userId: string): Promise<Record<string, number>> {
    const allProgress = await this.getAllProgress(userId);
    const categoryMastery: Record<string, { total: number; count: number }> = {};

    allProgress.forEach(progress => {
      if (!categoryMastery[progress.category]) {
        categoryMastery[progress.category] = { total: 0, count: 0 };
      }
      categoryMastery[progress.category].total += progress.masteryLevel;
      categoryMastery[progress.category].count++;
    });

    const result: Record<string, number> = {};
    Object.keys(categoryMastery).forEach(category => {
      const { total, count } = categoryMastery[category];
      result[category] = Math.round(total / count);
    });

    return result;
  }

  /**
   * Check if topic is mastered in any module
   */
  async isTopicMastered(userId: string, topicId: string, threshold: number = 80): Promise<boolean> {
    const progress = await this.getProgress(userId, topicId);
    return progress ? progress.masteryLevel >= threshold : false;
  }

  /**
   * Get topics that need review
   */
  async getTopicsNeedingReview(userId: string, threshold: number = 60): Promise<ProgressSync[]> {
    const allProgress = await this.getAllProgress(userId);
    return allProgress.filter(p => p.masteryLevel < threshold);
  }

  /**
   * Update mastery level
   */
  async updateMasteryLevel(
    userId: string,
    topicId: string,
    newLevel: number
  ): Promise<void> {
    const progress = await this.getProgress(userId, topicId);
    if (progress) {
      progress.masteryLevel = Math.min(100, Math.max(0, newLevel));
      await this.storeProgress(userId, progress);
    }
  }

  /**
   * Mark topic as completed
   */
  async markTopicCompleted(userId: string, topicId: string): Promise<void> {
    await this.updateMasteryLevel(userId, topicId, 100);
  }
}

// Singleton instance
export const progressSyncService = new ProgressSyncService();
