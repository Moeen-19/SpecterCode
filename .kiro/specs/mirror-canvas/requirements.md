# 🧠 MirrorCanvas — Emotionally Reactive IDE Extension

## 📘 Overview

**MirrorCanvas** is a Kiro-powered intelligent IDE extension that transforms code editing into an *emotionally expressive experience*. It observes your tone, typing rhythm, and coding flow, using that data to evolve the workspace atmosphere — from spooky Halloween fog to tranquil rainy cafés.

It fuses emotional intelligence, reactive design, and personalization into a single **AI-augmented creative environment** that learns and evolves with you.

---

## 🎯 Objectives

* Transform emotional state and coding context into adaptive visual, audio, and behavioral cues.
* Integrate deeply into the IDE workflow without interrupting productivity.
* Provide configurable “atmospheres” (themes) that define tone, effects, and interactions.
* Establish emotional continuity — the workspace evolves visually and thematically over time.

---

## 🧩 System Components

### 1. **Emotion Engine**

Detects and maintains the user’s emotional state using:

* Sentiment analysis of chat/command interactions.
* Behavioral metrics: typing speed, code error frequency, idle time.
* Optional mic input for tonal cues.

Emotional data → converted into an **Emotional Vector** (Calm, Excited, Curious, Frustrated, Tense).
Stored locally and used for both *real-time* and *long-term* mood evolution.

---

### 2. **Vibe Coding Layer**

The expressive layer controlling **visuals, sound, and animations**.
Each IDE event (save, build, hover, close, etc.) triggers context-aware animations.

#### Examples:

| Action         | Emotion    | Effect                                |
| -------------- | ---------- | ------------------------------------- |
| Save file      | Calm       | Soft wave animation across status bar |
| Error detected | Frustrated | Static glitch pulse + low thump       |
| Code compile   | Excited    | Spark trail along line numbers        |
| Idle (2+ min)  | Tense      | Ambient fog drifts over workspace     |
| Close project  | Mixed      | “Fade-out” ghost ripple               |

All visuals are modulated by the **current theme** (Halloween, Rainy Forest, Café, Cave, Neon City).

---

### 3. **Memory Canvas**

Persistent data layer that stores session-wise emotional vectors and user actions to form a **Mood Trajectory Graph**.
This informs long-term workspace transformation — colors, texture complexity, ambient intensity evolve with time.

* Dominantly *Calm* → smooth gradient + fluid motion
* Frequent *Frustration* → cracked overlays, subtle static grain
* Bursts of *Joy* → halo glows, particle bursts

---

### 4. **Specter Personas**

AI-based contextual companions that manifest visually:

| Persona       | Trigger                 | Behavior                               |
| ------------- | ----------------------- | -------------------------------------- |
| **Muse**      | Calm / Inspired         | Encourages, suggests creative snippets |
| **Critic**    | Frustrated / Overworked | Advises, highlights errors gently      |
| **Archivist** | End of session          | Summarizes mood + productivity trends  |

Each persona slightly alters tone, animations, and ambient audio layer.

---

### 5. **Theme Spec System**

The **Theme Spec** defines the full aesthetic + behavioral profile of an atmosphere:

* Color Palette
* Background Textures
* Animation Effects
* Ambient Audio
* Particle and Lighting Properties

Default Spec → **Halloween** 🎃

* Black/orange neon glow
* Drifting fog particles
* Ghostly whisper SFX
* Code caret emits subtle spectral trail

User can load or build their own:

* *Rainy Forest*: cool greens, rain drips, ambient thunder
* *Café*: warm lights, soft chatter hum
* *Cave*: dim blue echoes, torch flicker
* *Neon City*: cyberpunk synthwave grid

---

### 6. **Configuration Panel**

Accessible via `MirrorCanvas: Configure` command in IDE palette.

Features:

* Select or import Theme Spec file (`.mcvibe.json`)
* Adjust intensity sliders for:

  * Particle density
  * Ambient volume
  * Animation speed
  * Color transitions
* Enable/disable emotion-based effects
* Preview live before applying
* Toggle “Performance Mode” (reduces resource usage)

---

### 7. **IDE Integration Layer**

* Built on **VS Code Extension API** (or compatible IDEs)
* Uses **Kiro MCP** for agent coordination and cross-component state sync
* UI layer via **Webview + Framer Motion**
* Non-blocking performance mode via async hooks

Keyboard Shortcuts:

```
Ctrl+Shift+M → Toggle MirrorCanvas
Ctrl+Shift+T → Switch Theme
Ctrl+Shift+P → Preview Persona Activation
```

---

## ⚙️ Architecture

```
          ┌──────────────────────────┐
          │      MirrorCanvas        │
          ├───────────┬──────────────┤
                      │
     ┌────────────────┼──────────────────┐
     │                │                  │
 Emotion Engine   Vibe Coding Layer   Memory Canvas
     │                │                  │
     └───> Specter Personas  <───────────┘
             │
         Theme Spec
             │
        Configuration UI
```

### Data Flow

1. User input → Emotion Engine (sentiment + behavior → emotional vector)
2. Vector → Vibe Coding Layer (adjust visuals/audio)
3. Session ends → Memory Canvas stores state
4. Cumulative emotion trends → update long-term atmosphere
5. Specter Persona emerges dynamically based on emotional vector
6. Config Panel modifies theme + intensity settings in real time

---

## 🧪 Example Emotional Scenarios

### Calm + Focused

* Background slowly pulses with soft orange glow
* Typing emits faint luminous dust
* “Muse” persona idly hums soft notes

### Frustrated + Stuck

* UI flickers gently at edges
* Fog turns dark violet
* “Critic” persona whispers debugging hints

### Joyful + Creative

* Particle bursts trail cursor
* Warm luminescent waves under code lines
* “Muse” persona adds spark animation near the editor tabs

---

## 🧠 Kiro Features Used

| Kiro Capability   | Implementation                                          |
| ----------------- | ------------------------------------------------------- |
| **Vibe Coding**   | Controls adaptive animations & color transitions        |
| **Agent Hooks**   | Emotion-triggered persona activation                    |
| **Steering Docs** | Persistent UI evolution via emotional history           |
| **MCP**           | Mediates between Emotion Engine, Vibe Layer, and Canvas |
| **Specs**         | Theme definition and custom configuration               |

---

## ✅ Acceptance Criteria Summary

| ID | Goal                        | Validation                                     |
| -- | --------------------------- | ---------------------------------------------- |
| R1 | Real-time emotion detection | Sentiment → visual update within 500ms         |
| R2 | Reactive animations         | All IDE actions trigger visible/sound feedback |
| R3 | Emotional memory            | Visual evolution across ≥5 sessions            |
| R4 | Specter Personas            | Appear/disappear contextually based on emotion |
| R5 | Theme Config                | Fully customizable via `.mcvibe.json`          |
| R6 | Seamless Integration        | <5% IDE performance overhead                   |

---