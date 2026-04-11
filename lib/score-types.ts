export interface KeywordFix {
  id: string;
  keyword: string;
  section: string;
  action: string;
  currentSnippet: string;
  fixedSnippet: string;
  /** When set, this fix is an append-style operation: just append `append` to
   *  the current state of `section`. Used as a fallback for missing keywords
   *  that the AI couldn't weave in surgically. */
  append?: string;
}

export interface ScoreResult {
  score: number;
  missingKeywords: string[];
  fixes: KeywordFix[];
}
