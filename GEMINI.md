# GEMINI.md

This file provides guidance for developers and AI assistants contributing to the **Gacha Savior** project. It outlines the project's architecture, conventions, and future goals to ensure consistent and high-quality development.

## Project Overview

Gacha Savior is a web application built with Next.js and TypeScript, designed for players of the game Genshin Impact. It likely serves as a tool to track characters, artifacts, weapons, and gacha pulls. The project uses Firebase for backend services (like authentication and database) and is styled with Tailwind CSS and shadcn/ui.

*   **Framework**: [Next.js](https://nextjs.org/) (App Router)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
*   **Backend & Database**: [Firebase](https://firebase.google.com/) (Auth, Firestore, etc.)
*   **Linting**: [ESLint](https://eslint.org/)
*   **Package Manager**: npm

## Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Environment Variables**: Create a `.env.local` file in the root directory. This file is for sensitive information, primarily your Firebase configuration. It should not be committed to Git.
    ```
    # Firebase configuration
    NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
    ```
3.  **Run Development Server**:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

## Development Conventions

### File Structure

The project uses the Next.js App Router, located in `src/app`.

*   `src/app/(pages)`: Contains page routes. Group related pages in subdirectories.
*   `src/components`: Contains shared React components.
    *   `src/components/ui`: For shadcn/ui components. Do not modify directly; use the `shadcn-ui` CLI for updates.
*   `src/lib`: For utility functions and library initializations (e.g., `firebase.ts`).
*   `src/contexts`: For React Context providers, like `AuthContext.tsx`.

### Component Philosophy

*   Build small, reusable components.
*   Use `shadcn/ui` for foundational UI elements like buttons, cards, and inputs. Customize them via the `tailwind.config.ts` file and local utility classes.
*   Complex, feature-specific components should reside in their own files (e.g., `GenshinFeatures.tsx`).

### Styling

*   Use Tailwind CSS utility classes for all styling.
*   Avoid custom CSS files (`.css`) unless absolutely necessary for global styles or complex animations. Global styles are in `src/app/globals.css`.
*   Leverage `tailwind-merge` and `clsx` (already in use) for constructing dynamic and conflict-free class names.

### State Management

*   For authentication and user session data, `AuthContext.tsx` is the central provider.
*   For simple, component-level state, use React's built-in `useState` and `useReducer` hooks.

### Data Fetching

*   Client-side fetching should be done using the browser's `fetch` API or a lightweight wrapper.
*   For server-side data fetching in Server Components, use async/await directly.

### Coding Style

*   Follow the rules defined in `.eslintrc.json`. Run `npm run lint` to check for issues.
*   Code should be well-typed using TypeScript. Avoid using `any` where possible.
*   Although Prettier is not a formal dependency, it's recommended to use it for consistent code formatting.

## Backend & Database

The project is configured to use **Firebase**.

*   The Firebase initialization code is in `src/lib/firebase.ts`.
*   **Security**: Ensure that Firebase API keys and secrets are stored *only* in `.env.local` and are not exposed publicly. Firebase Security Rules should be configured on the Firebase console to protect user data.

## Testing

Currently, the project has **no automated tests**. This is a critical area for improvement.

*   **Proposed Strategy**:
    *   **Unit & Integration Tests**: Use [Jest](https://jestjs.io/) and [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) to test individual components and hooks.
    *   **End-to-End (E2E) Tests**: Use [Playwright](https://playwright.dev/) or [Cypress](https://www.cypress.io/) to simulate user flows across the application.

## Areas for Improvement & Roadmap

Here are some tasks to improve the quality and robustness of Gacha Savior:

1.  **Add Testing Infrastructure**:
    *   Set up Jest and React Testing Library for unit and integration testing.
    *   Write initial tests for critical components (e.g., `login`, `header`) and utility functions.
    *   Set up Playwright or Cypress for E2E tests covering key user journeys like login, viewing characters, etc.

2.  **Improve State Management**:
    *   For complex client-side state (e.g., managing a large inventory of artifacts or characters), consider integrating a dedicated state management library like [Zustand](https://github.com/pmndrs/zustand) or [Jotai](https://jotai.org/). This will simplify cross-component state sharing and reduce prop-drilling.

3.  **Enhance Data Fetching**:
    *   Integrate [TanStack Query (React Query)](https://tanstack.com/query/latest) or [SWR](https://swr.vercel.app/) for data fetching. This provides automatic caching, re-fetching, and a more declarative way to handle loading/error states.

4.  **Implement API Routes**:
    *   For backend logic that needs a secure environment (e.g., communicating with a third-party Genshin API, data processing), create Next.js API routes in the `src/app/api` directory instead of performing all logic on the client.

5.  **CI/CD Pipeline**:
    *   Set up a CI/CD pipeline using GitHub Actions or Vercel to automate linting, testing, and deployment on every push to the main branch.
