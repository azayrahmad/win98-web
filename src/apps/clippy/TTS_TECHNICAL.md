# Clippy Text-to-Speech (TTS) Integration

This document describes the TTS functionality added to the Clippy.js library, allowing agents to speak with actual synthesized voice that synchronizes with the visual word streaming.

## Overview

The TTS integration uses the Web Speech API (`speechSynthesis`) to provide voice synthesis that works in harmony with Clippy's existing text balloon system. When TTS is enabled, speech audio is synchronized with the visual display of words, creating a more immersive experience.

## Features

- **Synchronized Speech**: TTS audio plays in sync with visual word display
- **Voice Selection**: Choose from available system voices
- **Configurable Parameters**: Adjust rate, pitch, and volume
- **Fallback Support**: Gracefully falls back to visual-only speech when TTS is unavailable
- **Backward Compatibility**: All existing methods work unchanged

## Browser Support

TTS functionality requires browsers that support the Web Speech API:
- ✅ Chrome/Chromium (full support)
- ✅ Edge (full support)
- ✅ Safari (partial support)
- ❌ Firefox (limited/no support)
- ❌ IE (no support)

## Basic Usage

### Simple TTS Speech

```javascript
// Load a Clippy agent
clippy.load('Clippy', function(agent) {
    // Speak with TTS
    agent.speakWithTTS("Hello, I can now speak with voice!", {
        ttsOptions: {
            rate: 1.0,
            pitch: 1.0,
            volume: 1.0
        },
        callback: function() {
            console.log("Speech completed");
        }
    });
});
```

### TTS with Animation

```javascript
agent.speakAndAnimate("Watch me speak and animate!", "Explain", {
    useTTS: true,
    ttsOptions: {
        voice: voiceObject, // From getTTSVoices()
        rate: 0.8,
        pitch: 1.2
    }
});
```

### Emotional Speech with TTS

```javascript
agent.speakWithEmotion("I'm so excited!", "excited", {
    useTTS: true,
    ttsOptions: { rate: 1.2, pitch: 1.3 }
});
```

## TTS Configuration Options

### Voice Selection

```javascript
// Get available voices
var voices = agent.getTTSVoices();

// Set a specific voice
agent.setTTSOptions({
    voice: voices.find(v => v.name.includes('Female'))
});
```

### Speech Parameters

- **rate**: Speech speed (0.1 to 10, default: 1.0)
- **pitch**: Voice pitch (0 to 2, default: 1.0)
- **volume**: Speech volume (0 to 1, default: 1.0)

```javascript
agent.setTTSOptions({
    rate: 0.7,    // Slower speech
    pitch: 1.5,   // Higher pitch
    volume: 0.8   // Slightly quieter
});
```

## API Methods

### New TTS Methods

- `agent.speakWithTTS(text, options)` - Speak with TTS and visual word streaming
- `agent.setTTSOptions(options)` - Configure TTS settings
- `agent.getTTSVoices()` - Get available voices
- `agent.isTTSEnabled()` - Check if TTS is supported
- `agent.stopTTS()` - Stop current TTS speech

### Enhanced Existing Methods

All speech methods now support TTS:

- `agent.speak(text, hold, useTTS)` - Added optional useTTS parameter
- `agent.speakAndAnimate(text, animation, options)` - Added useTTS option
- `agent.speakWithRepeatingAnimation(text, animation, options)` - Added useTTS option
- `agent.speakWithIdleAnimation(text, options)` - Added useTTS option
- `agent.speakWithEmotion(text, emotion, options)` - Added useTTS option

## Technical Details

### Synchronization Mechanism

The TTS integration works by:

1. Starting TTS speech synthesis
2. Listening to `onboundary` events for word boundaries
3. Updating the visual text display to match TTS progress
4. Providing fallback to timed word streaming if TTS boundaries aren't available

### Word Streaming

- **With TTS**: Visual words appear as TTS speaks them (natural timing)
- **Without TTS**: Words appear at fixed 320ms intervals
- **Fallback**: If TTS fails to provide word boundaries, falls back to fixed timing

### Error Handling

- Automatic fallback to visual-only speech if TTS fails
- Console warnings for unsupported features
- Graceful degradation in older browsers

## Testing

Use the included `tts_test.html` file to test TTS functionality:

```bash
# Open the test page in a supported browser
open tts_test.html
```

The test page provides:
- TTS support detection
- Voice selection interface
- Parameter adjustment sliders
- Various test scenarios
- Fallback testing

## Limitations

- TTS availability depends on browser and system
- Voice quality varies by platform
- Word boundary detection may not be perfect in all browsers
- Some browsers don't provide word-level synchronization events
- Mobile browser support may be limited

## Examples

See the test file for comprehensive examples of all TTS features.
