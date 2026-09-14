# Notes — offline desktop notes app

A personal notes app built with Tauri, React, and SQLite. Folders, tags,
rich text formatting, pinning, search, and drag-and-drop — all stored in a
single local SQLite file. No internet connection is required, ever,
including on first launch.

## Where your data lives

All notes are stored in one SQLite file, created automatically on first run:

| OS      | Path                                                  |
|---------|--------------------------------------------------------|
| Linux   | `~/.local/share/<bundle-identifier>/notes.db`          |
| macOS   | `~/Library/Application Support/<bundle-identifier>/notes.db` |
| Windows | `%APPDATA%\<bundle-identifier>\notes.db`               |

(`<bundle-identifier>` is the value of `identifier` in
`src-tauri/tauri.conf.json`, e.g. `com.yourname.notesapp`.)

It's a plain SQLite file — open it with any SQLite browser, back it up by
copying it, or sync it yourself with any file-sync tool of your choice.
The app itself does not sync or send data anywhere.

## Installing a pre-built package (Linux)

If you already have a built package, just install it like any other app:

```bash
# Debian/Ubuntu
sudo apt install ./notes-app_0.1.0_amd64.deb

# Fedora/openSUSE
sudo dnf install ./notes-app-0.1.0-1.x86_64.rpm

# Or run the AppImage directly, no installation needed
chmod +x notes-app_0.1.0_amd64.AppImage
./notes-app_0.1.0_amd64.AppImage
```

After installing the `.deb`/`.rpm`, launch the app from your application
menu (search for "Notes") like any other installed program.

## Building from source

### Prerequisites

Install these once per machine:

1. **Node.js** 18+ — https://nodejs.org
2. **Rust** — https://www.rust-lang.org/tools/install
3. **Platform system dependencies** for Tauri — see
   https://v2.tauri.app/start/prerequisites/ for your OS.
   On Ubuntu/Debian:

   ```bash
   sudo apt update
   sudo apt install -y \
     libwebkit2gtk-4.1-dev \
     build-essential \
     curl \
     wget \
     file \
     libxdo-dev \
     libssl-dev \
     libayatana-appindicator3-dev \
     librsvg2-dev
   ```

### Development mode

```bash
npm install
npx tauri dev
```

This opens the app in a native window with hot reload — any change to
`src/*.tsx` is reflected immediately without restarting.

### Production build

```bash
npx tauri build
```

Produces platform-native installers in
`src-tauri/target/release/bundle/` (`.deb`, `.rpm`, and `.AppImage` on
Linux; `.app`/`.dmg` on macOS; `.msi`/`.exe` on Windows). These are fully
self-contained — no Node, Rust, or internet connection needed to run them
on another machine of the same OS.

## Changing the app icon

Prepare a square PNG, ideally 1024×1024, then run:

```bash
npx tauri icon path/to/your-icon.png
```

This regenerates every icon size and format required (`.ico`, `.icns`,
and the various PNGs) inside `src-tauri/icons/`. Rebuild the app
afterwards for the new icon to take effect.

## Project structure

```
src/                      React frontend
  db.ts                    All SQLite access (the only file with SQL queries)
  types.ts                 Folder / Note / Tag types
  App.tsx                  Main layout and state
  Editor.tsx               Rich text editor (Tiptap)
  Dialog.tsx               Custom prompt/confirm dialogs
  styles.css               All styling (CSS variables control the theme)
src-tauri/                 Rust side of Tauri
  src/main.rs, lib.rs      Plugin registration, SQL migrations
  migrations/*.sql         Database schema, one file per migration
  tauri.conf.json          Window, build, and bundle configuration
  capabilities/default.json  Frontend permissions for the SQL plugin
  icons/                   App icons
```