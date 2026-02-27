/**
 * PushToTalkService
 * Manages push-to-talk recording lifecycle for voice commands.
 * Press-and-hold: start recording → release: stop + submit transcript.
 * Uses react-native-voice for on-device STT (Google STT on Android, iOS Speech on iOS).
 * Supports barge-in: can cancel TTS playback when user starts speaking.
 */

import Voice, {
  SpeechResultsEvent,
  SpeechPartialResultsEvent,
  SpeechErrorEvent,
} from 'react-native-voice';

export class PushToTalkService {
  private isRecording: boolean = false;
  private onPartialResult?: (text: string) => void;
  private onFinalResult?: (text: string, confidence: number) => void;
  private onError?: (error: string) => void;

  constructor() {
    Voice.onSpeechResults = this.handleSpeechResults;
    Voice.onSpeechPartialResults = this.handlePartialResults;
    Voice.onSpeechError = this.handleSpeechError;
  }

  private handleSpeechResults = (event: SpeechResultsEvent): void => {
    const results = event.value;
    if (results && results.length > 0 && this.onFinalResult) {
      // Use first result; confidence not provided by react-native-voice, default to high
      this.onFinalResult(results[0], 0.9);
    }
    this.isRecording = false;
  };

  private handlePartialResults = (event: SpeechPartialResultsEvent): void => {
    const results = event.value;
    if (results && results.length > 0 && this.onPartialResult) {
      this.onPartialResult(results[0]);
    }
  };

  private handleSpeechError = (event: SpeechErrorEvent): void => {
    this.isRecording = false;
    if (this.onError) {
      this.onError("Sorry, I couldn't hear that. Please try again.");
    }
  };

  /**
   * Start recording - called on button press-down
   */
  async startRecording(options: {
    language: string;
    onPartialResult?: (text: string) => void;
    onFinalResult: (text: string, confidence: number) => void;
    onError: (error: string) => void;
  }): Promise<void> {
    if (this.isRecording) return;

    this.onPartialResult = options.onPartialResult;
    this.onFinalResult = options.onFinalResult;
    this.onError = options.onError;

    try {
      await Voice.start(options.language);
      this.isRecording = true;
    } catch (error) {
      this.isRecording = false;
      options.onError("Sorry, I couldn't start listening. Please try again.");
    }
  }

  /**
   * Stop recording - called on button release
   */
  async stopRecording(): Promise<void> {
    if (!this.isRecording) return;
    try {
      await Voice.stop();
    } catch {
      this.isRecording = false;
    }
  }

  /**
   * Cancel recording without submitting
   */
  async cancelRecording(): Promise<void> {
    if (!this.isRecording) return;
    try {
      await Voice.cancel();
      this.isRecording = false;
    } catch {
      this.isRecording = false;
    }
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Clean up listeners - call on component unmount
   */
  async destroy(): Promise<void> {
    try {
      await Voice.destroy();
    } catch {
      // ignore
    }
  }
}

export const pushToTalkService = new PushToTalkService();
