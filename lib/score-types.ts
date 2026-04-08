export interface KeywordFix {
  id: string;
  keyword: string;
  section: string;
  action: string;
  currentSnippet: string;
  fixedSnippet: string;
}

export interface ScoreResult {
  score: number;
  missingKeywords: string[];
  fixes: KeywordFix[];
}
