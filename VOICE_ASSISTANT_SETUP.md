# Voice AI Assistant Setup Guide

Your childminder app now includes a Voice AI Assistant powered by OpenAI! This guide will help you set it up.

## Features

The Voice AI Assistant allows you to:
- **Add children**: "Add a new child named Emma"
- **Check in children**: "Check in Sarah" or "Mark John as arrived"
- **Check out children**: "Check out Emma" or "Sarah is leaving"
- **Mark absent**: "Mark Ted as absent today"
- **List children**: "Who do I have registered?" or "List all children"

## Prerequisites

You need an [OpenAI API account](https://platform.openai.com) to use the voice assistant.

## Setup Steps

### 1. Get Your OpenAI API Key

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up or log in to your account
3. Navigate to "API Keys" in the dashboard
4. Click "Create new secret key"
5. Give it a name (e.g., "Childminder Voice Assistant")
6. Copy the API key (you'll only see it once!)

### 2. Add API Key to Environment Variables

Open your `.env.local` file and add:

```env
OPENAI_API_KEY=sk-...your_key_here
```

### 3. Restart Your Development Server

The server needs to reload to pick up the new environment variable:

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

## How to Use

### Starting the Assistant

1. Look for the **floating microphone button** in the bottom-right corner of the app
2. Click the button to start listening
3. Speak your command clearly
4. The button will pulse red while listening
5. Wait for the AI to process your request

### Visual Feedback

- **Blue button**: Ready to listen
- **Red pulsing button**: Actively listening to your voice
- **Orange/Yellow button**: Processing your command
- **Green check**: Command successful
- **Red X**: Error occurred

### Example Commands

#### Adding Children
- "Add a new child named Emma with a rate of 10 pounds per hour"
- "Register Tom"
- "Add Sarah"

#### Checking In/Out
- "Check in Emma"
- "Mark Sarah as arrived"
- "Check out Tom"
- "John is leaving now"

#### Marking Absent
- "Mark Emma as absent"
- "Sarah won't be here today"
- "Tom is absent"

#### Getting Information
- "List all children"
- "Who do I have registered?"
- "Show me my children"

### Toast Notifications

After each command, you'll see a toast notification showing:
- What you said (transcript)
- The AI's response
- Success or error status

## Browser Compatibility

The Voice Assistant uses the Web Speech API, which is supported in:
- ✅ Chrome/Chromium (recommended)
- ✅ Microsoft Edge
- ✅ Safari (macOS/iOS)
- ❌ Firefox (limited support)

**Note:** For the best experience, use Chrome or Edge.

## Troubleshooting

### "Speech recognition is not supported"
- You're using an unsupported browser (likely Firefox)
- Solution: Switch to Chrome or Edge

### Microphone permission denied
- Your browser blocked microphone access
- Solution: Click the lock icon in the address bar → Allow microphone

### "I couldn't hear you"
- Microphone not working or too quiet
- Background noise interfering
- Solution: Check microphone settings, speak clearly and loudly

### AI not responding correctly
- Check that your OpenAI API key is correct
- Ensure you have credits in your OpenAI account
- Check the browser console for errors

### Commands not executing
- The AI might not understand the intent
- Try rephrasing: "Check in Sarah" instead of "Sarah arrived"
- Be specific with names

## Cost Information

The Voice Assistant uses **OpenAI GPT-4o-mini**, which is very cost-effective:

- ~$0.00015 per request (0.015 cents)
- 100 voice commands ≈ $0.015 (less than 2 cents)
- 1,000 voice commands ≈ $0.15 (15 cents)

The free OpenAI tier includes $5 credit, which is enough for ~33,000 commands!

## Privacy & Security

- Voice is processed **locally** in your browser (Web Speech API)
- Only the text transcript is sent to OpenAI
- Audio is **never** uploaded to any server
- All data stays in your browser's localStorage

## Advanced Usage

### Multiple Commands

You can give compound commands:
- "Add Emma and check her in"
- "Mark Sarah as absent and list all children"

### Natural Language

The AI understands natural language:
- "Can you add a kid named Tom?"
- "I need to check in Sarah please"
- "Emma's not coming today"

## Keyboard Shortcut (Optional)

You can add a keyboard shortcut to trigger the voice assistant. Ask the developer to implement this feature!

## Disabling the Voice Assistant

If you want to remove the voice assistant:

1. Open `app/layout.js`
2. Remove or comment out: `<VoiceAssistant />`
3. Save the file

## Support

For issues with:
- **OpenAI API**: Check [platform.openai.com/docs](https://platform.openai.com/docs)
- **This app**: Open an issue on GitHub

---

**Tip:** The first request might take 2-3 seconds as the AI model loads. Subsequent requests are much faster!
