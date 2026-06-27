import sqlite3

# Connect to database
conn = sqlite3.connect('focusflow.db')

# Read schema
with open('schema.sql', 'r') as f:
    schema = f.read()

# Execute schema
conn.executescript(schema)

# Close connection
conn.close()

print("Database initialized.")