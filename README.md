# 🤖 AIVOA – AI-Powered Customer Complaint Management System

> An intelligent complaint management platform that leverages Large Language Models (LLMs) to automate complaint processing, extract structured information, detect duplicate complaints, assess complaint risk, and streamline customer support workflows.

![Python](https://img.shields.io/badge/Python-3.11-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688)
![React](https://img.shields.io/badge/React-Frontend-61DAFB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791)
![Groq](https://img.shields.io/badge/Groq-LLM-orange)
![LangGraph](https://img.shields.io/badge/LangGraph-Agent-green)

---

# 📌 Overview

AIVOA is an AI-powered customer complaint management system that automates the entire complaint lifecycle—from complaint submission to structured information extraction, duplicate complaint detection, AI-powered risk analysis, and complaint storage.

## ✨ Features

- 🤖 AI-powered complaint information extraction
- 📄 PDF and text complaint support
- 📝 Automatic complaint form auto-fill
- ⚠️ AI-based risk assessment
- 💬 Conversational AI assistant for complaint correction
- 🗄️ PostgreSQL complaint storage
- 🔍 Duplicate Complaint Detection
- ⚡ FastAPI backend with React frontend
- 🧠 LangGraph workflow orchestration
- 🚀 Groq LLM integration

## 🧠 Duplicate Complaint Detection

Before saving a complaint, the system checks the database for similar complaints to:
- Detect duplicate submissions
- Reduce redundant records
- Identify recurring customer issues
- Improve complaint management efficiency

---

# 🏗 Tech Stack

## Frontend
- React.js
- Vite
- Redux Toolkit
- CSS

## Backend
- FastAPI
- Python
- SQLAlchemy
- PostgreSQL
- Pydantic

## AI
- Groq API
- LangGraph
- Gemma 2 9B IT

---

# 🚀 Installation

```bash
git clone https://github.com/prasadmagar922005-cell/aivoa-complaint-system.git
cd aivoa
```

## Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Create `.env`

```env
GROQ_API_KEY=your_api_key
DATABASE_URL=postgresql://username:password@localhost:5432/aivoa
```

Run backend

```bash
uvicorn main:app --reload
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

---

# 🔄 Workflow

1. User submits complaint (Text/PDF)
2. AI extracts complaint details
3. Duplicate complaint detection
4. AI risk assessment
5. User reviews using AI chat
6. Complaint saved to PostgreSQL

---

# 📡 API Endpoints

| Method | Endpoint | Description |
|---------|----------|-------------|
| GET | /health | Health Check |
| POST | /extract | Extract complaint fields |
| POST | /chat | AI chat assistant |
| POST | /duplicate-check | Duplicate complaint detection |
| POST | /commit | Save complaint |

---

# 🚀 Future Improvements

- User Authentication
- Email Notifications
- OCR Support
- Analytics Dashboard
- Multi-language Support
- Voice Complaint Submission

---

# 👨‍💻 Author

**Prasad Magar**

B.Tech – Artificial Intelligence & Machine Learning

GitHub: https://github.com/prasadmagar922005-cell
