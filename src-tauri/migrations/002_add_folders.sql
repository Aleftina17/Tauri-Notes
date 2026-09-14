CREATE TABLE IF NOT EXISTS folders (
                                       id INTEGER PRIMARY KEY AUTOINCREMENT,
                                       name TEXT NOT NULL,
                                       created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

ALTER TABLE notes ADD COLUMN folder_id INTEGER;