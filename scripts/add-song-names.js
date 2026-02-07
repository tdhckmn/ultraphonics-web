/**
 * Migration Script: Add 'name' field to songs
 *
 * This script adds a clean 'name' property to each song in Firebase.
 * The name is derived from lastKnownName by:
 * 1. Removing the " - <key>" suffix (e.g., " - Gm", " - C", " - F#m")
 * 2. Converting to sentence case
 *
 * HOW TO RUN:
 * 1. Open any admin page (e.g., setlist-manager.html) in browser
 * 2. Sign in with Google
 * 3. Open browser console (F12 or Cmd+Option+I)
 * 4. Copy and paste this entire script
 * 5. Run: migrateSongNames()
 */

/**
 * Converts a string to sentence case (first letter uppercase, rest lowercase)
 * Preserves words that are commonly capitalized (e.g., "I", acronyms)
 */
function toSentenceCase(str) {
    if (!str) return '';

    // Common words that should stay capitalized
    const preserveCase = ['I', 'II', 'III', 'IV', 'DJ', 'TV', 'USA', 'UK', 'NYC', 'LA', 'AC/DC'];

    // Split into words
    const words = str.split(' ');

    return words.map((word, index) => {
        // Preserve specific words
        if (preserveCase.includes(word.toUpperCase())) {
            return word.toUpperCase();
        }

        // Handle contractions and apostrophes (e.g., "Don't", "I'm")
        if (word.includes("'")) {
            const parts = word.split("'");
            return parts.map((p, i) => {
                if (i === 0) {
                    return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
                }
                return p.toLowerCase();
            }).join("'");
        }

        // First word or proper noun - capitalize first letter
        if (index === 0) {
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }

        // Other words - title case (each word capitalized)
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
}

/**
 * Extracts clean name from lastKnownName by removing " - <key>" suffix
 * Keys are typically: C, D, E, F, G, A, B followed by optional # or b, and optional m (minor)
 */
function extractCleanName(lastKnownName) {
    if (!lastKnownName) return '';

    // Pattern matches " - " followed by a musical key at the end
    // Keys: A-G, optionally followed by # or b, optionally followed by m (minor)
    // Examples: " - C", " - Gm", " - F#", " - Bbm", " - F#m"
    const keyPattern = / - [A-G][#b]?m?$/i;

    const cleanName = lastKnownName.replace(keyPattern, '');

    return toSentenceCase(cleanName.trim());
}

/**
 * Main migration function
 */
async function migrateSongNames() {
    if (!window.FirestoreService) {
        console.error('FirestoreService not available. Make sure you are on an admin page.');
        return;
    }

    if (!window.FirebaseAuth?.isAuthenticated()) {
        console.error('Not authenticated. Please sign in first.');
        return;
    }

    console.log('Starting migration...');

    try {
        // Get all songs
        const songs = await window.FirestoreService.getSongs();
        console.log(`Found ${songs.length} songs to process`);

        let updated = 0;
        let skipped = 0;

        for (const song of songs) {
            const lastKnownName = song.lastKnownName || song.title || song.name || '';

            if (!lastKnownName) {
                console.warn(`Skipping song ${song.id}: no name found`);
                skipped++;
                continue;
            }

            const cleanName = extractCleanName(lastKnownName);

            // Skip if name would be empty or same as existing
            if (!cleanName) {
                console.warn(`Skipping song ${song.id}: could not extract clean name from "${lastKnownName}"`);
                skipped++;
                continue;
            }

            // Only update if name is different or doesn't exist
            if (song.name !== cleanName) {
                console.log(`Updating: "${lastKnownName}" -> "${cleanName}"`);

                await window.FirestoreService.saveSong({
                    ...song,
                    name: cleanName
                });

                updated++;
            } else {
                console.log(`Already set: "${song.id}" = "${cleanName}"`);
                skipped++;
            }
        }

        console.log(`\nMigration complete!`);
        console.log(`Updated: ${updated}`);
        console.log(`Skipped: ${skipped}`);

    } catch (error) {
        console.error('Migration failed:', error);
    }
}

// Export for use
window.migrateSongNames = migrateSongNames;
window.extractCleanName = extractCleanName;
window.toSentenceCase = toSentenceCase;

console.log('Migration script loaded. Run migrateSongNames() to start.');
