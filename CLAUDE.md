# CLAUDE.md - Core Project Guidelines

## Essential Project Info
- Tech Stack: Node.js, Firebase (Firestore/Storage), Ableton/Ableset.
- Build Command: `npm run build`
- Test Command: `npm test`

## Non-Negotiable Rules
1. NEVER uncomment test blocks unless explicitly told.
2. ALWAYS use high timeouts for large downloads/commands.
3. PREFER existing DAO/utility functions over creating new ones.
4. Use "Iron Laws" tone: no apologies, just direct technical execution.

## Chord & Lyric Standards
- Use [Chord] inline notation: `[G]I found a [Em]love`.
- Use [[Note]] for performance footnotes.
- Use **Bold** for harmony sections (triggers PDF modal).

## Current Sprint: Song Details Page
- Priority 1: Implement "Stage Mode" layout (Full screen toggle).
- Priority 2: Build Regex-based parser for `[Chords]` and `**Harmonies**`.
- Priority 3: Connect PDF Modal to `chartUrl`.

## Performance Constraints
- Mobile-first: Singers will likely use iPads/Tablets. 
- Touch targets for footnotes must be at least 44x44px.

## Development Patterns
- ALL lyric rendering MUST pass through `src/utils/lyricParser.js`.
- DO NOT write inline regex for chords or harmonies in component files.
- When adding new features (like auto-scroll), reference the `Section Anchors` identified by the parser.
- For the "Song Details" UI, use the `html` output from `parseSongData` to populate a `dangerouslySetInnerHTML` container (or equivalent).