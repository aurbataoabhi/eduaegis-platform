# EduAegis: Resilient, Anti-Piracy Live Teaching & LMS Platform

EduAegis is an enterprise-grade live education and curriculum streaming platform engineered to overcome the core operational challenges facing modern educators, coaching institutes, and edtech companies:
1. **Network Fluctuations & Sudden Power Outages** (Adaptive low-bandwidth fallbacks, cloud composite recordings, and session checkpointing).
2. **Intellectual Property Protection & Anti-Piracy** (Dynamic forensic watermarking, hardware DRM, screen-grab interceptors, and strict browser download prevention).
3. **Frictionless Student Access** (Persistent sessions, zero meeting codes, instant one-click classroom entry).
4. **Interactive Engagement & Integrity** (Fastest-Finger-First live pop quizzes, teacher inaudible/frozen emergency pings, sandboxed hackathons/coding contests, and course-grounded AI doubt solver with anti-cheat lockout).
5. **Sustainable B2B SaaS Business Growth** (Tiered subscriptions + automated tuition fee commission splits + embeddable SSO widget).

---

## Key Highlights

- **Dynamic Forensic Watermark**: Semi-transparent, moving canvas overlay rendering `Student Name`, `Roll No`, `Masked IP`, `Timestamp (UTC)`, and `Cryptographic HMAC Signature`. Even if a student attempts to record with a physical mobile camera, the watermark identifies the leak source.
- **Screen Capture & Recording Defense**:
  - Native Windows: Hardware-enforced `SetWindowDisplayAffinity(WDA_MONITOR)` blacking out OBS, Discord, and screen capture software.
  - Native macOS: `setContentProtection(true)`.
  - Native Mobile: Android `FLAG_SECURE` and iOS recording state observers.
  - Web: Keyboard shortcut trapping (`PrtScn`, `F12`, `Ctrl+Shift+I`), DevTools debugger trap, and window blur blanking.
- **Strict Download Policy**:
  - Web browsers are strictly blocked from raw file or MP4 downloads.
  - Offline downloads are only permitted inside native desktop and mobile app containers where files are stored as encrypted AES-128 HLS chunks.
- **"Teacher Inaudible / Frozen" Emergency Signal**:
  - One-tap button for students in live class.
  - If $\ge 3$ or $10\%$ of students report within 10 seconds, the teacher's HUD immediately displays an urgent alert with audio/video device diagnosis recommendations.
- **Fastest-Finger-First (FFF) Live Quizzes**:
  - Live pop quizzes with millisecond-precision server-side timestamps to award the earliest correct student winner with celebratory leaderboards and points.
- **Contextual AI Doubt Engine with Anti-Cheat Lockout**:
  - Grounded exclusively in course transcripts and lecture notes.
  - Automatically locks out queries whenever an active exam, timed hackathon, or pop quiz is active.
- **B2B SaaS Multi-Tier & Revenue Split**:
  - Flexible plans: Starter Tutor (\$19/mo), Pro Academy (\$79/mo), Enterprise (\$249/mo).
  - Integrated tuition fee split with automated platform commission (2.5% - 8%).

---

## Directory Layout

```
eduaegis-platform/
├── prisma/
│   └── schema.prisma           # Complete database model
├── src/
│   ├── index.ts                # Express API & Socket.io server
│   ├── security/
│   │   ├── watermark-service.ts    # Forensic watermark generator & verifier
│   │   ├── anti-capture-guard.ts   # Screen capture blockers & download rules
│   │   ├── device-fingerprint.ts   # Hardware concurrency & session control
│   │   └── drm-token-service.ts    # DRM ephemeral playback tokens
│   ├── realtime/
│   │   └── classroom-socket.ts     # FFF Quizzes, Panic alerts & hand raises
│   ├── assessments/
│   │   └── code-runner.ts          # Sandboxed contest & hackathon evaluator
│   ├── ai/
│   │   └── doubt-solver.ts         # Course-grounded RAG with anti-cheat lock
│   └── saas/
│       └── subscription-service.ts # Tier limits & tuition split calculator
├── public/
│   └── index.html              # Full interactive preview dashboard
├── package.json
└── tsconfig.json
```

---

## Quick Start

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Build TypeScript**:
   ```bash
   npm run build
   ```
3. **Launch Platform**:
   ```bash
   npm start
   ```
4. **Open Dashboard**:
   Navigate to `http://localhost:4200` in your browser.
