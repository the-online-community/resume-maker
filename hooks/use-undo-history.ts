"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A hook that wraps a state value with an undo/redo history stack.
 * Supports Ctrl+Z (undo) and Ctrl+Shift+Z / Ctrl+Y (redo).
 *
 * `push(value)` should be called for "significant" changes (AI generation,
 * loading a saved resume, accepting an AI edit). Inline typing edits
 * should use `set(value)` which updates without pushing to history
 * (the contentEditable fields handle their own browser undo).
 */
export function useUndoHistory<T>(initial: T) {
  const [value, setValue] = useState<T>(initial);
  const historyRef = useRef<T[]>([]);
  const indexRef = useRef(-1);

  /** Push a new snapshot onto the history stack (for significant changes). */
  const push = useCallback((next: T) => {
    // Trim any "future" entries if we undid and then made a new change
    const history = historyRef.current;
    const idx = indexRef.current;
    historyRef.current = history.slice(0, idx + 1);

    historyRef.current.push(next);
    indexRef.current = historyRef.current.length - 1;
    setValue(next);
  }, []);

  /** Set value without pushing to history (for inline typing). */
  const set = useCallback((next: T | ((prev: T) => T)) => {
    setValue(next);
  }, []);

  /** Undo — go back one step in history. */
  const undo = useCallback(() => {
    const idx = indexRef.current;
    if (idx <= 0) return;
    indexRef.current = idx - 1;
    setValue(historyRef.current[indexRef.current]);
  }, []);

  /** Redo — go forward one step in history. */
  const redo = useCallback(() => {
    const idx = indexRef.current;
    if (idx >= historyRef.current.length - 1) return;
    indexRef.current = idx + 1;
    setValue(historyRef.current[indexRef.current]);
  }, []);

  // Global keyboard shortcut (Cmd+Z / Ctrl+Z)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      // Skip inputs, textareas, and contentEditable elements
      if (
        el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.isContentEditable
      )
        return;

      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        (mod && e.key === "z" && e.shiftKey) ||
        (mod && e.key === "y")
      ) {
        e.preventDefault();
        redo();
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [undo, redo]);

  return { value, push, set, undo, redo };
}
