# AI Agent Instructions for Course Constructor App

## Project Overview
This is a React-based course construction application that uses Google's Gemini API for AI features. The app implements a secure proxy architecture to protect API keys and supports multiple deployment options.

## Critical Course Structure Requirements

### Course Data Model
- Courses MUST follow the structure: `modules → activities`
- Do NOT use: `modules → parts → resources` (will cause blank screen)
- Each module must contain an `activities` array directly
- Required course fields:
  ```typescript
  interface Course {
    id: string;                 // kebab-case, no spaces
    title: string;             // Clear, descriptive
    subtitle: string;
    description: string;       // Without double spaces
    category: string;          // Aligned with site taxonomy
    broadCategories: Array<'Autoconocimiento' | 'Gestión Emocional' | 'Habilidades Sociales'>;
    coverImage: string;        // Must use assetPath('images/...')
    instructor: {
      name: string;
      avatarUrl: string;      // Must use assetPath for existing avatar
    };
    learningObjectives: string[]; // 5-7 descriptive bullets
    modules: Module[];
  }
  ```

### Module Structure
```typescript
interface Module {
  id: string;     // Use consistent IDs: m1, m2, etc.
  title: string;  // Meaningful, descriptive title
  activities: Activity[]; // Direct array of activities
}
```

## Core Architecture

### Frontend (Vite + React)
- Built with Vite and React 18
- Authentication handled via Kinde Auth (`@kinde-oss/kinde-auth-react`)
- Main entry points: `index.tsx` and `index.html`

### Backend (API Proxy)
Two implementation options are provided:
1. Local development server (`server.mjs`):
   - Minimal Node.js server running on port 8787
   - Proxies Gemini API requests to protect API key
   - Handles CORS for local development

2. Vercel Serverless Function (`api/generate.ts`):
   - Production-ready implementation with fallback model support
   - Implements robust error handling and model selection
   - Supports environment configuration for different Gemini models

## Key Patterns and Conventions

### Environment Variables
- Development: Copy `.env.example` to `.env.local`
- Required variables:
  ```
  GEMINI_API_KEY=your-key-here
  VITE_KINDE_DOMAIN=https://animikrea.kinde.com
  VITE_KINDE_CLIENT_ID=your-client-id
  VITE_KINDE_REDIRECT_URI=http://localhost:3000
  VITE_KINDE_LOGOUT_REDIRECT_URI=http://localhost:3000
  ```
- Production (Vercel): Set variables in project settings

### API Communication
- All AI requests must go through the proxy to protect API keys
- Local development uses port 8787 for API proxy
- Production routes through `/api/generate` serverless function

### Authentication Flow
- Uses Kinde Auth for user management
- First-time users complete a profile form
- Profile data stored in localStorage by user

## Developer Workflows

### Local Development
1. Install dependencies: `npm install`
2. Start backend proxy: `npm run server`
3. Start frontend: `npm run dev`
   - Or run both with: `npm run dev:all`

### Deployment
Two supported paths:

1. Vercel (Recommended):
   - Automatically detects Vite configuration
   - Set `GEMINI_API_KEY` in project settings
   - Optionally set `GEMINI_MODEL` for model selection

2. GitHub Pages + External Backend:
   - Static frontend hosted on Pages
   - Backend needs separate hosting
   - Set `VITE_API_BASE` in GitHub secrets

### Testing
- Use the "Test AI Connection" button in the app header
- Local: Tests proxy on port 8787
- Production: Tests `/api/generate` endpoint

## Activity Type Requirements

### Video Activities
```typescript
interface VideoActivity {
  id: string;              // Format: m1a1, m1a2, etc.
  type: 'video';
  title: string;
  description: string;
  videoSrc: string;        // Must use assetPath('videos/file.mp4')
}
```
- Local videos must use `assetPath('videos/...')`
- Complete button enabled upon video completion

### YouTube Activities
```typescript
interface YouTubeActivity {
  id: string;
  type: 'youtube';
  title: string;
  description: string;
  videoSrc: string;       // Direct YouTube URL
}
```

### Iframe Activities
```typescript
interface IframeActivity {
  id: string;
  type: 'iframe';
  title: string;
  description: string;
  content?: string[];     // Pure HTML without markdown fences
  videoSrc?: string;      // External URL or Google Drive /preview link
  hideHeader?: boolean;    // Set true if HTML has own title
}
```
- Do NOT use markdown fences (```) in content
- For large HTML, prefer files in `/public/htmls/` referenced via `src`

### Text Activities
```typescript
interface TextActivity {
  id: string;
  type: 'text';
  title: string;
  description: string;
  content: string[];      // Plain text only, NO HTML
  imageSrc?: string;      // Use assetPath('images/...')
  imageAltSrc?: string;   // Optional alternate image
}
```
- Content must be plain text - HTML will not render
- Images must use `imageSrc` with `assetPath`

### Quiz Activities
```typescript
interface QuizActivity {
  id: string;
  type: 'quiz';
  title: string;
  description: string;
  questions: Array<{
    question: string;
    options: Array<{
      text: string;
      feedback: string;   // Required - no correct/incorrect flags
    }>;
  }>;
}
```
- All options must have feedback text
- Do not use `correct` boolean or answer indices

### Audio Activities
```typescript
interface AudioActivity {
  id: string;
  type: 'audio';
  title: string;
  description: string;
  audioSrc: string;      // Must use assetPath('audios/...')
}
```

## Common Tasks

### Resource Path Requirements

Always use `assetPath` helper for local resources:
- Images: `assetPath('images/...')`
- Audio: `assetPath('audios/...')`
- Videos: `assetPath('videos/...')`
- HTML: Files in `/public/htmls/`

External Resources:
- YouTube: Use `type: 'youtube'` with direct video URL
- Google Drive: Use `type: 'iframe'` with `/preview` URL
- External HTML: Use `type: 'iframe'` with file in `/public/htmls/` or pure HTML content

### Common Pitfalls to Avoid

1. Module Structure:
   - Never use nested `parts` or `resources`
   - Always use direct `activities` array in modules

2. Content Formatting:
   - Text activities: No HTML in content, use plain text only
   - Images: Always use `imageSrc` with `assetPath`
   - Iframe HTML: No markdown fences, pure HTML only

3. Quiz Format:
   - Always include feedback text for each option
   - Never use `correct` boolean or answer indices
   - Focus on reflection, not grading

4. Resource Paths:
   - Always use `assetPath` for local resources
   - Cover images must use `assetPath('images/...')`
   - Instructor avatars must use existing files with `assetPath`

5. Content Organization:
   - One activity = one self-contained unit
   - Use meaningful IDs (m1a1, m1a2) and titles
   - Include required categories and learning objectives

## Using AI Agents to Fix Course Issues

### Step 1: Course Structure Validation
Ask the AI to:
```
"Please validate the structure of my course in [file path] and convert any modules → parts → resources structure to the correct modules → activities format. Make sure each module has a direct activities array."
```

### Step 2: Activity Type Fixes
For each activity type, ask:
```
"Review all [activity type] activities in my course and ensure they follow the correct interface. Specifically check for:
1. Proper use of assetPath for resources
2. Correct content formatting (no HTML in text activities)
3. Valid structure for quiz options with feedback
4. Proper iframe content without markdown fences"
```

### Step 3: Resource Path Correction
Ask the AI to:
```
"Update all resource paths in my course to use assetPath helper:
1. Check coverImage path
2. Validate instructor avatar path
3. Fix all image, video, and audio paths in activities
4. Ensure external resources use correct types (youtube/iframe)"
```

### Step 4: Content Clean-up
Request:
```
"Clean up the content formatting in my course:
1. Remove any HTML from text activities
2. Move large HTML content to separate files
3. Fix quiz options to use feedback instead of correct/incorrect
4. Ensure consistent ID formatting (m1a1, m1a2, etc.)"
```

### Example Full Course Fix Request
```
"Please help me fix compatibility issues in my course file [path]:
1. Validate and fix the module structure
2. Update all resource paths to use assetPath
3. Clean up activity content formatting
4. Fix quiz structure and feedback
5. Ensure proper categorization
Please make these changes while preserving the existing content and logic."
```

### Validation Checklist for AI-Generated Changes
After the AI makes changes, verify:
1. Module structure is flat (no nested parts)
2. All local resources use assetPath
3. Text activities contain only plain text
4. Quiz options have feedback
5. IDs follow consistent pattern
6. No markdown fences in iframe content
7. Course has proper categorization
8. All required fields are present