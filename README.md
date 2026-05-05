# Aced | AI-Powered Study Assistant

![Project Status](https://img.shields.io/badge/Status-Archived-red)
![License](https://img.shields.io/badge/License-MIT-green)
![Tech](https://img.shields.io/badge/Tech-Next.js%20%7C%20Gemini%20AI-blue)

**Aced** is a sophisticated Minimum Viable Product (MVP) designed to streamline the study process. Using Google's Gemini 2.5 Flash model, it transforms dense study guides into structured, actionable learning plans.

---

## 📢 Project Status Notice
> **Note from the Founder:** As of May 2026, Aced is no longer being actively maintained. Due to the high costs of AI API credits and personal time constraints, I have decided to transition this project to Open Source. I hope the code serves as a helpful resource for other developers exploring AI integration. **o7**

---

## ✨ Features
* **AI Study Plan Generation:** Leverages Gemini 2.5 Flash to parse and organize study material.
* **Serverless Architecture:** Built with Next.js/Vercel for high performance and scalability.
* **Secure Backend:** API routes handle sensitive AI logic without exposing credentials to the frontend.
* **Progress Tracking:** Localized logic to save and manage study progress.

---

## 🛠️ Tech Stack
* **Frontend:** HTML5, CSS3, JavaScript (ES6+)
* **Backend:** Node.js (Vercel Serverless Functions)
* **AI Engine:** Google Gemini 2.5 Flash API
* **Deployment:** Vercel

---

## 🚀 Local Setup & Hosting Instructions

If you would like to run a local instance of Aced or host it yourself, follow these detailed steps.

### 1. Prerequisites
* A GitHub account.
* Node.js installed on your machine.
* A **Gemini API Key** (obtainable at [Google AI Studio](https://aistudio.google.com/)).

### 2. Installation
```bash
# Clone the repository
git clone [https://github.com/jack-builds/aced-mvp.git](https://github.com/jack-builds/aced-mvp.git)

# Navigate into the directory
cd aced-mvp

# Install dependencies
npm install

```
### 3. Environment Configuration
* Create a file named .env in the root directory of the project. Add your API key as follows:
```bash
GEMINI_API_KEY=your_actual_api_key_here
```
* Note: The .gitignore file is already configured to prevent this file from being pushed to public repositories.

### 4. Running Locally
```bash
npm run dev
```
* Open http://localhost:3000 in your browser to see the result.

## ☁️ Hosting on Vercel (Step-by-Step)
* Aced is designed to be hosted on Vercel with zero configuration.

* Push to GitHub: Ensure your latest code is pushed to your GitHub repository.

* Import Project: Go to the Vercel Dashboard and click "New Project".

* Connect Repo: Select your aced-mvp repository.

* Configure Environment Variables:

* Before clicking "Deploy", expand the Environment Variables section.

* Add GEMINI_API_KEY as the Name.

* Paste your secret key from Google AI Studio as the Value.

* Deploy: Click Deploy. Vercel will provide you with a live URL.

## 📂 Repository Structure

| File / Folder | Responsibility |
| :--- | :--- |
| **`/api/generate.js`** | Secure backend bridge to the Gemini 2.5 Flash API. |
| **`index.html`** | The project entry point and current maintenance notice. |
| **`generate.html/js`** | Core engine for parsing text and generating AI study plans. |
| **`plans.html/js`** | User interface for managing and reviewing saved content. |
| **`app.js`** | Main application logic and global state management. |
| **`shared.css`** | Unified design system and styling. |


## 📜 License

**All Rights Reserved.**

The source code for Aced is provided for **educational and portfolio purposes only**. 

* **Non-Commercial Use:** You are welcome to fork this repository, study the code, and run it locally for personal use.
* **Commercial Use:** Use of this code, or any derivative works based on it, for commercial purposes, hosting as a paid service, or financial gain is **strictly prohibited** without explicit written permission from the author.
* **Attribution:** If you use elements of this code for other non-commercial educational projects, please provide clear attribution to the original repository.

## 👨‍💻 Author
Jack Warkentin Full-stack Developer & Creator of Aced GitHub Profile

o7
