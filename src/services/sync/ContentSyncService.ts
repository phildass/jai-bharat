/**
 * Content Sync Engine
 * Manages content sharing and synchronization across modules
 */

import { ContentSync } from '../../modules/interfaces';

class ContentSyncService {
  private contentCache: Map<string, ContentSync> = new Map();

  /**
   * Store content that can be shared across modules
   */
  async storeContent(content: ContentSync): Promise<void> {
    try {
      this.contentCache.set(content.contentId, content);
      // TODO: Persist to backend
      console.log(`Content ${content.contentId} stored for modules:`, content.applicableFor);
    } catch (error) {
      throw new Error('Failed to store content: ' + (error as Error).message);
    }
  }

  /**
   * Get content by ID
   */
  async getContent(contentId: string): Promise<ContentSync | null> {
    return this.contentCache.get(contentId) || null;
  }

  /**
   * Get all content for a specific module
   */
  async getContentForModule(moduleId: string): Promise<ContentSync[]> {
    const contents: ContentSync[] = [];
    this.contentCache.forEach((content) => {
      if (content.applicableFor.includes(moduleId)) {
        contents.push(content);
      }
    });
    return contents;
  }

  /**
   * Get content by category
   */
  async getContentByCategory(category: string, moduleId?: string): Promise<ContentSync[]> {
    const contents: ContentSync[] = [];
    this.contentCache.forEach((content) => {
      if (content.category === category) {
        if (!moduleId || content.applicableFor.includes(moduleId)) {
          contents.push(content);
        }
      }
    });
    return contents;
  }

  /**
   * Search content by tags
   */
  async searchContentByTags(tags: string[], moduleId?: string): Promise<ContentSync[]> {
    const contents: ContentSync[] = [];
    this.contentCache.forEach((content) => {
      const hasMatchingTag = tags.some(tag => content.tags.includes(tag));
      if (hasMatchingTag) {
        if (!moduleId || content.applicableFor.includes(moduleId)) {
          contents.push(content);
        }
      }
    });
    return contents;
  }

  /**
   * Update content applicability
   */
  async updateContentApplicability(contentId: string, modules: string[]): Promise<void> {
    const content = this.contentCache.get(contentId);
    if (content) {
      content.applicableFor = modules;
      this.contentCache.set(contentId, content);
      // TODO: Update backend
      console.log(`Content ${contentId} applicability updated`);
    }
  }

  /**
   * Delete content
   */
  async deleteContent(contentId: string): Promise<void> {
    this.contentCache.delete(contentId);
    // TODO: Delete from backend
    console.log(`Content ${contentId} deleted`);
  }

  /**
   * Get shared topics (History, Polity, Current Affairs, etc.)
   */
  async getSharedTopics(): Promise<string[]> {
    return [
      'history',
      'polity',
      'geography',
      'economy',
      'current-affairs',
      'general-science',
      'environment',
    ];
  }

  /**
   * Get adaptive content delivery based on exam type
   */
  async getAdaptiveContent(
    category: string,
    examType: 'govt-jobs' | 'ias',
    userId: string
  ): Promise<ContentSync[]> {
    const allContent = await this.getContentByCategory(category);
    
    // Filter and adapt content based on exam type
    return allContent.filter(content => {
      if (examType === 'govt-jobs') {
        // For govt jobs: MCQ-focused, speed-driven
        return content.contentType === 'quiz' || content.tags.includes('mcq');
      } else {
        // For IAS: Deep dive, essay-focused
        return content.contentType === 'text' || content.tags.includes('essay');
      }
    });
  }
}

// Singleton instance
export const contentSyncService = new ContentSyncService();
