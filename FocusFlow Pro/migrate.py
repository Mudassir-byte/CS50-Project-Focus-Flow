import sqlite3

conn = sqlite3.connect("focusflow.db")

# Get existing columns in tasks table
existing = [r[1] for r in conn.execute("PRAGMA table_info(tasks)").fetchall()]
print("Existing task columns:", existing)

# Add missing columns to tasks
if "priority" not in existing:
    conn.execute("ALTER TABLE tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium'")
    print("Added: priority")

if "tags" not in existing:
    conn.execute("ALTER TABLE tasks ADD COLUMN tags TEXT DEFAULT ''")
    print("Added: tags")

# Create new tables (IF NOT EXISTS is safe)
conn.executescript("""
CREATE TABLE IF NOT EXISTS sessions_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS streak_data (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    last_active DATE,
    streak INTEGER NOT NULL DEFAULT 0
);
""")

conn.execute("INSERT OR IGNORE INTO streak_data (id, last_active, streak) VALUES (1, NULL, 0)")
conn.commit()

tables = [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
cols   = [r[1] for r in conn.execute("PRAGMA table_info(tasks)").fetchall()]
print("Tables:", tables)
print("Task columns:", cols)
conn.close()
print("Migration complete.")
