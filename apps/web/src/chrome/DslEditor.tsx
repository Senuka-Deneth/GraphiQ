import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { useEffect, useRef } from "react";
import { dslHighlightExtension } from "./dslHighlight.js";

type DslEditorProps = {
  value?: string;
  revision?: number;
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
});

export function DslEditor({
  value = "diagram class\n",
  revision = 0,
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

  onChangeRef.current = onChange;
  onFocusRef.current = onFocus;
  onBlurRef.current = onBlur;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
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

    if (lastRevisionRef.current === revision) {
      return;
    }

    lastRevisionRef.current = revision;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [revision, value]);

  return (
    <div
      className="min-h-0 flex-1 overflow-hidden border-l border-slate-300 bg-white"
      data-testid="dsl-editor-panel"
    >
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
