/**
 * US Letter: 8.5 × 11 in. With 0.5 in @page margins → 7.5 × 10 in content area.
 * At 96 CSS-px/in → 720 × 960 px.
 *
 * PAGE_HEIGHT must match the print content area (960px) so page breaks
 * in the preview align exactly with where the browser splits pages in print.
 *
 * Content always renders at CONTENT_WIDTH with NO padding.
 * Visual whitespace in preview comes from PAGE_PADDING on the page frame.
 * Print whitespace comes from @page margins.
 */
export const CONTENT_WIDTH = 720;
export const PAGE_HEIGHT = 960;
export const PAGE_PADDING = 48; // 0.5in at 96 CSS-px/in — matches @page margin
export const FRAME_WIDTH = CONTENT_WIDTH + PAGE_PADDING * 2; // 816
