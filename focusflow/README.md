# FocusFlow: Productivity & Pomodoro Hub

## Project Description

FocusFlow is a web-based productivity application designed to help users manage tasks and maintain focus using the Pomodoro Technique. It features a Kanban-style task board for organizing work and a built-in Pomodoro timer with ambient audio and dynamic UI themes.

## Features

- **Kanban Task Board**: Organize tasks into three columns (To Do, In Progress, Done)
- **Drag and Drop**: Easily move tasks between columns
- **Pomodoro Timer**: 25-minute focus sessions with 5-minute breaks
- **Dynamic Themes**: UI color changes during focus/break periods
- **Ambient Audio**: Background music during focus sessions
- **Task Management**: Add, edit, and delete tasks with descriptions

## Technologies Used

- **Backend**: Python Flask
- **Database**: SQLite
- **Frontend**: HTML, CSS, JavaScript
- **Styling**: Glassmorphism design with CSS backdrop-filter

## Installation

1. Clone or download the project files
2. Navigate to the project directory
3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
4. Initialize the database:
   ```
   python init_db.py
   ```
5. Run the application:
   - From command line: `python app.py`
   - Or double-click `run.vbs` to run without opening a terminal
6. The application will open in your default browser at `http://127.0.0.1:5000`

## Usage

- **Adding Tasks**: Use the form at the top to add new tasks
- **Moving Tasks**: Drag and drop tasks between columns
- **Deleting Tasks**: Click the × button on a task card
- **Pomodoro Timer**: Navigate to the Timer page for focused sessions
- **Analytics**: View task statistics on the Analytics page

## Audio Setup

To enable ambient audio during focus sessions, place an MP3 file named `lofi.mp3` in the `static/audio/` directory. You can find free lofi music online or use any looping audio file.

## File Structure

```
focusflow/
├── app.py                 # Main Flask application
├── init_db.py            # Database initialization script
├── requirements.txt      # Python dependencies
├── schema.sql           # Database schema
├── focusflow.db         # SQLite database (created on init)
├── README.md            # Project documentation
├── static/
│   ├── css/
│   │   └── index.css    # Stylesheet
│   ├── js/
│   │   └── app.js       # JavaScript for Kanban board
│   └── audio/           # Directory for ambient audio files
│       └── lofi.mp3     # Ambient music (add your own MP3)
└── templates/
    ├── layout.html      # Base template with navigation
    ├── index.html       # Kanban board page
    ├── timer.html       # Pomodoro timer page
    └── analytics.html   # Analytics dashboard page
```

## Design Notes

The application uses a glassmorphism design aesthetic with blurred backgrounds and translucent elements. The Pomodoro timer changes the color scheme to indicate focus vs. break periods, enhancing the user experience.

## Future Enhancements

- User authentication and accounts
- Task analytics and charts
- Customizable timer durations
- Multiple audio options
- Mobile app version

## Academic Integrity

This project was developed as part of a CS50 final project. All code is original unless otherwise noted in comments. No AI tools were used in the development of this application.

## Video Demo

[URL](https://youtu.be/hUwn6yaGk6Q)

## Author

[Mudassir Khan]
CS50 Student