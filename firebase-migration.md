# 🎸 Ultraphonics Firebase Migration Checklist

## Phase 1: Project Initialization
- [ ] Install Firebase CLI (`npm install -g firebase-tools`)
- [ ] Run `firebase init` (Hosting, Firestore, Auth)
- [ ] Create `src/firebase-init.js` with provided config
- [ ] Add Firebase SDK CDN links to `index.html` and admin pages

## Phase 2: Data Migration
- [ ] Create `scripts/migrate-to-firestore.js`
- [ ] Migrate `content/songs.json` -> `songs` collection
- [ ] Migrate `content/shows.json` -> `shows` collection
- [ ] Migrate `content/setlists/*.json` -> `setlists` collection
- [ ] Verify data integrity in Firebase Console

## Phase 3: Authentication & Security
- [ ] Enable Email/Password Auth in Firebase Console
- [ ] Create initial admin account (e.g., info@ultraphonicsmusic.com)
- [ ] Replace GitHub token logic in `admin/index.html` with Auth state observer
- [ ] Implement Firestore Security Rules:
    - `shows`: Public Read / Admin Write
    - `songs`: Public Read / Admin Write
    - `setlists`: Public Read / Admin Write

## Phase 4: Refactor Admin Functionality
- [ ] **Show Manager** (`admin/show-manager.html`):
    - [ ] Replace `loadShows()` with Firestore listener
    - [ ] Replace `saveToGitHub()` with `setDoc()` or `addDoc()`
    - [ ] Replace `deleteShow()` with `deleteDoc()`
- [ ] **Setlist Builder** (`admin/setlist-builder.js`):
    - [ ] Update `fetchGithubFiles()` to fetch from `setlists` collection
    - [ ] Update save logic to write to Firestore instead of GitHub API

## Phase 5: Public Site Refactoring
- [ ] Update `src/main.js` (or relevant display script) to fetch shows from Firestore
- [ ] Update Setlist Viewer to fetch specific setlist IDs from Firestore

## Phase 6: Deployment & Cleanup
- [ ] Run `firebase deploy`
- [ ] Verify custom domain routing
- [ ] Remove legacy `content/*.json` files from repo
- [ ] Delete GitHub-specific helper functions and `scripts/upload_to_trello.sh`