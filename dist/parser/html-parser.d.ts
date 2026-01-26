/**
 * Parse HTML content and extract main content as Markdown
 *
 * Flow:
 * 1. HTML string → JSDOM (DOM creation)
 * 2. JSDOM → Readability (main content extraction, noise removal)
 * 3. Readability result → Turndown (Markdown conversion)
 *
 * @param html - Raw HTML string
 * @param url - Source URL (used for resolving relative links)
 * @returns Markdown string of extracted content
 */
export declare function parseHtml(html: string, url: string): Promise<string>;
//# sourceMappingURL=html-parser.d.ts.map