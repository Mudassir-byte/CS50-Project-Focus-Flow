import os
import json
import sqlite3
import webbrowser
from datetime import date, timedelta

import requests
from flask import Flask, render_template, request, session, redirect, jsonify, g
from flask_session import Session
from werkzeug.security import check_password_hash, generate_password_hash

# Load .env if present
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ─────────────────────────────────────────────
# APP CONFIGURATION
# ─────────────────────────────────────────────

app = Flask(__name__)
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

DB_PATH = os.path.join(os.path.dirname(__file__), "focusflow.db")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")


# ─────────────────────────────────────────────
# DATABASE HELPERS
# ─────────────────────────────────────────────

def get_db():
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    return db


def init_db():
    """Create all tables if they don't already exist."""
    db = get_db()
    schema = os.path.join(os.path.dirname(__file__), "schema.sql")
    with open(schema, "r") as f:
        db.executescript(f.read())
    # Ensure singleton streak row exists
    db.execute(
        "INSERT OR IGNORE INTO streak_data (id, last_active, streak) VALUES (1, NULL, 0)"
    )
    db.commit()
    db.close()


# Run on startup
with app.app_context():
    init_db()


@app.after_request
def after_request(response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Expires"] = 0
    response.headers["Pragma"] = "no-cache"
    return response


# ─────────────────────────────────────────────
# UTILITY
# ─────────────────────────────────────────────

PRIORITY_ORDER = {"urgent": 0, "high": 1, "medium": 2, "low": 3}


def priority_sort_key(task):
    rank = PRIORITY_ORDER.get(task.get("priority", "medium"), 2)
    return (rank, task.get("updated_at") or task.get("created_at") or "")


def get_sidebar_stats():
    """Return dict with streak, today_sessions, active_count."""
    db = get_db()
    today = date.today().isoformat()
    row = db.execute(
        "SELECT count FROM sessions_log WHERE date = ?", (today,)
    ).fetchone()
    today_sessions = row["count"] if row else 0

    streak_row = db.execute("SELECT streak FROM streak_data WHERE id = 1").fetchone()
    streak = streak_row["streak"] if streak_row else 0

    active_count = db.execute(
        "SELECT COUNT(*) as c FROM tasks WHERE status != 'done'"
    ).fetchone()["c"]

    db.close()
    return {"streak": streak, "today_sessions": today_sessions, "active_count": active_count}


# ─────────────────────────────────────────────
# ROUTES — PAGES
# ─────────────────────────────────────────────

@app.route("/")
def index():
    db = get_db()
    tasks = db.execute("SELECT * FROM tasks ORDER BY created_at DESC").fetchall()
    db.close()

    todo  = sorted([dict(t) for t in tasks if t["status"] == "todo"],  key=priority_sort_key)
    doing = sorted([dict(t) for t in tasks if t["status"] == "doing"], key=priority_sort_key)
    done  = sorted([dict(t) for t in tasks if t["status"] == "done"],  key=priority_sort_key)

    stats = get_sidebar_stats()
    return render_template("index.html", todo=todo, doing=doing, done=done, **stats)


@app.route("/timer")
def timer():
    task_id = request.args.get("task_id")
    task = None
    db = get_db()
    if task_id:
        row = db.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        if row:
            task = dict(row)
    tasks = [dict(r) for r in db.execute(
        "SELECT id, title, status FROM tasks WHERE status != 'done' ORDER BY created_at DESC"
    ).fetchall()]
    db.close()
    stats = get_sidebar_stats()
    return render_template("timer.html", task=task, tasks=tasks, **stats)


@app.route("/analytics")
def analytics():
    db = get_db()

    # Status counts
    status_rows = db.execute(
        "SELECT status, COUNT(*) as count FROM tasks GROUP BY status"
    ).fetchall()

    # Priority counts
    priority_rows = db.execute(
        "SELECT priority, COUNT(*) as count FROM tasks GROUP BY priority"
    ).fetchall()

    # Total pomodoros
    pomodoros_total = db.execute(
        "SELECT COALESCE(SUM(pomodoros), 0) as total FROM tasks"
    ).fetchone()["total"]

    # Trend: tasks completed over last 7 days
    trends = db.execute("""
        SELECT date(updated_at) as d, COUNT(*) as count
        FROM tasks
        WHERE status = 'done'
        GROUP BY date(updated_at)
        ORDER BY date(updated_at) ASC
        LIMIT 7
    """).fetchall()

    # Weekly sessions from sessions_log (last 7 days)
    today = date.today()
    week_days = [(today - timedelta(days=i)).isoformat() for i in range(6, -1, -1)]
    session_rows = db.execute(
        "SELECT date, count FROM sessions_log WHERE date >= ?", (week_days[0],)
    ).fetchall()
    session_map = {r["date"]: r["count"] for r in session_rows}
    weekly_sessions = [{"d": d[-5:], "v": session_map.get(d, 0)} for d in week_days]

    # Per-task pomodoros
    pom_tasks = db.execute(
        "SELECT title, pomodoros FROM tasks WHERE pomodoros > 0 ORDER BY pomodoros DESC LIMIT 10"
    ).fetchall()

    # Streak
    streak_row = db.execute("SELECT streak FROM streak_data WHERE id = 1").fetchone()
    streak = streak_row["streak"] if streak_row else 0

    db.close()

    priority_totals = {"urgent": 0, "high": 0, "medium": 0, "low": 0}
    for row in priority_rows:
        key = row["priority"] if row["priority"] in priority_totals else "medium"
        priority_totals[key] = row["count"]

    labels = [row["status"].capitalize() for row in status_rows]
    data   = [row["count"] for row in status_rows]

    trend_labels = [row["d"] for row in trends]
    trend_data   = [row["count"] for row in trends]

    stats = get_sidebar_stats()
    stats["streak"] = streak  # use the analytics-computed streak (same source, just explicit)
    return render_template(
        "analytics.html",
        labels=json.dumps(labels),
        data=json.dumps(data),
        trend_labels=json.dumps(trend_labels),
        trend_data=json.dumps(trend_data),
        priority_labels=json.dumps(["Urgent", "High", "Medium", "Low"]),
        priority_data=json.dumps([
            priority_totals["urgent"], priority_totals["high"],
            priority_totals["medium"], priority_totals["low"]
        ]),
        pomodoros_total=pomodoros_total,
        weekly_sessions=json.dumps(weekly_sessions),
        pom_tasks=json.dumps([{"name": r["title"][:22] + ("…" if len(r["title"]) > 22 else ""), "v": r["pomodoros"]} for r in pom_tasks]),
        **stats,
    )


@app.route("/ai")
def ai():
    stats = get_sidebar_stats()
    has_api_key = bool(ANTHROPIC_API_KEY)
    return render_template("ai.html", has_api_key=has_api_key, **stats)


# ─────────────────────────────────────────────
# ROUTES — TASK API
# ─────────────────────────────────────────────

@app.route("/add_task", methods=["POST"])
def add_task():
    title       = request.form.get("title", "").strip()
    description = request.form.get("description", "")
    priority    = request.form.get("priority", "medium")
    tags        = request.form.get("tags", "")
    status      = request.form.get("status", "todo")

    if not title:
        return jsonify({"error": "Title is required"}), 400

    db = get_db()
    cur = db.cursor()
    cur.execute(
        "INSERT INTO tasks (title, description, status, priority, tags) VALUES (?, ?, ?, ?, ?)",
        (title, description, status, priority, tags),
    )
    task_id = cur.lastrowid
    db.commit()
    db.close()

    return jsonify({
        "success": True, "id": task_id, "title": title,
        "description": description, "priority": priority,
        "tags": tags, "pomodoros": 0, "status": status,
    })


@app.route("/update_task_status", methods=["POST"])
def update_task_status():
    task_id = request.form.get("id")
    status  = request.form.get("status")
    if not task_id or not status:
        return jsonify({"error": "Task ID and status are required"}), 400
    db = get_db()
    db.execute(
        "UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (status, task_id),
    )
    db.commit()
    db.close()
    return jsonify({"success": True})


@app.route("/edit_task", methods=["POST"])
def edit_task():
    task_id     = request.form.get("id")
    title       = request.form.get("title", "").strip()
    description = request.form.get("description", "")
    priority    = request.form.get("priority", "medium")
    tags        = request.form.get("tags", "")
    if not task_id or not title:
        return jsonify({"error": "Task ID and Title are required"}), 400
    db = get_db()
    db.execute(
        "UPDATE tasks SET title=?, description=?, priority=?, tags=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
        (title, description, priority, tags, task_id),
    )
    db.commit()
    db.close()
    return jsonify({"success": True})


@app.route("/increment_pomodoro", methods=["POST"])
def increment_pomodoro():
    task_id = request.form.get("id")
    if not task_id:
        return jsonify({"error": "Task ID is required"}), 400
    db = get_db()
    db.execute(
        "UPDATE tasks SET pomodoros = pomodoros + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (task_id,),
    )
    db.commit()
    db.close()
    return jsonify({"success": True})


@app.route("/delete_task", methods=["POST"])
def delete_task():
    task_id = request.form.get("id")
    if not task_id:
        return jsonify({"error": "Task ID is required"}), 400
    db = get_db()
    db.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    db.commit()
    db.close()
    return jsonify({"success": True})


# ─────────────────────────────────────────────
# ROUTES — SESSION / STREAK API
# ─────────────────────────────────────────────

@app.route("/log_session", methods=["POST"])
def log_session():
    """Called by JS when a focus pomodoro completes."""
    today = date.today().isoformat()
    yesterday = (date.today() - timedelta(days=1)).isoformat()

    db = get_db()

    # Upsert today's session count
    db.execute("""
        INSERT INTO sessions_log (date, count) VALUES (?, 1)
        ON CONFLICT(date) DO UPDATE SET count = count + 1
    """, (today,))

    # Update streak
    row = db.execute("SELECT last_active, streak FROM streak_data WHERE id = 1").fetchone()
    if row:
        last = row["last_active"]
        streak = row["streak"]
        if last == today:
            pass  # already active today
        elif last == yesterday:
            streak += 1
        else:
            streak = 1
        db.execute(
            "UPDATE streak_data SET last_active = ?, streak = ? WHERE id = 1",
            (today, streak),
        )
    else:
        db.execute(
            "INSERT INTO streak_data (id, last_active, streak) VALUES (1, ?, 1)", (today,)
        )

    db.commit()
    db.close()
    return jsonify({"success": True})


@app.route("/get_stats")
def get_stats():
    return jsonify(get_sidebar_stats())


# ─────────────────────────────────────────────
# ROUTES — AI PROXY
# ─────────────────────────────────────────────

@app.route("/ai_chat", methods=["POST"])
def ai_chat():
    data = request.get_json(force=True)
    messages = data.get("messages", [])
    api_key = data.get("api_key") or ANTHROPIC_API_KEY

    if not api_key:
        return jsonify({"error": "No API key configured. Set ANTHROPIC_API_KEY in .env"}), 401

    # Build task context from DB
    db = get_db()
    tasks = db.execute("SELECT title, description, status, priority FROM tasks").fetchall()
    db.close()
    task_ctx = "\n".join(
        f"[{t['status']}][{t['priority']}] {t['title']}"
        + (f" — {t['description']}" if t["description"] else "")
        for t in tasks
    )

    system_prompt = (
        "You are FocusFlow's embedded AI productivity coach. "
        f"The user's current tasks:\n{task_ctx}\n\n"
        "Be warm, practical, and concise (under 120 words). "
        "Help with: task breakdowns, prioritization, focus strategies, procrastination, break activities. "
        "Use emojis sparingly."
    )

    try:
        resp = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-sonnet-4-5",
                "max_tokens": 400,
                "system": system_prompt,
                "messages": messages,
            },
            timeout=30,
        )
        resp.raise_for_status()
        reply = resp.json()["content"][0]["text"]
        return jsonify({"reply": reply})
    except requests.exceptions.HTTPError as e:
        return jsonify({"error": str(e)}), 502
    except Exception as e:
        return jsonify({"error": "Connection issue — " + str(e)}), 500


# ─────────────────────────────────────────────
# MISC
# ─────────────────────────────────────────────

@app.route("/logout")
def logout():
    session.clear()
    return redirect("/")


if __name__ == "__main__":
    webbrowser.open("http://127.0.0.1:5000")
    app.run(debug=True, use_reloader=False)