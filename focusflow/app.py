import os
from flask import Flask, render_template, request, session, redirect, jsonify
from flask_session import Session
from werkzeug.security import check_password_hash, generate_password_hash
import sqlite3
import json
import webbrowser

# Configure application
app = Flask(__name__)

# Configure session to use filesystem (instead of signed cookies)
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

# Database helper
def get_db():
    db = sqlite3.connect("focusflow.db")
    db.row_factory = sqlite3.Row
    return db

@app.after_request
def after_request(response):
    """Ensure responses aren't cached"""
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Expires"] = 0
    response.headers["Pragma"] = "no-cache"
    return response

@app.route("/")
def index():
    """Main dashboard with Kanban board"""
    db = get_db()
    tasks = db.execute("SELECT * FROM tasks ORDER BY created_at DESC").fetchall()
    db.close()

    # Group tasks by status
    todo = [dict(task) for task in tasks if task['status'] == 'todo']
    doing = [dict(task) for task in tasks if task['status'] == 'doing']
    done = [dict(task) for task in tasks if task['status'] == 'done']

    return render_template("index.html", todo=todo, doing=doing, done=done)

@app.route("/add_task", methods=["POST"])
def add_task():
    """Add a new task"""
    title = request.form.get("title")
    description = request.form.get("description", "")

    if not title:
        return jsonify({"error": "Title is required"}), 400

    db = get_db()
    cursor = db.cursor()
    cursor.execute("INSERT INTO tasks (title, description, status) VALUES (?, ?, 'todo')", (title, description))
    task_id = cursor.lastrowid
    db.commit()
    db.close()

    return jsonify({"success": True, "id": task_id, "title": title, "description": description, "pomodoros": 0})

@app.route("/update_task_status", methods=["POST"])
def update_task_status():
    """Update task status (for drag and drop)"""
    task_id = request.form.get("id")
    status = request.form.get("status")

    if not task_id or not status:
        return jsonify({"error": "Task ID and status are required"}), 400

    db = get_db()
    db.execute("UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (status, task_id))
    db.commit()
    db.close()

    return jsonify({"success": True})

@app.route("/edit_task", methods=["POST"])
def edit_task():
    """Edit an existing task"""
    task_id = request.form.get("id")
    title = request.form.get("title")
    description = request.form.get("description", "")

    if not task_id or not title:
        return jsonify({"error": "Task ID and Title are required"}), 400

    db = get_db()
    db.execute("UPDATE tasks SET title = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (title, description, task_id))
    db.commit()
    db.close()

    return jsonify({"success": True})

@app.route("/increment_pomodoro", methods=["POST"])
def increment_pomodoro():
    """Increment pomodoro count for a task"""
    task_id = request.form.get("id")

    if not task_id:
        return jsonify({"error": "Task ID is required"}), 400

    db = get_db()
    db.execute("UPDATE tasks SET pomodoros = pomodoros + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (task_id,))
    db.commit()
    db.close()

    return jsonify({"success": True})

@app.route("/delete_task", methods=["POST"])
def delete_task():
    """Delete a task"""
    task_id = request.form.get("id")

    if not task_id:
        return jsonify({"error": "Task ID is required"}), 400

    db = get_db()
    db.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    db.commit()
    db.close()

    return jsonify({"success": True})

@app.route("/timer")
def timer():
    """Pomodoro timer page"""
    task_id = request.args.get("task_id")
    task = None
    if task_id:
        db = get_db()
        task = db.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        if task:
            task = dict(task)
        db.close()
    return render_template("timer.html", task=task)

@app.route("/analytics")
def analytics():
    """Analytics dashboard"""
    db = get_db()
    tasks = db.execute("SELECT status, COUNT(*) as count FROM tasks GROUP BY status").fetchall()
    
    # Trend data (tasks completed over time)
    trends = db.execute("""
        SELECT date(updated_at) as date, COUNT(*) as count 
        FROM tasks 
        WHERE status = 'done' 
        GROUP BY date(updated_at)
        ORDER BY date(updated_at) ASC
        LIMIT 7
    """).fetchall()
    db.close()

    # Prepare data for Chart.js
    labels = [row['status'].capitalize() for row in tasks]
    data = [row['count'] for row in tasks]
    
    trend_labels = [row['date'] for row in trends]
    trend_data = [row['count'] for row in trends]

    return render_template("analytics.html", labels=json.dumps(labels), data=json.dumps(data), trend_labels=json.dumps(trend_labels), trend_data=json.dumps(trend_data))

@app.route("/logout")
def logout():
    """Log out (clear session)"""
    session.clear()
    return redirect("/")

if __name__ == "__main__":
    webbrowser.open("http://127.0.0.1:5000")
    app.run(debug=True, use_reloader=False)