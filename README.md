# AI PR Reviewer

An automated, AI-powered GitHub Pull Request reviewer. It acts as a GitHub App that listens to webhook events, analyzes code changes (diffs) using the **Google Gemini API**, and automatically posts structured, line-by-line review comments directly on the pull request. It also includes a stunning Tailwind CSS React dashboard to monitor metrics and review history.

---

## Features

- **Automated Code Review**: Triggers automatically on Pull Request `opened` or `synchronize` (push) events.
- **Smart Analysis**: Uses Google's Gemini LLM to analyze the git diff, identifying:
  - Security vulnerabilities
  - Bugs and logic flaws
  - Performance improvements
  - Best practices and code style
- **Inline PR Comments**: Posts actionable feedback directly on the specific files and lines where issues are found.
- **Developer Dashboard**: A premium, dark-mode React dashboard (built with Vite, Tailwind v3, and shadcn/ui design patterns) to monitor PR statistics, token usage, processing time, and review history.
- **MongoDB Storage**: Persists review metrics, token usage, and issue logs for analytics.
- **Rate Limiting & Webhook Validation**: Securely processes GitHub webhook events using standard best practices.

---

## System Architecture

1. **GitHub App**: Triggers webhooks on PR events.
2. **Express Backend (`/api`)**: Receives the webhook, verifies the signature, and orchestrates the review process.
3. **Octokit / GitHub API**: Fetches the PR diff and posts inline comments back to GitHub.
4. **Google Gemini AI**: Analyzes the parsed diffs and outputs structured JSON containing issues and summaries.
5. **MongoDB**: Stores the resulting review data and telemetry.
6. **React Dashboard**: Fetches data from the backend to display analytics and review logs.

---

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [MongoDB](https://www.mongodb.com/) (Local or Atlas)
- [ngrok](https://ngrok.com/) (For local webhook forwarding)
- A [Google Gemini API Key](https://aistudio.google.com/)
- A GitHub account to create a GitHub App

---

## Setup Guide

### 1. Clone the repository

```bash
git clone https://github.com/CosmicTH0R/AI-PR-Reviewer.git
cd AI-PR-Reviewer
```

### 2. Install Dependencies

Install backend dependencies:
```bash
npm install
```

Install frontend dashboard dependencies:
```bash
cd dashboard
npm install
cd ..
```

### 3. Start ngrok (For Local Development)
GitHub needs a public URL to send webhooks to your local machine.

```bash
ngrok http 3000
```
*Keep this terminal open and copy the `https://<your-ngrok-id>.ngrok-free.app` URL.*

### 4. Create a GitHub App

1. Go to your GitHub profile: **Settings** > **Developer settings** > **GitHub Apps** > **New GitHub App**.
2. **Name**: (e.g., `My AI PR Reviewer Dev`)
3. **Homepage URL**: Your GitHub profile or project repo.
4. **Webhook URL**: Paste your ngrok URL and append `/api/webhooks` (e.g., `https://12345.ngrok-free.app/api/webhooks`).
5. **Webhook Secret**: Generate a random string (save this for your `.env` file).
6. **Permissions**:
   - **Repository permissions**:
     - `Contents`: Read & Write (to read diffs)
     - `Pull requests`: Read & Write (to read PRs and post comments)
     - `Issues`: Read & Write (optional, if you want to create issues)
     - `Metadata`: Read-only (mandatory for GitHub Apps)
7. **Subscribe to events**:
   - `Pull request`
8. Click **Create GitHub App**.
9. **Generate a Private Key** at the bottom of the App settings page. Save the downloaded `.pem` file to the root of your backend directory as `private-key.pem`.
10. **Install the App**: Go to the "Install App" tab on the left menu and install it on the repositories you want to review.

### 5. Configure Environment Variables

Create a `.env` file in the root of the project:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/ai-pr-reviewer

# GitHub App credentials
GITHUB_APP_ID=your_app_id_here
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here
GITHUB_PRIVATE_KEY_PATH=./private-key.pem

# Gemini API
GEMINI_API_KEY=your_gemini_api_key_here
```

*(You can copy `.env.example` to `.env` and fill in the values).*

---

## Running the Application

### Start the Backend Server
From the root directory:
```bash
npm run dev
```
The Express server will start on `http://localhost:3000`.

### Start the React Dashboard
Open a new terminal and navigate to the dashboard directory:
```bash
cd dashboard
npm run dev
```
The Vite development server will start on `http://localhost:5173`.

---

## Usage

1. Create a new branch and push some code changes to a repository where your GitHub App is installed.
2. Open a Pull Request.
3. The backend will instantly receive the webhook via ngrok.
4. The backend fetches the code diff, sends it to the Gemini API, and processes the AI's response.
5. The AI PR Reviewer will post inline comments on specific lines of code in the GitHub PR if it finds any bugs, security vulnerabilities, or style issues.
6. Open your local dashboard (`http://localhost:5173`) to view the metrics, token usage, and details of the review.

---

## Tech Stack

- **Backend**: Node.js, TypeScript, Express, Mongoose, Zod (Schema Validation), `@octokit/rest` (GitHub API integration), `@google/generative-ai` (Gemini integration).
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v3, `lucide-react` (Icons).
- **Database**: MongoDB

---

## License

ISC License. See `package.json` for details.