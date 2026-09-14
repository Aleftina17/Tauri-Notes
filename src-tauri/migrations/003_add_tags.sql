CREATE TABLE IF NOT EXISTS tags (
                                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                                    name TEXT NOT NULL UNIQUE COLLATE NOCASE
);

CREATE TABLE IF NOT EXISTS note_tags (
                                         note_id INTEGER NOT NULL,
                                         tag_id INTEGER NOT NULL,
                                         PRIMARY KEY (note_id, tag_id)
    );