# Seraya


> Named for Borneo's tallest tropical tree—its great height held up by wide buttress roots, just as our elders' wisdom rests on the care that surrounds them.


Seraya is a health monitoring application designed to facilitate communication and care between elderly individuals and their caregivers. It consists of two distinct interfaces: a simple, accessible app for elderly users to complete daily check-ins and a comprehensive dashboard for caregivers to monitor well-being, track trends, and receive alerts.

This repository contains the Convex backend and an interactive HTML front-end preview that demonstrates the full user experience for both app modules.

## Features

### Elderly App
- **Simple Daily Check-ins:** A clean, icon-driven interface for elderly users to answer daily health questions.
- **Intuitive Responses:** Users respond with smiley-face scales (1-5) or simple Yes/No buttons, minimizing cognitive load.
- **Progress Tracking:** A visual progress bar shows users how many questions are left in their daily questionnaire.
- **Completion Confirmation:** A clear, positive confirmation screen appears upon completing the check-in.

### Caregiver App
- **Centralized Dashboard:** Monitor the status and recent check-ins of all assigned elderly users in one place.
- **Detailed Patient View:** Dive into an individual's profile to see daily summaries, historical trends, and triggered alerts.
- **Data Visualization:** View health data through trend-line charts and a calendar heatmap to easily spot patterns or declines.
- **Customizable Questionnaires:** Use the "Build" section to create, edit, and manage questionnaires. Caregivers can:
    - Choose from templates or start from scratch.
    - Define questions with custom icons and descriptions.
    - Select response types (1-5 scale or Yes/No).
    - Preview the questionnaire flow from the elderly user's perspective.
- **Automated Alerts:** Configure alert thresholds for specific questions (e.g., "notify me if appetite is rated ≤ 2 for 3 consecutive days").
- **Notification Center:** Receive and manage notifications for completed check-ins and triggered alerts.

## Tech Stack

- **Backend:** [Convex](https://www.convex.dev/)
- **Frontend Preview:** HTML, CSS, Vanilla JavaScript

## Interactive Preview

This repository includes a self-contained interactive front-end preview. To see it in action, simply open the `seraya-preview.html` file in your web browser. Or use the published html page 'https://choo-c102.github.io/seraya-app/seraya-preview.html'. No backend setup is required to explore the UI and user flows.

## Project Structure

```
.
├── seraya-preview.html     # Interactive front-end preview for both apps
├── backend/                # Convex backend application
│   ├── convex/             # Schema, queries, mutations, and crons
│   ├── package.json
│   └── ...
├── caregiver-app/          
└── elderly-app/
```
      
