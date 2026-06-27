CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo',
    priority TEXT NOT NULL DEFAULT 'medium',
    tags TEXT DEFAULT '',
    pomodoros INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tracks number of pomodoro sessions completed each day
CREATE TABLE IF NOT EXISTS sessions_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,   -- ISO date: YYYY-MM-DD
    count INTEGER NOT NULL DEFAULT 0
);

-- Tracks the user's streak
CREATE TABLE IF NOT EXISTS streak_data (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    last_active DATE,
    streak INTEGER NOT NULL DEFAULT 0
);