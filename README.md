# 🎬 CineFlowAI

**AI-Powered Video Generation Platform**

CineFlowAI is an AI-powered video generation application that transforms text prompts into engaging videos. It generates video scenes, searches for relevant stock footage, and adds voiceovers and captions to create a complete video experience.

## ✨ Features

- **AI Scene Generation** – Generate structured video scenes from text prompts.
- **Stock Footage Integration** – Automatically search for relevant video footage using the Coverr API.
- **AI Voiceover** – Generate voice narration using Microsoft Edge Text-to-Speech.
- **Multilingual Support** – Supports multiple languages, including English, Hindi, Tamil, Telugu, Kannada, and Malayalam.
- **Automatic Captions** – Generate captions for video narration.
- **Video Generation** – Combine scenes, footage, voiceovers, and captions into a video.
- **AI-Powered Content** – Uses Groq API for AI-based scene generation.

## 🛠️ Tech Stack

### Frontend
- React
- TypeScript
- Vite

### Backend
- Node.js
- Express.js
- TypeScript

### AI & APIs
- Groq API – AI scene generation
- Coverr API – Stock video footage
- Microsoft Edge TTS – Voiceover generation

### Tools
- FFmpeg / FFprobe – Audio and video processing
- Supabase – Backend services and configuration

## 📁 Project Structure

```text
CineFlowAI/
├── server/
│   ├── src/
│   ├── package.json
│   └── .env
├── web/
│   ├── src/
│   ├── package.json
│   └── .env
├── supabase/
├── README.md
└── .gitignore
```

## 🚀 Getting Started

### Prerequisites

Make sure you have installed:

- Node.js and npm
- Git
- FFmpeg and FFprobe
- A Groq API key
- A Coverr API key
- Supabase project credentials

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/CineFlowAI.git
```

Navigate to the project directory:

```bash
cd CineFlowAI
```

### 2. Install Backend Dependencies

```bash
cd server
npm install
```

### 3. Configure Backend Environment Variables

Create a `.env` file inside the `server` directory:

```env
PORT=8080
CLIENT_ORIGIN=http://localhost:5173

SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b

COVERR_API_KEY=your_coverr_api_key
```

Replace the placeholder values with your actual credentials.

**Never commit your `.env` file or expose your Supabase service-role key.**

### 4. Install Frontend Dependencies

Open a new terminal:

```bash
cd web
npm install
```

### 5. Configure Frontend Environment Variables

Create a `.env` file inside the `web` directory:

```env
VITE_API_URL=http://localhost:8080

VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Replace the placeholder values with your actual Supabase credentials.

### 6. Install FFmpeg

CineFlowAI requires FFmpeg and FFprobe for audio and video processing.

Verify the installation:

```bash
ffmpeg -version
ffprobe -version
```

Make sure both commands work in your terminal. If they are not recognized, add the FFmpeg `bin` directory to your system PATH and restart your terminal.

### 7. Run the Backend

From the `server` directory:

```bash
npm run dev
```

The backend should run at:

```text
http://localhost:8080
```

### 8. Run the Frontend

Open another terminal and navigate to the `web` directory:

```bash
npm run dev
```

Open the application in your browser:

```text
http://localhost:5173
```

## 🎥 How to Use

1. Open CineFlowAI in your browser.
2. Enter a topic or text prompt for your video.
3. Generate AI-powered video scenes.
4. Allow the application to find relevant stock footage.
5. Generate voiceover and captions.
6. Preview and generate your video.

## 🔐 Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Backend server port |
| `CLIENT_ORIGIN` | Frontend URL |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key |
| `GROQ_API_KEY` | Groq API key |
| `GROQ_MODEL` | Groq model used for scene generation |
| `COVERR_API_KEY` | Coverr API key |
| `VITE_API_URL` | Backend API URL used by frontend |
| `VITE_SUPABASE_URL` | Supabase project URL for frontend |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anon key |

## 🌱 Future Enhancements

- More AI voice options
- Additional video styles and templates
- Improved video editing controls
- More stock footage providers
- Enhanced multilingual support
- Export options for different video formats and resolutions

## 👨‍💻 Author

**Niketan R**

Computer and Communication Engineering  
Amrita Vishwa Vidyapeetham, Amaravati

## 📄 License

This project is developed for educational and demonstration purposes.
