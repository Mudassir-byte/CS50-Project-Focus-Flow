# FocusFlow 🎯

> A sleek, web-based productivity hub combining a Kanban task board, Pomodoro timer, analytics dashboard, and an AI productivity coach — all in one place.

![Python](https://img.shields.io/badge/Python-3.9%2B-blue?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.1.0-black?logo=flask&logoColor=white)
![SQLite](https://img.shields.io/badge/Database-SQLite-lightblue?logo=sqlite)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Features

| Feature | Description |
|---|---|
| 📋 **Kanban Board** | Drag-and-drop tasks across *To Do*, *In Progress*, and *Done* columns |
| ⏱️ **Pomodoro Timer** | 25-minute focus sessions with 5-minute short breaks & 15-minute long breaks |
| 🎨 **Dynamic Themes** | UI color scheme shifts between focus mode and break mode |
| 🎵 **Ambient Audio** | Optional lofi background music during focus sessions |
| 📊 **Analytics Dashboard** | Charts for task status, priority distribution, weekly sessions, and per-task pomodoros |
| 🔥 **Streak Tracking** | Daily activity streaks to keep you motivated |
| 🤖 **AI Productivity Coach** | Embedded Claude-powered assistant for task breakdowns, prioritization tips, and focus strategies |
| 🏷️ **Tags & Priorities** | Tag tasks and set urgency levels (Urgent / High / Medium / Low) |

---

## 🛠️ Technologies

- **Backend**: Python · Flask · Flask-Session
- **Database**: SQLite (via Python `sqlite3`)
- **Frontend**: HTML5 · Vanilla CSS · JavaScript (no framework)
- **AI**: [Anthropic Claude API](https://docs.anthropic.com/) (`claude-sonnet-4-5`)
- **Design**: Glassmorphism with CSS `backdrop-filter`

---

## 🚀 Installation

### Prerequisites

- Python 3.9 or higher
- `pip` (Python package manager)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/focusflow.git
cd focusflow

# 2. (Recommended) Create and activate a virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment variables (see Configuration section below)
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux
# Then open .env and fill in your API key

# 5. Run the application
python app.py
```

The app will open automatically in your default browser at **http://127.0.0.1:5000**

> **Note**: The SQLite database (`focusflow.db`) is created automatically on first run — no manual initialization needed.

---

## ⚙️ Configuration

FocusFlow uses a `.env` file for secrets. Copy `.env.example` to `.env` and fill in the values:

```env
ANTHROPIC_API_KEY=your_claude_api_key_here
```

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Optional | Enables the AI Productivity Coach. Get a key at [console.anthropic.com](https://console.anthropic.com) |

> If no API key is set, all features except the AI coach will work normally.

---

## 🎵 Audio Setup

To enable ambient audio during focus sessions:

1. Obtain a lofi/ambient MP3 (e.g., from [YouTube Audio Library](https://studio.youtube.com/channel/UCxxxxxx/music), [Pixabay](https://pixabay.com/music/), or your own library)
2. Rename the file to `lofi.mp3`
3. Place it at `static/audio/lofi.mp3`

The timer page will automatically detect and play the file when a focus session starts.

---

## 📁 File Structure

```
focusflow/
├── app.py                 # Main Flask application & all routes
├── schema.sql             # Database schema (auto-applied on startup)
├── init_db.py             # Standalone database initializer (optional)
├── migrate.py             # Migration script for adding columns to existing DBs
├── requirements.txt       # Python dependencies (pinned versions)
├── .env.example           # Environment variable template
├── .gitignore             # Git ignore rules
├── LICENSE                # MIT License
├── README.md              # Project documentation
├── run.bat                # Windows: run app from command line
├── run.vbs                # Windows: run app silently (no terminal window)
├── static/
│   ├── css/
│   │   └── index.css      # Main stylesheet (glassmorphism design)
│   ├── js/
│   │   └── app.js         # Frontend JS (Kanban, drag-drop, API calls)
│   └── audio/
│       └── lofi.mp3       # Ambient music — add your own (not included)
└── templates/
    ├── layout.html        # Base template with sidebar navigation
    ├── index.html         # Kanban task board
    ├── timer.html         # Pomodoro timer
    ├── analytics.html     # Analytics dashboard
    └── ai.html            # AI productivity coach
```

---

## 📖 Usage

### Task Management
- **Add a task** using the form on the Kanban board — set title, description, priority, and tags
- **Move tasks** by dragging and dropping between *To Do*, *In Progress*, and *Done*
- **Edit / Delete** tasks using the action buttons on each card

### Pomodoro Timer
- Select a task to focus on from the dropdown
- Hit **Start** to begin a 25-minute focus session
- When the session ends, the timer automatically logs the pomodoro and updates your streak

### AI Coach
- Navigate to the **AI** page
- Chat with the AI productivity coach — it has full context of all your current tasks
- Ask for help with prioritization, breaking down tasks, focus strategies, or procrastination tips

### Analytics
- View charts for task status distribution, priority breakdown, and weekly session activity
- Track your daily productivity streak

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

---

## 🗺️ Roadmap

- [ ] User authentication & multi-user support
- [ ] Customizable timer durations (in-app settings)
- [ ] Multiple ambient audio tracks with in-app switcher
- [ ] Task due dates & calendar view
- [ ] Mobile-responsive layout improvements
- [ ] Export analytics as PDF/CSV
- [ ] Dark / Light theme toggle

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 🎬 Video Demo

[▶ Watch on YouTube](https://youtu.be/hUwn6yaGk6Q)

---

## 👤 Author

**Mudassir Khan**  
Final Year CS Student  
Semester 8 — Final Project