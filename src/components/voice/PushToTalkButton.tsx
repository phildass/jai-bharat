import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import { pushToTalkService } from '../../services/voice/PushToTalkService';
import {
  voiceSessionService,
  VoiceCommandResult,
} from '../../services/voice/VoiceSessionService';

interface PushToTalkButtonProps {
  language?: string;
  accessToken: string;
  onTranscript?: (text: string) => void;
  onCommand?: (result: VoiceCommandResult) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}

export function PushToTalkButton({
  language = 'hi-IN',
  accessToken,
  onTranscript,
  onCommand,
  onError,
  disabled = false,
}: PushToTalkButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [partialText, setPartialText] = useState('');
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef<Animated.CompositeAnimation | null>(null);
  const lastTranscript = useRef('');
  const lastConfidence = useRef(1.0);

  useEffect(() => {
    return () => {
      pushToTalkService.destroy();
    };
  }, []);

  const startPulse = () => {
    pulseAnim.current = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.2, duration: 400, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1.0, duration: 400, useNativeDriver: true }),
      ]),
    );
    pulseAnim.current.start();
  };

  const stopPulse = () => {
    pulseAnim.current?.stop();
    Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
  };

  const ensureSession = async () => {
    if (!voiceSessionService.isSessionValid()) {
      await voiceSessionService.startSession(accessToken);
    }
  };

  const handlePressIn = async () => {
    if (disabled || isProcessing) return;
    try {
      await ensureSession();
      setPartialText('');
      setIsRecording(true);
      startPulse();

      await pushToTalkService.startRecording({
        language,
        onPartialResult: (text) => {
          setPartialText(text);
          onTranscript?.(text);
        },
        onFinalResult: (text, confidence) => {
          lastTranscript.current = text;
          lastConfidence.current = confidence;
          setPartialText(text);
        },
        onError: (message) => {
          setIsRecording(false);
          setIsProcessing(false);
          stopPulse();
          onError?.(message);
        },
      });
    } catch (error) {
      setIsRecording(false);
      stopPulse();
      onError?.("Sorry, I couldn't start listening. Please try again.");
    }
  };

  const handlePressOut = async () => {
    if (!isRecording) return;
    setIsRecording(false);
    stopPulse();

    try {
      await pushToTalkService.stopRecording();

      const transcript = lastTranscript.current;
      if (!transcript) {
        setIsProcessing(false);
        return;
      }

      setIsProcessing(true);
      const result = await voiceSessionService.executeCommand(
        { transcript, language, confidence: lastConfidence.current },
        accessToken,
      );
      setIsProcessing(false);
      setPartialText('');
      lastTranscript.current = '';
      onCommand?.(result);
    } catch {
      setIsProcessing(false);
      onError?.("Sorry, something went wrong. Please try again.");
    }
  };

  const buttonStyle = isRecording ? styles.buttonRecording : styles.button;
  const statusText = isProcessing
    ? 'Processing...'
    : isRecording
    ? 'Listening...'
    : 'Hold to Speak';

  return (
    <View style={styles.container}>
      {!!partialText && <Text style={styles.partialText}>{partialText}</Text>}
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={buttonStyle}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.8}
          disabled={disabled || isProcessing}
        >
          <Text style={styles.icon}>🎤</Text>
          <Text style={styles.label}>{statusText}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#4F46E5',
    borderRadius: 50,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 160,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonRecording: {
    backgroundColor: '#DC2626',
    borderRadius: 50,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 160,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  icon: {
    fontSize: 24,
    marginBottom: 4,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  partialText: {
    color: '#374151',
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 280,
    fontStyle: 'italic',
    paddingHorizontal: 16,
  },
});
