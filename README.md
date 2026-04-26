# Seraya App - Elderly Health Tracker

A visual-first, no-text health tracking system for elderly users with a companion caregiver app. Built with **Expo (React Native)** and **Convex** backend.

## Architecture

```
seraya-app/
├── backend/          # Convex backend (shared by both apps)
├── elderly-app/      # Expo app for elderly users
├── caregiver-app/    # Expo app for caregivers
└── design-reference/ # Visual design mockups
```

## Tech Stack

- **Frontend**: Expo (React Native) with Expo Router
- **Backend**: Convex (real-time, reactive database)
- **Auth**: Custom device-token auth (elderly) + email/password (caregivers)
- **i18n**: i18next (English, Malay, Chinese, Tamil)
- **Storage**: Convex file storage for custom icons and avatars

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 8
- Expo CLI (`npx expo`)

### 1. Set up Convex Backend

```bash
cd backend
npm install
npx convex dev
```

This will prompt you to create a Convex project. Follow the instructions and note your deployment URL.

### 2. Configure Environment

Create `.env` files in both app directories:

```bash
# elderly-app/.env
EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# caregiver-app/.env
EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

### 3. Run Elderly App

```bash
cd elderly-app
npm install
npx expo start
```

### 4. Run Caregiver App

```bash
cd caregiver-app
npm install
npx expo start
```

## Apps Overview

### Elderly App
- Zero-text interface using images, icons, and emojis
- Duolingo-inspired one-question-per-screen flow
- 5-smiley scale and yes/no boolean responses
- Haptic feedback and confetti celebration on completion
- Backfill calendar for missed days
- Auto-login via device token

### Caregiver App
- **Dashboard**: Monitor assigned elderly patients' daily check-ins, trend charts, and heatmap calendar
- **Build**: Create questionnaires from templates or from scratch, with built-in icon library
- **Notifications**: Real-time alerts for threshold breaches and check-in completions
- Email/password authentication with invite-link registration

## Supported Languages

- English
- Bahasa Melayu (Malay)
- 中文 (Chinese Simplified)
- தமிழ் (Tamil)
