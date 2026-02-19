# Voice Integration Guide

## Overview

Jai Bharat integrates voice capabilities using Bhashini API for inclusive "Village First" technology. This guide covers voice-to-text, text-to-speech, and voice-based job search.

## Bhashini API

Bhashini is India's national language translation platform supporting 22 scheduled languages.

### Supported Languages

```typescript
const supportedLanguages = [
  'hi',  // Hindi
  'en',  // English
  'mr',  // Marathi
  'bn',  // Bengali
  'ta',  // Tamil
  'te',  // Telugu
  'gu',  // Gujarati
  'kn',  // Kannada
  'ml',  // Malayalam
  'or',  // Odia
  'pa',  // Punjabi
  'as',  // Assamese
  'ur',  // Urdu
];
```

## Setup

### 1. Get Bhashini API Credentials

1. Register at https://bhashini.gov.in
2. Create an application
3. Get API key and User ID
4. Add to environment variables:

```bash
BHASHINI_API_KEY=your-api-key
BHASHINI_USER_ID=your-user-id
BHASHINI_BASE_URL=https://api.bhashini.gov.in
```

### 2. Install Dependencies

```bash
npm install react-native-voice
npm install @react-native-community/audio-toolkit
npm install react-native-fs
```

### 3. Platform-Specific Setup

#### Android

Add permissions to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
```

#### iOS

Add to `ios/JaiBharat/Info.plist`:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>We need access to your microphone for voice search</string>
<key>NSSpeechRecognitionUsageDescription</key>
<string>We need speech recognition for voice commands</string>
```

## Implementation

### Voice Service

The `VoiceService` handles all voice operations:

```typescript
import { voiceService } from './src/services/voice/VoiceService';

// Start listening
await voiceService.startListening('hi');

// Stop and get result
const result = await voiceService.stopListening();
console.log('Transcribed text:', result.text);

// Voice to job search
const jobs = await voiceService.voiceToJobSearch(audioBlob, 'hi');
```

### Voice-to-Text Flow

```
User speaks in Hindi
       ↓
React Native Voice captures audio
       ↓
Send audio to Bhashini API
       ↓
Bhashini returns Hindi text
       ↓
Display in app
```

### Text-to-Speech Flow

```
App has text to speak
       ↓
Send to Bhashini API
       ↓
Bhashini returns audio URL
       ↓
Play audio using native player
```

### Voice-to-Job Search Flow

```
User: "मुझे करद तालुका में 12वीं पास के लिए वर्दी वाली नौकरियां चाहिए"
       ↓
Voice to Text (Hindi)
       ↓
Translate to English (if needed)
       ↓
Parse intent using NLP:
  - Location: Karad Taluk
  - Education: 12th pass
  - Type: Uniform jobs (Police, Military, etc.)
       ↓
Search jobs database
       ↓
Return results in Hindi
       ↓
Text-to-Speech for response
```

## Usage Examples

### Example 1: Voice Search Button

```typescript
import React, { useState } from 'react';
import { View, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { voiceService } from '../services/voice/VoiceService';

const VoiceSearchButton = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const handleVoiceSearch = async () => {
    try {
      setIsListening(true);
      await voiceService.startListening('hi');
      
      // Automatically stop after 10 seconds or when user stops speaking
      setTimeout(async () => {
        const result = await voiceService.stopListening();
        setTranscript(result.text);
        setIsListening(false);
        
        // Perform search
        const jobs = await searchJobsByVoice(result.text);
        // Display jobs
      }, 10000);
    } catch (error) {
      console.error('Voice search error:', error);
      setIsListening(false);
    }
  };

  return (
    <View>
      <TouchableOpacity onPress={handleVoiceSearch}>
        {isListening ? (
          <ActivityIndicator />
        ) : (
          <Text>🎤 Voice Search</Text>
        )}
      </TouchableOpacity>
      {transcript && <Text>You said: {transcript}</Text>}
    </View>
  );
};
```

### Example 2: Voice-Activated Navigation

```typescript
import React, { useEffect } from 'react';
import { voiceService } from '../services/voice/VoiceService';
import { useNavigation } from '@react-navigation/native';

const VoiceNavigation = () => {
  const navigation = useNavigation();

  useEffect(() => {
    const setupVoiceNavigation = async () => {
      await voiceService.startListening('hi');
      
      const result = await voiceService.stopListening();
      const intent = parseNavigationIntent(result.text);
      
      if (intent.action === 'open') {
        if (intent.target === 'jobs') {
          navigation.navigate('Jobs');
        } else if (intent.target === 'profile') {
          navigation.navigate('Profile');
        }
      }
    };

    setupVoiceNavigation();
  }, []);

  return null;
};

const parseNavigationIntent = (text: string) => {
  // Simple intent parsing
  if (text.includes('नौकरी') || text.includes('job')) {
    return { action: 'open', target: 'jobs' };
  }
  if (text.includes('प्रोफाइल') || text.includes('profile')) {
    return { action: 'open', target: 'profile' };
  }
  return { action: 'unknown', target: null };
};
```

### Example 3: Multi-Language Support

```typescript
import React, { useState } from 'react';
import { View, Picker, TouchableOpacity, Text } from 'react-native';
import { voiceService } from '../services/voice/VoiceService';

const MultiLanguageVoiceSearch = () => {
  const [language, setLanguage] = useState('hi');
  const languages = voiceService.getSupportedLanguages();

  const handleSearch = async () => {
    await voiceService.startListening(language);
    const result = await voiceService.stopListening();
    
    // Search in selected language
    const jobs = await voiceService.voiceToJobSearch(result.audio, language);
  };

  return (
    <View>
      <Picker
        selectedValue={language}
        onValueChange={setLanguage}
      >
        {languages.map(lang => (
          <Picker.Item key={lang} label={lang} value={lang} />
        ))}
      </Picker>
      <TouchableOpacity onPress={handleSearch}>
        <Text>🎤 Search in {language}</Text>
      </TouchableOpacity>
    </View>
  );
};
```

### Example 4: Voice Feedback

```typescript
import React from 'react';
import { voiceService } from '../services/voice/VoiceService';

const VoiceFeedback = async (message: string, language: string = 'hi') => {
  try {
    // Convert text to speech
    const response = await voiceService.textToVoice(message, language);
    
    // Play audio
    const audio = new Audio(response.audioUrl);
    await audio.play();
  } catch (error) {
    console.error('Voice feedback error:', error);
  }
};

// Usage
await VoiceFeedback('आपके लिए 15 नौकरियां मिलीं', 'hi');
// "15 jobs found for you" in Hindi
```

## NLP Intent Parsing

### Job Search Intent

Parse natural language queries to extract search parameters:

```typescript
interface JobSearchIntent {
  location?: {
    state?: string;
    district?: string;
    taluk?: string;
  };
  education?: string[];
  jobType?: string[];
  salary?: {
    min?: number;
    max?: number;
  };
  category?: string;
}

const parseJobIntent = (text: string): JobSearchIntent => {
  const intent: JobSearchIntent = {};
  
  // Location extraction
  const locationPatterns = {
    'करद|karad': { district: 'Satara', taluk: 'Karad' },
    'सतारा|satara': { district: 'Satara' },
    'महाराष्ट्र|maharashtra': { state: 'Maharashtra' },
  };
  
  // Education extraction
  const educationPatterns = {
    '10वीं|10th|दसवीं': '10th',
    '12वीं|12th|बारहवीं': '12th',
    'स्नातक|graduate|graduation': 'graduate',
  };
  
  // Job type extraction
  const jobTypePatterns = {
    'वर्दी|uniform|police|पुलिस': 'uniform',
    'रेलवे|railway': 'railway',
    'बैंक|bank|banking': 'banking',
    'शिक्षक|teacher|teaching': 'teaching',
  };
  
  // Apply pattern matching
  // ... implementation
  
  return intent;
};
```

## Bhashini API Integration

### API Endpoints

#### 1. Speech-to-Text (ASR)

```typescript
const speechToText = async (audioBlob: Blob, language: string) => {
  const formData = new FormData();
  formData.append('audio', audioBlob);
  formData.append('sourceLanguage', language);
  
  const response = await fetch(`${BHASHINI_BASE_URL}/asr`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${BHASHINI_API_KEY}`,
      'User-ID': BHASHINI_USER_ID,
    },
    body: formData,
  });
  
  const result = await response.json();
  return {
    text: result.transcript,
    confidence: result.confidence,
    language: language,
  };
};
```

#### 2. Text-to-Speech (TTS)

```typescript
const textToSpeech = async (text: string, language: string) => {
  const response = await fetch(`${BHASHINI_BASE_URL}/tts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${BHASHINI_API_KEY}`,
      'User-ID': BHASHINI_USER_ID,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      targetLanguage: language,
      gender: 'female', // or 'male'
      samplingRate: 22050,
    }),
  });
  
  const result = await response.json();
  return {
    audioUrl: result.audioContent,
    duration: result.duration,
  };
};
```

#### 3. Translation

```typescript
const translate = async (text: string, fromLang: string, toLang: string) => {
  const response = await fetch(`${BHASHINI_BASE_URL}/translate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${BHASHINI_API_KEY}`,
      'User-ID': BHASHINI_USER_ID,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      sourceLanguage: fromLang,
      targetLanguage: toLang,
    }),
  });
  
  const result = await response.json();
  return result.translatedText;
};
```

## Error Handling

```typescript
const handleVoiceError = (error: any) => {
  if (error.code === 'PERMISSION_DENIED') {
    // Request microphone permission
    Alert.alert(
      'Microphone Permission',
      'Please allow microphone access for voice search',
      [{ text: 'OK', onPress: () => requestMicrophonePermission() }]
    );
  } else if (error.code === 'NETWORK_ERROR') {
    Alert.alert('Network Error', 'Please check your internet connection');
  } else if (error.code === 'LANGUAGE_NOT_SUPPORTED') {
    Alert.alert('Language Not Supported', 'Please select another language');
  } else {
    Alert.alert('Voice Error', 'Something went wrong. Please try again.');
  }
};
```

## Testing

### Test Voice Recognition

```typescript
import { voiceService } from '../services/voice/VoiceService';

describe('VoiceService', () => {
  it('should transcribe Hindi audio', async () => {
    const audioBlob = loadTestAudio('hindi_sample.wav');
    const result = await voiceService.voiceToText(audioBlob, 'hi');
    
    expect(result.language).toBe('hi');
    expect(result.confidence).toBeGreaterThan(0.8);
  });
  
  it('should translate Hindi to English', async () => {
    const translated = await voiceService.translateText(
      'नमस्ते',
      'hi',
      'en'
    );
    expect(translated.toLowerCase()).toContain('hello');
  });
});
```

## Performance Optimization

### 1. Audio Compression

```typescript
import { compress } from 'react-native-audio-compressor';

const compressAudio = async (audioUri: string) => {
  const compressed = await compress(audioUri, {
    quality: 'medium',
    bitrate: 32000, // 32kbps
    sampleRate: 16000, // 16kHz
  });
  return compressed;
};
```

### 2. Caching Translations

```typescript
const translationCache = new Map<string, string>();

const translateWithCache = async (text: string, from: string, to: string) => {
  const key = `${from}-${to}-${text}`;
  
  if (translationCache.has(key)) {
    return translationCache.get(key)!;
  }
  
  const translated = await translate(text, from, to);
  translationCache.set(key, translated);
  return translated;
};
```

### 3. Debounce Voice Input

```typescript
import { debounce } from 'lodash';

const debouncedVoiceSearch = debounce(async (query: string) => {
  const jobs = await searchJobs(query);
  // Update UI
}, 500);
```

## Accessibility

Voice features make the app accessible to:
- **Illiterate users**: Voice-based navigation
- **Visually impaired**: Screen reader integration
- **Rural users**: Local language support
- **Elderly users**: Simplified voice commands

## Best Practices

1. **Always ask for permission** before accessing microphone
2. **Provide visual feedback** when listening (animation, icon)
3. **Support fallback** to text input if voice fails
4. **Test with real users** in different languages
5. **Handle network failures** gracefully
6. **Cache common phrases** for offline support
7. **Respect user privacy** - don't store voice recordings

## Troubleshooting

### Common Issues

**Issue**: Voice recognition not working
**Solution**: Check microphone permissions, network connection

**Issue**: Low accuracy in noisy environments
**Solution**: Implement noise cancellation, suggest quiet environment

**Issue**: Language detection fails
**Solution**: Let user explicitly select language

**Issue**: API timeout
**Solution**: Implement retry logic with exponential backoff

## Future Enhancements

- [ ] Offline voice recognition
- [ ] Custom vocabulary for government job terms
- [ ] Voice-based form filling
- [ ] Multi-turn conversational AI
- [ ] Emotion detection in voice

## Support

For voice integration issues:
- Email: voice@jaibharat.cloud
- Bhashini Support: https://bhashini.gov.in/support

---

**Last Updated**: February 2026
**Version**: 1.0
