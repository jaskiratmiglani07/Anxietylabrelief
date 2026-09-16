# Unburden — Digital Sanctuary & Cognitive De-escalation

> A private, minimalist mindfulness web application designed to help users gain psychological distance from acute worries, stress, and regrets through synchronized box-breathing, procedural soundscapes, and AI-powered cognitive reframing.

**Live Deployment:** [https://anxietylabrelief.vercel.app](https://anxietylabrelief.vercel.app)  
**Production Platform:** Vercel (Astro SSR Serverless)

---

## 1. Project Overview & Problem Statement

### The Problem
During episodes of acute situational anxiety or cognitive fixation (e.g., pre-interview panic, exam stress, relationship rumination), the human mind often falls into catastrophic thought loops. Traditional mental health applications frequently introduce friction:
- Requiring intrusive questionnaires, onboarding screens, and account sign-ups.
- Offering generic, toxic-positivity inspirational quotes disconnected from the user's specific worry.
- Operating as clinical diagnostic chatbots attempting to "fix" or debate the user's concern.

### The Solution: Unburden
Unburden is built on cognitive de-escalation principles:
1. **Frictionless Entry:** Anonymous, zero-account, single-input prompt (*"What is weighing on your mind right now?"*).
2. **Visual Dissolution:** The user's typed worry is placed at the center of the sanctuary and smoothly scales down from 100% to 8% size over 96 seconds until it dissolves into empty space.
3. **Structured 8-Stage Reframing:** Dynamically generates 8 progressive, grounded reflections using OpenRouter's Llama 3.3 70B model (validating the worry, reality-checking assumptions, de-escalating emotional intensity, and grounding in stillness).
4. **Synchronized 12s Box Breathing:** Visual SVG breath pacing (4s inhale, 2s hold, 4s exhale, 2s rest) synchronized with reflection advancement.
5. **Procedural Web Audio Soundscapes:** 100% in-browser procedural audio synthesis (rain, ocean, forest wind & birds, space drone, pentatonic piano) with real-time frequency dampening as the session deepens.
6. **Zero-Knowledge Privacy:** Client-side local journal persistence; no user worries are ever stored on a database.

---

## 2. System Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                      Client Browser                     │
│  React 19 Island (<MeditationApp client:only="react" />) │
│                                                         │
│  - Unified Clock (1-second tick interval)               │
│  - Framer Motion Scale & Opacity Animations             │
│  - Web Audio API Sound Synthesizer (audioSynth.ts)      │
│  - HTML5 Canvas 2D Parallax Starfield (690 stars)       │
│  - LocalStorage Journal ("mindfulness_journal")         │
└───────────────────────────┬─────────────────────────────┘
                            │
              1. POST /api/reflection
                 { "thought": "..." }
                            │
┌───────────────────────────▼─────────────────────────────┐
│               Astro SSR Serverless Function             │
│                   (Vercel Edge/Node)                    │
│                                                         │
│  - Reads process.env.OPENROUTER_API_KEY                 │
│  - Validates input (3 to 150 chars)                     │
│  - Injects Grounded System Prompt                       │
└───────────────────────────┬─────────────────────────────┘
                            │
              2. HTTPS REST (Authorization: Bearer)
                 model: meta-llama/llama-3.3-70b-instruct
                            │
┌───────────────────────────▼─────────────────────────────┐
│                     OpenRouter API                      │
│        (Unified Gateway → Llama 3.3 70B Instruct)       │
│                                                         │
│  - Returns JSON schema: { "quotes": [8 items] }         │
└───────────────────────────┬─────────────────────────────┘
                            │
              3. Response Validation & Fallback Handling
                            ▼
           If API Fails / Offline / Schema Mismatch:
           Procedural Rule-Based Fallback Generator
           (11 thematic categories, pronoun normalization)
```

---

## 3. Technology Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework** | [Astro](https://astro.build) | `^7.0.2` | Hybrid SSR framework with serverless adapter for Vercel |
| **Frontend UI** | [React](https://react.dev) | `^19.2.7` | Declarative UI island component architecture |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | `^5.x` | Strict type safety across frontend and API routes |
| **Styling** | [Tailwind CSS](https://tailwindcss.com) | `^4.3.1` | Modern utility styling via `@tailwindcss/vite` and CSS variables |
| **Animations** | [Framer Motion](https://www.framer.com/motion/) | `^12.41.0` | Declarative physics, text ink-fade, and layout scale animations |
| **Icons** | [Lucide React](https://lucide.react) | `^1.21.0` | Minimalist iconography (audio, controls, journal, compass) |
| **Audio Engine** | Web Audio API | Native Browser | Real-time procedural audio synthesis without static audio assets |
| **Graphics** | HTML5 Canvas 2D | Native Browser | 690-star multi-layer parallax particle field with mouse inertia |
| **LLM Provider** | [OpenRouter](https://openrouter.ai) | REST API | Gateway serving `meta-llama/llama-3.3-70b-instruct` |
| **Hosting & CI** | [Vercel](https://vercel.com) | `@astrojs/vercel` | Automated serverless deployment connected to GitHub `main` |

---

## 4. Key Engineering Implementations

### A. Dual-Engine Resilience (Zero-Downtime Design)
The application guarantees that a session will never crash or show an empty screen:
- **Primary Engine:** OpenRouter API calling `meta-llama/llama-3.3-70b-instruct` with strict JSON mode.
- **Server Fallback:** If the API key is missing or upstream fails, `/api/reflection.ts` catches the exception and generates reflections using `reflectionGenerator.ts`.
- **Client Offline Fallback:** If the client loses internet connectivity completely, `MeditationApp.tsx` intercepts the `fetch` error and generates reflections in browser memory with an informational toast.
- **Rule-Based Engine:** Employs regex pronoun shifting (e.g. converting *"I am scared my team will judge me"* to *"your team will judge you"*) and keyword categorization across 11 thematic tracks (`interview`, `exam`, `career`, `friends`, `romance`, `lonely`, `regret`, `health`, `worth`, `future`, `general`).

### B. Single Unified Clock Architecture
Rather than running separate asynchronous timers for sentence progression, box breathing, audio stage updates, and progress bars, the session uses a single unified 1-second interval (`secondsElapsed`):
- `currentSentenceIndex = Math.floor(secondsElapsed / 12)`
- `breathCycleSeconds = secondsElapsed % 12` (0-3s Inhale, 4-5s Hold, 6-9s Exhale, 10-11s Rest)
- `progress = (secondsElapsed / 96) * 100`
- `audioSynth.updateStage(progress / 100)`

### C. Procedural Web Audio Synthesis (`audioSynth.ts`)
Instead of loading megabytes of MP3 files, soundscapes are synthesized natively:
- **Rain:** Looping white noise buffer passed through lowpass (1200Hz) and bandpass (800Hz) BiquadFilters modulated by a slow 0.1Hz sine LFO.
- **Ocean:** Lowpass filter cutoff modulated between 170Hz and 530Hz using a 0.08Hz sine wave LFO to mimic a 12-second wave break cycle.
- **Forest:** Bandpass-filtered wind noise coupled with randomized sweeping oscillator bursts simulating bird chirps every 4–9 seconds.
- **Space Drone:** Low-frequency minor chord (C3, G3, D4, Eb4) generated via triangle oscillators with asynchronous phase-shifted filter modulators.
- **Piano:** Pentatonic scale generator (C Minor Pentatonic) playing randomized 1-2 note chords with soft attack and warm 4.5-second exponential decay envelopes.

---

## 5. API Reference

### `POST /api/reflection`

#### Request Payload
```json
{
  "thought": "I feel anxious about talking in public tomorrow"
}
```

#### Successful Response (`HTTP 200`)
```json
{
  "quotes": [
    "You're feeling anxious about talking in public tomorrow, and that's a pretty normal reaction. It's natural for your brain to focus on this concern right now because it feels important to you.",
    "It makes sense that you're thinking about this a lot, since public speaking can be intimidating and you want to make a good impression.",
    "Worrying about how you'll come across isn't going to change the outcome, and it's not like you can fully prepare for every possible scenario. You've likely done this before and have some idea of what to expect.",
    "Comparing yourself to others who seem more confident in public speaking isn't helpful, as you don't know what they're thinking or feeling behind the scenes. Everyone has their own struggles with this.",
    "You've probably spoken in front of people before, and you've survived. You can handle whatever happens tomorrow, even if it doesn't go exactly as planned.",
    "It's also worth remembering that this is just one event, and it's not going to define your whole life. You have a lot of other experiences and interactions that will happen after this is over.",
    "Right now, take a breath and notice where you are in this moment. You're safe, and you can focus on your surroundings rather than getting caught up in worries about tomorrow.",
    "See if you can let go of trying to rehearse or solve everything in your head, and just be present with your breath for a few seconds. You can come back to thinking about tomorrow later."
  ]
}
```

---

## 6. Environment Variables

| Variable | Description | Location |
| :--- | :--- | :--- |
| `OPENROUTER_API_KEY` | OpenRouter API authentication key (sk-or-v1-...) | Local `.env` (gitignored) & Vercel Project Settings |

---

## 7. Local Development

### Prerequisites
- Node.js `>= 22.12.0` (Node 24 recommended)
- npm

### Installation
```bash
# Clone the repository
git clone https://github.com/jaskiratmiglani07/Anxietylabrelief.git
cd Anxietylabrelief

# Install dependencies
npm install

# Create local environment file
echo "OPENROUTER_API_KEY=your_key_here" > .env
```

### Development Server
```bash
# Start Astro development server
npm run dev

# Or start in background mode (per workspace guidelines)
astro dev --background
```

### Production Build
```bash
npm run build
npm run preview
```

---

## 8. Deployment & CI/CD Pipeline

The application is deployed on Vercel with automatic continuous deployment connected to GitHub:
1. Every push to the `main` branch triggers a Vercel production build via GitHub Webhooks.
2. Vercel executes `astro build`, outputting serverless API routes into `.vercel/output/functions` and static assets into `.vercel/output/static`.
3. Secrets are loaded securely from Vercel's encrypted environment variable store.

---

## 9. Technical Interview / Viva Topics

Key technical areas and concepts implemented in this codebase:

1. **Astro Hybrid Architecture:** How Astro handles SSR serverless endpoints alongside client-only React islands (`client:only="react"`).
2. **State & Clock Synchronization:** The rationale behind driving all animation, text index, audio filters, and breathing states from a single unified integer clock.
3. **Web Audio API Graph Architecture:** How audio nodes (`AudioBufferSourceNode`, `BiquadFilterNode`, `GainNode`, `OscillatorNode`) interact in real-time without audio files.
4. **Canvas 2D Optimization:** Multi-layer starfield rendering, device pixel ratio scaling, smooth lerped mouse parallax, and sinusoidal twinkle math.
5. **AI Prompt Engineering & Safety:** Structuring non-clinical, grounded system prompts with strict JSON schema constraints and error recovery.
6. **Zero-Knowledge Privacy:** Why external databases were omitted in favor of client-side `localStorage` for mental health data.
7. **Graceful Multi-Tier Degradation:** How the system handles upstream API outages, rate limits, and network disconnects without crashing.

---

## 10. License & Privacy

Built with strict privacy-first principles. No user thoughts, worries, or reflections are ever stored on central servers or analytical databases.
