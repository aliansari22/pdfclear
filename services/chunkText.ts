/**
 * Utilities for turning raw page text into semantically meaningful chunks.
 *
 * Goals:
 * - Avoid tiny, context-less chunks like "CHAPTER 3 10".
 * - Respect paragraph boundaries whenever possible.
 * - Avoid cutting in the middle of sentences unless absolutely necessary.
 * - Allow controlled word-level overlap between adjacent chunks.
 */

/**
 * Count words in a string.
 */
function countWords(text: string): number {
  if (!text) return 0;
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

/**
 * Heuristic to detect "heading-like" paragraphs such as:
 * - "CHAPTER 3 10"
 * - "CHAPTER 1 Q"
 * - "INTRODUCTION"
 * - "SECTION 2.1"
 *
 * These are typically very short, often uppercase, and without sentence
 * punctuation. We don't want them to become standalone chunks, so we
 * either merge them into neighbouring paragraphs or drop them if they
 * look like pure boilerplate headers/footers.
 */
function isLikelyHeading(paragraph: string): boolean {
  const text = paragraph.trim();
  if (!text) return false;

  const wordCount = countWords(text);
  if (wordCount === 0) return false;

  // Only consider relatively short paragraphs as headings
  if (wordCount > 10) return false;

  const lettersOnly = text.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, "");
  const upperLetters = lettersOnly.replace(/[^A-ZÀ-Ö]/g, "");
  const isMostlyUpper =
    lettersOnly.length > 0 && upperLetters.length / lettersOnly.length > 0.8;

  const headingKeywords =
    /^(chapter|section|part|appendix|abstract|introduction|background|conclusion|references|acknowledg?ments?)\b/i;
  const looksNumbered =
    /^(\d+(\.\d+)*|[IVXLCDM]+)\s*[:.)-]?\s*\w+/i.test(text);
  const endsWithColon = /[:：]\s*$/.test(text);
  const shortNoSentencePunctuation = /^[^.!?]{1,120}$/.test(text);

  if (headingKeywords.test(text)) return true;
  if (looksNumbered && wordCount <= 8) return true;
  if (isMostlyUpper && shortNoSentencePunctuation) return true;
  if (endsWithColon && wordCount <= 12) return true;

  return false;
}

/**
 * Merge heading-like paragraphs with the paragraph that follows them
 * so we don't end up with tiny, context-less chunks like "CHAPTER 3 10".
 *
 * If a heading-like paragraph is the *last* paragraph on a page, we treat
 * it as structural noise and drop it entirely instead of producing a
 * standalone chunk from it.
 */
function mergeHeadingParagraphs(paragraphs: string[]): string[] {
  const merged: string[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const current = paragraphs[i].trim();
    if (!current) continue;

    if (isLikelyHeading(current)) {
      // Heading followed by a normal paragraph -> merge with the next one
      if (i < paragraphs.length - 1) {
        const next = paragraphs[i + 1];
        merged.push(`${current}\n\n${next}`.trim());
        i += 1; // skip the next one, since we've merged it
      } else {
        // Trailing heading (e.g. "CHAPTER 3 10" alone at the end of a page)
        // is very likely a header/footer. Drop it instead of creating a chunk.
        continue;
      }
    } else {
      merged.push(paragraphs[i]);
    }
  }

  return merged;
}

/**
 * Very lightweight sentence splitter that tries to break on end-of-sentence
 * punctuation, without using lookbehind (for older browsers).
 *
 * This is not perfect linguistically, but it works well enough to avoid
 * splitting in the middle of a sentence, which is the main UX concern here.
 */
function splitIntoSentences(text: string): string[] {
  const sentences: string[] = [];
  let current = "";

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    current += ch;

    if (ch === "." || ch === "!" || ch === "?") {
      // Consume trailing quote/bracket characters
      let j = i + 1;
      while (
        j < text.length &&
        (`"'”’)］]`.includes(text[j]) ||
          text[j] === ")" ||
          text[j] === "]" ||
          text[j] === "’" ||
          text[j] === "”")
      ) {
        current += text[j];
        i = j;
        j++;
      }

      const next = text[i + 1];
      if (!next || /\s/.test(next)) {
        const sentence = current.trim();
        if (sentence.length > 0) {
          sentences.push(sentence);
        }
        current = "";
      }
    }
  }

  if (current.trim().length > 0) {
    sentences.push(current.trim());
  }

  return sentences;
}

/**
 * Split a long paragraph into chunks on sentence boundaries, trying to
 * keep each chunk between minLength and maxLength words.
 *
 * Overlap is applied in terms of words (we repeat the last N words from
 * the previous chunk at the start of the next chunk).
 */
function splitLongParagraph(
  paragraph: string,
  maxLength: number,
  overlap: number,
  minLength: number
): string[] {
  const sentences = splitIntoSentences(paragraph);
  if (sentences.length === 0) return [paragraph.trim()];

  const chunks: string[] = [];
  const effectiveOverlap = Math.max(
    0,
    Math.min(overlap, maxLength > 1 ? maxLength - 1 : 0)
  );

  let currentSentences: string[] = [];
  let currentWords = 0;

  const flush = () => {
    if (!currentSentences.length) return;
    const text = currentSentences.join(" ").trim();
    if (text.length > 0) {
      chunks.push(text);
    }
    currentSentences = [];
    currentWords = 0;
  };

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const sentenceWordCount = countWords(sentence);

    // If this is an extremely long single sentence, just add it to the
    // current chunk even if it makes the chunk larger than maxLength.
    if (sentenceWordCount >= maxLength && currentWords === 0) {
      currentSentences.push(sentence);
      currentWords += sentenceWordCount;
      flush();
      continue;
    }

    if (
      currentWords + sentenceWordCount <= maxLength ||
      currentWords < minLength
    ) {
      currentSentences.push(sentence);
      currentWords += sentenceWordCount;
      continue;
    }

    // currentWords >= minLength and adding this sentence would overshoot
    flush();

    // Apply word-level overlap from the previous chunk, if applicable
    if (effectiveOverlap > 0 && chunks.length > 0) {
      const prev = chunks[chunks.length - 1];
      const prevWords = prev.split(/\s+/).filter(Boolean);
      const overlapSlice =
        prevWords.length > effectiveOverlap
          ? prevWords.slice(prevWords.length - effectiveOverlap)
          : prevWords;
      const overlapText = overlapSlice.join(" ");
      currentSentences.push(overlapText);
      currentWords = overlapSlice.length;
    }

    // Start with the current sentence
    currentSentences.push(sentence);
    currentWords += sentenceWordCount;
  }

  if (currentSentences.length) {
    if (currentWords < minLength && chunks.length > 0) {
      // Merge with previous chunk so we don't end up with a tiny tail
      const last = chunks.pop() as string;
      chunks.push(`${last} ${currentSentences.join(" ")}`.trim());
    } else {
      flush();
    }
  }

  return chunks.map((c) => c.trim()).filter((c) => c.length > 0);
}

/**
 * Core chunk builder that:
 * - works on paragraph arrays
 * - preserves paragraph boundaries where possible
 * - avoids creating tiny chunks
 * - only splits paragraphs internally when they exceed maxLength
 *
 * Additionally, it ensures that we *never* emit a chunk that is purely a
 * short heading like "CHAPTER 3 10"; those are merged into a neighbour or
 * dropped if there is nothing meaningful to attach them to.
 */
function buildChunksFromParagraphs(
  paragraphs: string[],
  maxLength: number,
  overlap: number,
  minLength: number
): string[] {
  const chunks: string[] = [];

  const mergedParagraphs = mergeHeadingParagraphs(paragraphs);

  let currentParts: string[] = [];
  let currentWords = 0;

  const flush = () => {
    if (!currentParts.length) return;
    const text = currentParts.join("\n\n").trim();
    if (!text) {
      currentParts = [];
      currentWords = 0;
      return;
    }

    // Detect "heading-only" chunks such as "CHAPTER 3 10" and avoid
    // emitting them as separate chunks.
    const onlyHeadings = currentParts.every((p) => isLikelyHeading(p));
    const totalWords = countWords(text);

    if (onlyHeadings && totalWords <= 15) {
      // If there is a previous chunk, merge this heading into it so it
      // still provides context but doesn't show up on its own.
      if (chunks.length > 0) {
        const last = chunks[chunks.length - 1];
        chunks[chunks.length - 1] = `${last}\n\n${text}`.trim();
      }
      // If there is no previous chunk, just drop the heading-only text.
      currentParts = [];
      currentWords = 0;
      return;
    }

    chunks.push(text);
    currentParts = [];
    currentWords = 0;
  };

  for (const rawParagraph of mergedParagraphs) {
    const paragraph = rawParagraph.trim();
    if (!paragraph) continue;

    const paragraphWords = countWords(paragraph);

    // Extremely long paragraphs get split on sentence boundaries
    if (paragraphWords > maxLength) {
      // Flush current chunk first if it is reasonably sized
      if (currentWords >= minLength) {
        flush();
      }

      const longChunks = splitLongParagraph(
        paragraph,
        maxLength,
        overlap,
        minLength
      );
      for (const c of longChunks) {
        chunks.push(c);
      }
      continue;
    }

    // Paragraph fits within maxLength:
    // If there is no current chunk, or if adding the paragraph still keeps
    // us under maxLength (or current is still below minLength), add it.
    if (
      currentWords === 0 ||
      currentWords + paragraphWords <= maxLength ||
      currentWords < minLength
    ) {
      currentParts.push(paragraph);
      currentWords += paragraphWords;
      continue;
    }

    // Adding the paragraph would overshoot maxLength and current chunk is
    // already long enough: flush and start a new chunk with this paragraph.
    flush();
    currentParts.push(paragraph);
    currentWords = paragraphWords;
  }

  // Finalize
  if (currentParts.length) {
    if (currentWords < minLength && chunks.length > 0) {
      // Merge with previous chunk instead of creating a tiny one
      const last = chunks.pop() as string;
      const text = `${last}\n\n${currentParts.join("\n\n")}`.trim();

      // If merging created a heading-only small chunk, avoid emitting it
      const onlyHeadings = text
        .split(/\n\s*\n/)
        .every((p) => isLikelyHeading(p));
      const totalWords = countWords(text);

      if (onlyHeadings && totalWords <= 15) {
        // Just drop it; it's almost certainly boilerplate like "CHAPTER 3 10"
        chunks.push(last);
      } else {
        chunks.push(text);
      }
    } else {
      flush();
    }
  }

  return chunks;
}

/**
 * Chunks a single block of text by:
 * - splitting into paragraphs
 * - building paragraph-aware chunks
 *
 * @param text The input text.
 * @param maxLength The target maximum length of a chunk (in words).
 * @param overlap The desired overlap between chunks (in words).
 * @returns An array of text chunks.
 */
export function chunkText(
  text: string,
  maxLength = 200,
  overlap = 30
): string[] {
  if (!text) return [];

  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (!paragraphs.length) return [];

  // Minimum chunk length is roughly 40% of maxLength, but never below 30 words.
  const minLength = Math.max(30, Math.floor(maxLength * 0.4));

  return buildChunksFromParagraphs(paragraphs, maxLength, overlap, minLength);
}

/**
 * Chunks text from multiple pages, respecting paragraph structure within each page.
 * This approach:
 * - preserves paragraphs where possible
 * - avoids creating tiny heading-only chunks like "CHAPTER 3 10"
 * - tries not to cut inside sentences unless a paragraph is very long
 *
 * @param pages An array of page objects with text and page numbers.
 * @param fileName The name of the source file for creating unique chunk IDs.
 * @param maxLength The target maximum length of a chunk (in words).
 * @param overlap The desired overlap between chunks (in words).
 * @returns An array of chunk objects with ID, text, and page number.
 */
export function chunkTextByPage(
  pages: { pageNum: number; text: string }[],
  fileName: string,
  maxLength: number,
  overlap: number
): { id: string; text: string; pageNum: number }[] {
  const allChunks: { id: string; text: string; pageNum: number }[] = [];
  let chunkIndex = 1;

  const minLength = Math.max(30, Math.floor(maxLength * 0.4));
  const effectiveOverlap =
    overlap == null ? 0 : Math.max(0, Math.min(overlap, maxLength - 1));

  for (const page of pages) {
    if (!page.text || page.text.trim().length === 0) continue;

    const paragraphs = page.text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (!paragraphs.length) continue;

    const pageChunks = buildChunksFromParagraphs(
      paragraphs,
      maxLength,
      effectiveOverlap,
      minLength
    );

    for (const chunkTextValue of pageChunks) {
      allChunks.push({
        id: `${fileName}#${chunkIndex++}`,
        text: chunkTextValue,
        pageNum: page.pageNum,
      });
    }
  }

  return allChunks;
}

/**
 * Chunks text based on character count with different strategies.
 * @param text The input text.
 * @param size The target size of each chunk in characters.
 * @param strategy 'simple' for hard splits, 'sentence' for sentence-aware splitting.
 * @returns An array of text chunks.
 */
export function chunkTextWithStrategy(text: string, size: number, strategy: 'simple' | 'sentence'): string[] {
    if (!text || size <= 0) return [];

    if (strategy === 'simple') {
        const chunks: string[] = [];
        for (let i = 0; i < text.length; i += size) {
            chunks.push(text.substring(i, i + size));
        }
        return chunks;
    }

    // Sentence-aware strategy
    const sentences = text.match(/[^.!?]+[.!?]+(\s+|$)/g) || [text];
    const chunks: string[] = [];
    let currentChunk = "";

    for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > size) {
            if (currentChunk) {
                chunks.push(currentChunk.trim());
            }
            currentChunk = sentence;
        } else {
            currentChunk += sentence;
        }
    }

    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }

    return chunks;
}


/**
 * Applies heuristics to format raw extracted text, attempting to reconstruct paragraphs.
 * @param rawText The raw text, typically from OCR, with line breaks.
 * @returns Formatted text with paragraph breaks.
 */
export function formatExtractedText(rawText: string): string {
  if (!rawText) return "";
  const lines = rawText.split("\n");
  const formattedLines: string[] = [];

  const isListItem = (line: string) =>
    /^\s*([*•◦▪-]|(\d{1,2}|[a-zA-Z])[.)])\s+/.test(line.trim());
  const endsWithSentenceTerminator = (line: string) =>
    /[.?!:"”']\s*$/.test(line.trim());

  let previousLineWasEmpty = true;

  for (const line of lines) {
    const currentLine = line.trim();
    const prevFormattedLine = formattedLines[formattedLines.length - 1];

    if (currentLine === "") {
      if (!previousLineWasEmpty) {
        formattedLines.push("");
        previousLineWasEmpty = true;
      }
      continue;
    }

    previousLineWasEmpty = false;

    if (
      !prevFormattedLine ||
      prevFormattedLine.trim() === "" ||
      isListItem(currentLine)
    ) {
      formattedLines.push(currentLine);
      continue;
    }

    if (endsWithSentenceTerminator(prevFormattedLine)) {
      formattedLines.push(currentLine);
      continue;
    }

    formattedLines[formattedLines.length - 1] += " " + currentLine;
  }

  return formattedLines.join("\n").replace(/\n\s*\n/g, "\n\n").trim();
}

export interface PostProcessOptions {
  removeHeadersFooters?: boolean;
  fixHyphenation?: boolean;
  reflowParagraphs?: boolean;
  includePageNumbers?: boolean;
}

/**
 * Advanced post-processing for extracted text from multiple pages.
 * Includes header/footer removal, hyphenation fixing, and paragraph reflowing.
 */
export function postProcessExtractedText(
  pages: { pageNum: number; text: string }[],
  options: PostProcessOptions = {}
): string {
  let processedPages = JSON.parse(JSON.stringify(pages));

  if (options.removeHeadersFooters && processedPages.length > 2) {
    const lineFrequency: Record<string, number> = {};
    const pageFirstLines: (string | null)[] = [];
    const pageLastLines: (string | null)[] = [];

    for (const page of processedPages) {
      const lines = page.text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 5 && l.length < 100);

      const firstLine = lines.length > 0 ? lines[0] : null;
      pageFirstLines.push(firstLine);
      if (firstLine) {
        lineFrequency[firstLine] = (lineFrequency[firstLine] || 0) + 1;
      }

      const lastLine = lines.length > 1 ? lines[lines.length - 1] : null;
      if (
        lastLine &&
        !/^\d+\s*$/.test(lastLine) &&
        !/page\s+\d+/i.test(lastLine)
      ) {
        pageLastLines.push(lastLine);
        lineFrequency[lastLine] = (lineFrequency[lastLine] || 0) + 1;
      } else {
        pageLastLines.push(null);
      }
    }

    const threshold = Math.max(2, Math.floor(processedPages.length * 0.6));
    const commonLines = new Set<string>();
    for (const line in lineFrequency) {
      if (lineFrequency[line] >= threshold) {
        commonLines.add(line);
      }
    }

    if (commonLines.size > 0) {
      processedPages = processedPages.map((page, i) => {
        let text = page.text;
        const firstLine = pageFirstLines[i];
        if (firstLine && commonLines.has(firstLine)) {
          text = text.substring(text.indexOf("\n") + 1);
        }
        const lastLine = pageLastLines[i];
        if (lastLine && commonLines.has(lastLine)) {
          const lastIndex = text.lastIndexOf(lastLine);
          if (lastIndex !== -1) {
            text = text.substring(0, lastIndex);
          }
        }
        return { ...page, text: text.trim() };
      });
    }
  }

  const ensurePageMarkerSpacing = (text: string): string =>
    text.replace(/\n*--- Page (\d+) ---\n*/g, "\n\n--- Page $1 ---\n\n");

  let aggregatedText = processedPages
    .map((p) => {
      const pageText = (p.text || "").trim();
      return options.includePageNumbers
        ? `\n\n--- Page ${p.pageNum} ---\n\n${pageText}`
        : pageText;
    })
    .filter(Boolean)
    .join(options.includePageNumbers ? "" : "\n\n");

  if (options.fixHyphenation) {
    aggregatedText = aggregatedText.replace(
      /(\w)-[\n\r]+\s*(\w)/g,
      "$1$2"
    );
  }

  if (options.reflowParagraphs) {
    const formatted = formatExtractedText(aggregatedText);
    return options.includePageNumbers ? ensurePageMarkerSpacing(formatted) : formatted;
  }

  return options.includePageNumbers ? ensurePageMarkerSpacing(aggregatedText) : aggregatedText.trim();
}
