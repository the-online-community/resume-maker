/**
 * Single source of truth for resume styling.
 * Used by the preview component (injected as <style>) and the print window.
 *
 * IMPORTANT: .resume-page must NOT have padding — padding is handled
 * differently in preview (page frame wrapper) vs print (@page margins).
 * This ensures content width is always identical (720px) everywhere.
 */
export const RESUME_CSS = `
  .resume-page {
    font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
    color: #0a0a0a;
    background: white;
  }

  .resume-header {
    margin-bottom: 24px;
    border-bottom: 1px solid #e5e5e5;
    padding-bottom: 16px;
  }

  .resume-header h1 {
    font-size: 24px;
    font-weight: 700;
  }

  .resume-job-title {
    font-size: 16px;
    font-weight: 600;
    color: #525252;
    margin-top: 2px;
  }

  .resume-contact {
    margin-top: 4px;
    color: #737373;
    font-size: 14px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 0;
    overflow: hidden;
  }

  .resume-contact-inner {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 0;
    margin-left: -16px;
  }

  .resume-contact-item::before {
    content: "·";
    color: #a3a3a3;
    padding: 0 6px;
  }

  .resume-link {
    color: #2563eb;
    text-decoration: none;
  }

  .resume-link:hover {
    text-decoration: underline;
    color: #1d4ed8;
  }

  .resume-section {
    margin-bottom: 20px;
  }

  .resume-section h2 {
    font-family: ui-monospace, monospace;
    font-size: 14px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 8px;
  }

  .resume-section p,
  .resume-section div {
    font-size: 14px;
    line-height: 1.625;
    white-space: pre-line;
  }

  [data-slot="skeleton"] {
    display: none;
  }

  .resume-editable {
    outline: none;
    border-radius: 3px;
    padding: 1px 3px;
    margin: -1px -3px;
    transition: background-color 0.15s, box-shadow 0.15s;
  }

  .resume-editable:hover {
    background-color: #f5f5f5;
  }

  .resume-editable:focus {
    background-color: #eff6ff;
    box-shadow: 0 0 0 1.5px #93bbfd;
  }
`;

/** Print-specific overrides. @page margins provide whitespace (no body padding needed). */
export const RESUME_PRINT_CSS = `
  @media print {
    @page { margin: 0.5in; size: letter; }
  }
`;
