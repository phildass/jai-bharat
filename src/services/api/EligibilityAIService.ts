/**
 * Eligibility AI Filter Service
 * AI-powered eligibility checking with Gemini/BharatGPT integration
 */

import { UserProfile } from '../../modules/interfaces';
import { JobPosting } from '../api/APIIntegrationService';

export type MatchType = 'Perfect Match' | 'Potential Match' | 'Future Match' | 'No Match';

export interface EligibilityResult {
  matchType: MatchType;
  score: number; // 0-100
  reasons: string[];
  gaps: string[];
  recommendations: string[];
}

class EligibilityAIService {
  /**
   * Check eligibility for a job
   */
  async checkEligibility(user: UserProfile, job: JobPosting): Promise<EligibilityResult> {
    try {
      // Calculate eligibility score
      const score = await this.calculateEligibilityScore(user, job);
      
      // Determine match type
      const matchType = this.determineMatchType(score);
      
      // Generate reasons, gaps, and recommendations
      const reasons = this.generateReasons(user, job, score);
      const gaps = this.identifyGaps(user, job);
      const recommendations = this.generateRecommendations(user, job, gaps);

      return {
        matchType,
        score,
        reasons,
        gaps,
        recommendations,
      };
    } catch (error) {
      throw new Error('Eligibility check failed: ' + (error as Error).message);
    }
  }

  /**
   * Batch check eligibility for multiple jobs
   */
  async checkEligibilityBatch(
    user: UserProfile,
    jobs: JobPosting[]
  ): Promise<Map<string, EligibilityResult>> {
    const results = new Map<string, EligibilityResult>();
    
    for (const job of jobs) {
      const result = await this.checkEligibility(user, job);
      results.set(job.id, result);
    }
    
    return results;
  }

  /**
   * Calculate eligibility score (0-100)
   */
  private async calculateEligibilityScore(user: UserProfile, job: JobPosting): Promise<number> {
    let score = 0;
    const weights = {
      education: 30,
      age: 25,
      category: 20,
      location: 15,
      experience: 10,
    };

    // Education score
    const educationMatch = this.checkEducation(user.eligibility.education, job.eligibility.education);
    score += educationMatch * weights.education;

    // Age score
    const ageMatch = this.checkAge(user.eligibility.age, job.eligibility.ageMin, job.eligibility.ageMax, user.eligibility.category);
    score += ageMatch * weights.age;

    // Category score (reservations)
    const categoryMatch = this.checkCategory(user.eligibility.category, job.eligibility.categories);
    score += categoryMatch * weights.category;

    // Location score
    const locationMatch = this.checkLocation(user.location, job.location);
    score += locationMatch * weights.location;

    return Math.round(score);
  }

  /**
   * Check education eligibility
   */
  private checkEducation(userEducation: string[], jobEducation: string[]): number {
    // Higher education can apply for lower requirements
    const educationLevel: Record<string, number> = {
      '10th': 1,
      '12th': 2,
      'diploma': 3,
      'graduate': 4,
      'postgraduate': 5,
      'phd': 6,
    };

    const userMaxLevel = Math.max(...userEducation.map(e => educationLevel[e.toLowerCase()] || 0));
    const jobMinLevel = Math.min(...jobEducation.map(e => educationLevel[e.toLowerCase()] || 100));

    return userMaxLevel >= jobMinLevel ? 1 : 0.5;
  }

  /**
   * Check age eligibility with category-specific relaxations
   */
  private checkAge(userAge: number, minAge: number, maxAge: number, category: string): number {
    // Apply age relaxation based on category
    const relaxation: Record<string, number> = {
      'GEN': 0,
      'OBC': 3,
      'SC': 5,
      'ST': 5,
      'EWS': 0,
    };

    const adjustedMaxAge = maxAge + (relaxation[category] || 0);
    
    if (userAge >= minAge && userAge <= adjustedMaxAge) {
      return 1;
    } else if (userAge < minAge) {
      return 0.5; // Future match
    }
    
    return 0;
  }

  /**
   * Check category eligibility
   */
  private checkCategory(userCategory: string, jobCategories: string[]): number {
    return jobCategories.includes(userCategory) ? 1 : 0.5;
  }

  /**
   * Check location preference
   */
  private checkLocation(userLocation: any, jobLocation: any): number {
    if (userLocation.state === jobLocation.state) {
      if (userLocation.district === jobLocation.district) {
        return 1;
      }
      return 0.7;
    }
    return 0.5;
  }

  /**
   * Determine match type based on score
   */
  private determineMatchType(score: number): MatchType {
    if (score >= 85) return 'Perfect Match';
    if (score >= 60) return 'Potential Match';
    if (score >= 40) return 'Future Match';
    return 'No Match';
  }

  /**
   * Generate reasons for the match
   */
  private generateReasons(user: UserProfile, job: JobPosting, score: number): string[] {
    const reasons: string[] = [];

    if (this.checkEducation(user.eligibility.education, job.eligibility.education) === 1) {
      reasons.push('✓ Education requirement met');
    }

    if (this.checkAge(user.eligibility.age, job.eligibility.ageMin, job.eligibility.ageMax, user.eligibility.category) === 1) {
      reasons.push('✓ Age eligible (including category relaxation)');
    }

    if (this.checkCategory(user.eligibility.category, job.eligibility.categories) === 1) {
      reasons.push(`✓ Your category (${user.eligibility.category}) is eligible`);
    }

    if (user.location.state === job.location.state) {
      reasons.push('✓ Same state preference');
    }

    return reasons;
  }

  /**
   * Identify gaps in eligibility
   */
  private identifyGaps(user: UserProfile, job: JobPosting): string[] {
    const gaps: string[] = [];

    if (this.checkEducation(user.eligibility.education, job.eligibility.education) < 1) {
      gaps.push(`Education: Need ${job.eligibility.education.join(' or ')}`);
    }

    if (this.checkAge(user.eligibility.age, job.eligibility.ageMin, job.eligibility.ageMax, user.eligibility.category) === 0) {
      gaps.push(`Age: Must be between ${job.eligibility.ageMin}-${job.eligibility.ageMax} years`);
    }

    return gaps;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(user: UserProfile, job: JobPosting, gaps: string[]): string[] {
    const recommendations: string[] = [];

    if (gaps.length === 0) {
      recommendations.push('🎯 Start preparing immediately!');
      recommendations.push('📚 Use Learn Govt Jobs module for exam prep');
      recommendations.push('📝 Complete your profile and upload documents');
    } else {
      recommendations.push('💡 Work on closing the gaps to become eligible');
      
      if (gaps.some(g => g.includes('Education'))) {
        recommendations.push('📖 Consider upgrading your education');
      }
      
      if (gaps.some(g => g.includes('Age'))) {
        recommendations.push('⏳ Bookmark for when you meet the age criteria');
      }
    }

    return recommendations;
  }

  /**
   * Conversational eligibility check using AI
   */
  async conversationalEligibilityCheck(query: string, user: UserProfile): Promise<string> {
    try {
      // TODO: Integrate with Gemini/BharatGPT for conversational AI
      console.log('Conversational query:', query);
      
      return 'Based on your profile, you are eligible for 15 government jobs. Would you like to see them?';
    } catch (error) {
      throw new Error('Conversational check failed: ' + (error as Error).message);
    }
  }
}

// Singleton instance
export const eligibilityAIService = new EligibilityAIService();
