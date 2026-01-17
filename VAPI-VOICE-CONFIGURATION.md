# 🎙️ Vapi Voice Configuration - How It Works

## 🎯 Current Voice Setup

### **Voice Provider:** ElevenLabs (11labs)
### **Voice ID:** `21m00Tcm4TlvDq8ikWAM`

This is **Rachel** from ElevenLabs - a natural, warm, confident female voice.

---

## 🔍 How It's Configured

Your code in `lib/vapi.ts` sets up the voice like this:

```typescript
voice: {
  provider: "11labs",
  voiceId: process.env.VAPI_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"
}
```

**What this means:**
1. ✅ Uses **ElevenLabs** as the voice provider (high-quality AI voices)
2. ✅ Uses voice ID `21m00Tcm4TlvDq8ikWAM` (Rachel - default ElevenLabs voice)
3. ✅ You set `VAPI_VOICE_ID=21m00Tcm4TlvDq8ikWAM` in Vercel
4. ✅ Every call will use **THE SAME VOICE** - not random!

---

## 🎤 About the Voice: Rachel (21m00Tcm4TlvDq8ikWAM)

**Characteristics:**
- **Gender:** Female
- **Tone:** Warm, friendly, confident
- **Accent:** American English
- **Quality:** Very natural-sounding
- **Use Case:** Perfect for motivational/coaching calls

**Why Rachel is a good choice:**
- Sounds encouraging and supportive ✅
- Clear and easy to understand ✅
- Natural conversation flow ✅
- Professional but approachable ✅

---

## 🎛️ Call Configuration

### **Complete Settings:**

| Setting | Value | Purpose |
|---------|-------|---------|
| **Provider** | ElevenLabs | High-quality AI voice synthesis |
| **Voice ID** | 21m00Tcm4TlvDq8ikWAM | Rachel (consistent voice) |
| **AI Model** | GPT-4 Turbo | Intelligent conversation |
| **Temperature** | 0.8 | Creative but coherent responses |
| **Max Duration** | 60s (welcome), 240s (daily) | Call length limits |
| **Silence Timeout** | 8 seconds | Ends call after silence |
| **Recording** | Enabled | Saves calls for quality/legal |

---

## 🔄 What Happens on Each Call

### **1. Call Initiated:**
- Vapi dials the customer's phone number
- Uses Rachel's voice (21m00Tcm4TlvDq8ikWAM)
- Speaks the first message

### **2. First Message:**

**Welcome Call (after payment):**
```
"Hey [CustomerName]! Welcome to your daily confidence calls. 
Starting tomorrow, I'll call you every day to give you a quick 
confidence boost. These calls are short - just 2-3 minutes. 
I'll pump you up, then you're off to crush your day. 
See you tomorrow!"
```

**Daily Call:**
```
"Hey [CustomerName]! It's your confidence call. 
How are you doing today?"
```

### **3. Conversation:**
- GPT-4 generates responses based on system prompt
- Rachel's voice speaks the responses
- Adapts to customer's answers
- Personalizes based on their goals/insecurities

### **4. Call Ends:**
- After 2-3 minutes (or 8 seconds of silence)
- Natural closing phrase
- Call recording saved

---

## 🎨 Want a Different Voice?

You can change the voice! Here are your options:

### **Option 1: Use Another ElevenLabs Voice**

**Popular ElevenLabs Voices:**

| Voice ID | Name | Description |
|----------|------|-------------|
| `21m00Tcm4TlvDq8ikWAM` | Rachel | Warm female (current) |
| `pNInz6obpgDQGcFmaJgB` | Adam | Clear male voice |
| `EXAVITQu4vr4xnSDxMaL` | Bella | Young, energetic female |
| `ErXwobaYiN019PkySvjV` | Antoni | Smooth male voice |
| `MF3mGyEYCl7XYWbV9V6O` | Elli | Professional female |
| `TxGEqnHWrfWFTfGW9XjX` | Josh | Confident male voice |
| `VR6AewLTigWG4xSOukaG` | Arnold | Deep male voice |
| `pqHfZKP75CvOlQylNhV4` | Bill | Friendly male |

**How to change:**
1. Pick a voice ID from above
2. Update Vercel environment variable:
   ```env
   VAPI_VOICE_ID=pNInz6obpgDQGcFmaJgB
   ```
3. Redeploy your app
4. All new calls will use the new voice!

### **Option 2: Use Different Provider**

Vapi supports multiple voice providers:

**Available Providers:**
- **ElevenLabs** (current) - Most natural, best quality
- **PlayHT** - Good quality, more voice options
- **Rime** - Fast, efficient
- **Deepgram** - Good for real-time
- **Azure** - Microsoft's voices
- **Cartesia** - Expressive voices

**To switch provider:**
Edit `lib/vapi.ts`:
```typescript
voice: {
  provider: "playht", // or "rime", "azure", etc.
  voiceId: "your_new_voice_id"
}
```

---

## 🎯 Testing Different Voices

### **Quick Test:**

1. **Listen to ElevenLabs voices:**
   - Go to: https://elevenlabs.io/voice-library
   - Browse and listen to voices
   - Copy the voice ID you like

2. **Update in Vercel:**
   ```env
   VAPI_VOICE_ID=new_voice_id_here
   ```

3. **Redeploy**

4. **Test with a call**

### **Voice Selection Tips:**

**For Motivational Coaching:**
- ✅ Warm, encouraging tone
- ✅ Clear and confident
- ✅ Not too robotic or flat
- ✅ Matches your brand personality

**Consider:**
- **Gender:** Match your target audience preference
- **Accent:** Match your customer base
- **Energy:** High energy for motivation, calm for meditation
- **Age:** Younger for energetic, mature for professional

---

## 📊 Voice Quality Settings

Your current configuration:

```typescript
model: {
  provider: "openai",
  model: "gpt-4-turbo",      // Smart responses
  temperature: 0.8            // Creative but coherent
}
```

**Temperature Explained:**
- `0.0` = Very predictable, robotic
- `0.5` = Balanced
- `0.8` = Creative, natural (current) ✅
- `1.0` = Very creative, might ramble

**Your 0.8 setting is perfect for:**
- Natural conversation
- Personalized responses
- Adapting to user mood
- Still staying on track

---

## 🔧 Advanced Voice Customization

### **Voice Stability & Clarity:**

In ElevenLabs, you can control:
- **Stability:** How consistent the voice sounds (0-100%)
- **Clarity:** How clear/optimized for speech (0-100%)

**To customize (requires ElevenLabs API):**
```typescript
voice: {
  provider: "11labs",
  voiceId: "21m00Tcm4TlvDq8ikWAM",
  stability: 0.5,    // Default: 0.5 (balanced)
  similarity: 0.75   // Default: 0.75 (high similarity)
}
```

### **Speed Control:**

Control how fast Rachel speaks:
```typescript
voice: {
  provider: "11labs",
  voiceId: "21m00Tcm4TlvDq8ikWAM",
  speed: 1.0  // 0.5 = slow, 1.0 = normal, 1.5 = fast
}
```

---

## ✅ Current Voice Setup Summary

**What your customers hear:**
- 🎤 **Rachel's voice** (warm, confident female)
- 🧠 **GPT-4 intelligence** (smart conversations)
- ⚡ **ElevenLabs quality** (very natural)
- 🎯 **Personalized content** (based on their goals)
- ⏱️ **2-3 minute calls** (quick and impactful)

**Consistency:**
- ✅ Same voice every call (Rachel)
- ✅ Same personality/tone
- ✅ Builds familiarity with customer
- ✅ Professional brand experience

---

## 🎭 Personality Configuration

The voice personality is set in the **system prompt**:

**Current Personality Traits:**
- Warm and encouraging ✅
- Like a supportive friend ✅
- Confident but not pushy ✅
- Adapts to customer energy ✅

**Delusion Levels:**
- **Gentle:** "You can do this"
- **Medium:** "You're going to crush this"
- **Full:** "You're a beast! Nothing can stop you!"

Rachel's voice adapts her **energy and intensity** based on customer's chosen delusion level.

---

## 🔍 How to Verify Current Voice

### **Check Environment Variable:**
In Vercel:
1. Settings → Environment Variables
2. Look for: `VAPI_VOICE_ID`
3. Should be: `21m00Tcm4TlvDq8ikWAM`

### **Listen to Rachel:**
Preview the voice:
- Go to: https://elevenlabs.io/
- Search for voice ID: `21m00Tcm4TlvDq8ikWAM`
- Or just Google "ElevenLabs Rachel voice"

---

## 🎉 Bottom Line

**Your setup:**
- ✅ **NOT random** - uses the same voice every time
- ✅ **Rachel (21m00Tcm4TlvDq8ikWAM)** - warm, confident female
- ✅ **ElevenLabs quality** - sounds very human
- ✅ **Consistent branding** - customers recognize the voice
- ✅ **Professional** - perfect for motivational coaching

**To change the voice:**
1. Pick a new voice ID
2. Update `VAPI_VOICE_ID` in Vercel
3. Redeploy
4. That's it!

---

**Current Voice:** Rachel (21m00Tcm4TlvDq8ikWAM)  
**Quality:** Premium (ElevenLabs)  
**Randomness:** None - same voice every call ✅  
**Status:** ✅ Configured and ready
