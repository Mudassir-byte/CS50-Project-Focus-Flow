import sqlite3

try:
    conn = sqlite3.connect('focusflow.db')
    cursor = conn.cursor()
    cursor.execute("ALTER TABLE tasks ADD COLUMN pomodoros INTEGER DEFAULT 0;")
    conn.commit()
    print("Migration successful: added pomodoros column")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e).lower():
        print("Column already exists")
    else:
        print(f"Error: {e}")
finally:
    conn.close()
