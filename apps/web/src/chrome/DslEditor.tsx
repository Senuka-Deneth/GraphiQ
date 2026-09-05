import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { lintGutter } from "@codemirror/lint";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import type { Diagnostic } from "@graphiq/uml-core";
import { useEffect, useRef } from "react";
import { createInitialDslLintExtension, reconfigureDslLint } from "./dslLint.js";
import { dslHighlightExtension } from "./dslHighlight.js";

type DslEditorProps = {
  value?: string;
  revision?: number;
  diagnostics?: readonly Diagnostic[];
  onChange?: (value: string) => void;
  readOnly?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
};

const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "13px",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
  ".cm-scroller": {
    overflow: "auto",
    fontFamily: "inherit",
  },
  ".cm-content": {
    padding: "8px 0",
  },
  ".cm-gutters": {
    backgroundColor: "#f8fafc",
    borderRight: "1px solid #e2e8f0",
    color: "#64748b",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "#f1f5f9",
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "#0f172a",
  },
  ".cm-lintRange-error": {
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='3' viewBox='0 0 6 3'%3E%3Cpath d='m0 3 l2 -2 l1 0 l2 2 l1 0' stroke='%23dc2626' fill='none' stroke-width='1'/%3E%3C/svg%3E\")",
    backgroundRepeat: "repeat-x",
    backgroundPosition: "left bottom",
  },
  ".cm-lintRange-warning": {
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='3' viewBox='0 0 6 3'%3E%3Cpath d='m0 3 l2 -2 l1 0 l2 2 l1 0' stroke='%23d97706' fill='none' stroke-width='1'/%3E%3C/svg%3E\")",
    backgroundRepeat: "repeat-x",
    backgroundPosition: "left bottom",
  },
});

export function DslEditor({
  value = "diagram class\n",
  revision = 0,
  diagnostics = [],
  onChange,
  readOnly = false,
  onFocus,
  onBlur,
}: DslEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onFocusRef = useRef(onFocus);
  const onBlurRef = useRef(onBlur);
  const lastRevisionRef = useRef(revision);
  const suppressOnChangeRef = useRef(false);

  onChangeRef.current = onChange;
  onFocusRef.current = onFocus;
  onBlurRef.current = onBlur;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !suppressOnChangeRef.current) {
        onChangeRef.current?.(update.state.doc.toString());
      }
      if (update.focusChanged) {
        if (update.view.hasFocus) {
          onFocusRef.current?.();
        } else {
          onBlurRef.current?.();
        }
      }
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        dslHighlightExtension,
        lintGutter(),
        createInitialDslLintExtension(diagnostics),
        editorTheme,
        EditorView.lineWrapping,
        updateListener,
        EditorState.readOnly.of(readOnly),
        EditorView.contentAttributes.of({ "data-testid": "dsl-editor" }),
      ],
    });

    const view = new EditorView({
      state,
      parent: container,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [readOnly]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }

    view.dispatch({
      effects: reconfigureDslLint(diagnostics),
    });
  }, [diagnostics]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }

    if (lastRevisionRef.current === revision) {
      return;
    }

    lastRevisionRef.current = revision;
    const current = view.state.doc.toString();
    if (current !== value) {
      suppressOnChangeRef.current = true;
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
      suppressOnChangeRef.current = false;
    }
  }, [revision, value]);

  return (
    <div className="min-h-0 flex-1 overflow-hidden bg-white">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
