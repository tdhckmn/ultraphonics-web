# Skill: Lyric Parser & Chord Aligner

## Description
Converts "Chord-over-Lyric" text into the "Inline-Chord" `[Chord]` format.

## Logic Flow
1. Identify "Chord Lines" (lines containing primarily G, C, D, Em, etc.).
2. Map the index of each chord to the character index of the "Lyric Line" immediately below it.
3. Inject the chord into the lyric string inside `[]` brackets.
4. Detect `[Chorus]` or `[Verse]` headers and ensure they are on their own line.
5. Wrap any line containing "Harmony" or "Bkgd" in `**` symbols.

## Usage
Trigger this when the user provides a raw text chart or PDF export to "Import into Library."