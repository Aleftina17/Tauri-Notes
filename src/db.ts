import Database from "@tauri-apps/plugin-sql";

let dbPromise: Promise<Database> | null = null;
function getDb() {
    if (!dbPromise) dbPromise = Database.load("sqlite:notes.db");
    return dbPromise;
}

export interface Note {
    id: number;
    title: string;
    content: string;
    folder_id: number | null;
    is_pinned: number;
    created_at: string;
    updated_at: string;
}

export interface Folder {
    id: number;
    name: string;
    created_at: string;
}

export interface Tag {
    id: number;
    name: string;
}

export interface ListNotesOptions {
    folderId?: number | null;
    search?: string;
    tagId?: number;
}

export async function listNotes(opts: ListNotesOptions = {}): Promise<Note[]> {
    const db = await getDb();
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (opts.folderId !== undefined) {
        if (opts.folderId === null) {
            clauses.push("folder_id IS NULL");
        } else {
            params.push(opts.folderId);
            clauses.push(`folder_id = $${params.length}`);
        }
    }
    if (opts.search && opts.search.trim()) {
        params.push(`%${opts.search.trim()}%`);
        const idx = params.length;
        clauses.push(`(title LIKE $${idx} OR content LIKE $${idx})`);
    }
    if (opts.tagId !== undefined) {
        params.push(opts.tagId);
        clauses.push(
            `id IN (SELECT note_id FROM note_tags WHERE tag_id = $${params.length})`
        );
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    return db.select<Note[]>(
        `SELECT * FROM notes ${where} ORDER BY is_pinned DESC, updated_at DESC`,
        params
    );
}

export async function createNote(folderId: number | null): Promise<number> {
    const db = await getDb();
    const result = await db.execute(
        "INSERT INTO notes (title, content, folder_id) VALUES ('', '', $1)",
        [folderId]
    );
    return result.lastInsertId as number;
}

export async function updateNote(
    id: number,
    fields: { title?: string; content?: string; folder_id?: number | null }
): Promise<void> {
    const db = await getDb();
    const keys = Object.keys(fields) as (keyof typeof fields)[];
    if (keys.length === 0) return;
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
    const values = keys.map((k) => fields[k]);
    await db.execute(
        `UPDATE notes SET ${setClause}, updated_at = datetime('now') WHERE id = $${keys.length + 1}`,
        [...values, id]
    );
}

export async function deleteNote(id: number): Promise<void> {
    const db = await getDb();
    await db.execute("DELETE FROM note_tags WHERE note_id = $1", [id]);
    await db.execute("DELETE FROM notes WHERE id = $1", [id]);
}

export async function togglePin(id: number, pinned: boolean): Promise<void> {
    const db = await getDb();
    await db.execute("UPDATE notes SET is_pinned = $1 WHERE id = $2", [pinned ? 1 : 0, id]);
}

export async function listFolders(): Promise<Folder[]> {
    const db = await getDb();
    return db.select<Folder[]>("SELECT * FROM folders ORDER BY name COLLATE NOCASE ASC");
}

export async function createFolder(name: string): Promise<void> {
    const db = await getDb();
    await db.execute("INSERT INTO folders (name) VALUES ($1)", [name]);
}

export async function renameFolder(id: number, name: string): Promise<void> {
    const db = await getDb();
    await db.execute("UPDATE folders SET name = $1 WHERE id = $2", [name, id]);
}

export async function deleteFolder(id: number): Promise<void> {
    const db = await getDb();
    await db.execute("UPDATE notes SET folder_id = NULL WHERE folder_id = $1", [id]);
    await db.execute("DELETE FROM folders WHERE id = $1", [id]);
}

export async function getTagsForNote(noteId: number): Promise<Tag[]> {
    const db = await getDb();
    return db.select<Tag[]>(
        `SELECT t.* FROM tags t
                             JOIN note_tags nt ON nt.tag_id = t.id
         WHERE nt.note_id = $1
         ORDER BY t.name COLLATE NOCASE ASC`,
        [noteId]
    );
}

export async function listAllTags(): Promise<Tag[]> {
    const db = await getDb();
    return db.select<Tag[]>("SELECT * FROM tags ORDER BY name COLLATE NOCASE ASC");
}

export async function setTagsForNote(noteId: number, tagNames: string[]): Promise<void> {
    const db = await getDb();
    await db.execute("DELETE FROM note_tags WHERE note_id = $1", [noteId]);
    for (const raw of tagNames) {
        const name = raw.trim();
        if (!name) continue;
        await db.execute("INSERT OR IGNORE INTO tags (name) VALUES ($1)", [name]);
        const rows = await db.select<Tag[]>(
            "SELECT * FROM tags WHERE name = $1 COLLATE NOCASE",
            [name]
        );
        if (rows[0]) {
            await db.execute(
                "INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES ($1, $2)",
                [noteId, rows[0].id]
            );
        }
    }
}

export async function pruneUnusedTags(): Promise<void> {
    const db = await getDb();
    await db.execute(
        "DELETE FROM tags WHERE id NOT IN (SELECT DISTINCT tag_id FROM note_tags)"
    );
}