/**
 * Utility to parse and transform band-specific lyric syntax
 */

export const NOTES_REGEX = /\[\[(.*?)\]\]/g;
export const HARMONY_REGEX = /\*\*(.*?)\*\*/g;
export const CHORD_REGEX = /\[(.*?)\]/g;

/**
 * Transposes a chord string by a set number of semitones
 * (Simplified logic - recommend using 'tonal' or 'chord-stepper' library for production)
 */
export const transposeChord = (chord, semitones) => {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  // Implementation logic here to shift chord based on semitones
  return chord; // Returns transposed or concert chord
};

/**
 * Parses raw text into a structured object for the UI
 */
export const parseSongData = (rawText, isGuitarMode = false, capo = 0) => {
  let notes = [];
  let lyricHtml = rawText;

  // 1. Extract and Index Footnotes [[Note]]
  lyricHtml = lyricHtml.replace(NOTES_REGEX, (match, content) => {
    notes.push(content);
    const index = notes.length;
    return `<sup class="footnote-marker" data-index="${index}">${index}</sup>`;
  });

  // 2. Wrap Harmonies **Text** for Modal Trigger
  lyricHtml = lyricHtml.replace(HARMONY_REGEX, (match, content) => {
    return `<span class="harmony-section" onclick="window.openPDF()">${content}</span>`;
  });

  // 3. Handle Chord Transposition [Chord]
  if (isGuitarMode && capo !== 0) {
    lyricHtml = lyricHtml.replace(CHORD_REGEX, (match, chord) => {
      const transposed = transposeChord(chord, -capo);
      return `<span class="chord">[${transposed}]</span>`;
    });
  }

  return { html: lyricHtml, footnotes: notes };
};