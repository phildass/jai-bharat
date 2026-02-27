/**
 * VoiceSessionService
 * Manages voice session lifecycle with the backend.
 * State machine: idle → starting → active → executing → idle
 */

import axios from 'axios';
import AppConfig from '../../../config/app.config';

export type VoiceSessionState = 'idle' | 'starting' | 'active' | 'executing' | 'error';

export interface VoiceCommand {
  transcript: string;
  language: string;
  confidence: number;
}

export interface VoiceCommandResult {
  intent: string;
  response: string;
  ttsText: string;
}

export class VoiceSessionService {
  private state: VoiceSessionState = 'idle';
  private sessionId: string | null = null;
  private sessionExpiresAt: Date | null = null;
  private stateListeners: Array<(state: VoiceSessionState) => void> = [];

  private setState(next: VoiceSessionState): void {
    this.state = next;
    this.stateListeners.forEach(l => l(next));
  }

  /**
   * Start a new voice session
   */
  async startSession(accessToken: string): Promise<string> {
    this.setState('starting');
    try {
      const response = await axios.post(
        `${AppConfig.api.baseUrl}/api/voice/session/start`,
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      this.sessionId = response.data.sessionId;
      this.sessionExpiresAt = response.data.expiresAt
        ? new Date(response.data.expiresAt)
        : new Date(Date.now() + 30 * 60 * 1000); // default 30 min
      this.setState('active');
      return this.sessionId!;
    } catch (error) {
      this.setState('error');
      throw new Error('Failed to start voice session: ' + (error as Error).message);
    }
  }

  /**
   * Execute a voice command within session
   */
  async executeCommand(command: VoiceCommand, accessToken: string): Promise<VoiceCommandResult> {
    if (!this.isSessionValid()) {
      return {
        intent: 'error',
        response: 'Session expired. Please try again.',
        ttsText: 'Session expired. Please try again.',
      };
    }

    this.setState('executing');
    try {
      const response = await axios.post(
        `${AppConfig.api.baseUrl}/api/voice/command`,
        { sessionId: this.sessionId, ...command },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      this.setState('active');
      return response.data as VoiceCommandResult;
    } catch (error: any) {
      this.setState('error');
      const message =
        error.response?.data?.message ||
        "Sorry, I couldn't process that. Please try again.";
      return {
        intent: 'error',
        response: message,
        ttsText: message,
      };
    }
  }

  /**
   * End the current session
   */
  endSession(): void {
    this.sessionId = null;
    this.sessionExpiresAt = null;
    this.setState('idle');
  }

  /**
   * Check if session is valid (not expired)
   */
  isSessionValid(): boolean {
    if (!this.sessionId || !this.sessionExpiresAt) return false;
    return this.sessionExpiresAt > new Date();
  }

  /**
   * Get current state
   */
  getState(): VoiceSessionState {
    return this.state;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: VoiceSessionState) => void): () => void {
    this.stateListeners.push(listener);
    return () => {
      this.stateListeners = this.stateListeners.filter(l => l !== listener);
    };
  }
}

export const voiceSessionService = new VoiceSessionService();
