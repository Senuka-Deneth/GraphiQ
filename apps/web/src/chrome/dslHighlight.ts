import { HighlightStyle, StreamLanguage, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

const dslHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#7c3aed", fontWeight: "600" },
]);

const dslLanguage = StreamLanguage.define<{ inBlock: boolean }>({
  name: "graphiq-dsl",
  startState: () => ({ inBlock: false }),
  token(stream, state) {
    if (stream.eatSpace()) {
      return null;
    }

    if (stream.match("//")) {
      stream.skipToEnd();
      return "comment";
    }

    if (stream.match("/*")) {
      while (!stream.eol()) {
        if (stream.match("*/")) {
          break;
        }
        stream.next();
      }
      return "comment";
    }

    const keywords = [
      "diagram",
      "class",
      "interface",
      "enum",
      "abstract",
      "object",
      "instance",
      "package",
      "component",
      "provides",
      "requires",
      "provided",
      "required",
      "port",
      "artifact",
      "deployment",
      "node",
      "device",
      "executionEnvironment",
      "stereotype",
      "extension",
      "metaclass",
      "profile",
      "actor",
      "usecase",
      "subject",
      "compositeStructure",
      "communication",
      "activity",
      "stateMachine",
      "sequence",
      "timing",
      "interactionOverview",
      "lifeline",
      "alt",
      "opt",
      "loop",
      "gate",
      "state",
      "region",
      "choice",
      "junction",
      "history",
      "deepHistory",
      "terminate",
      "entry",
      "exit",
      "do",
      "connector",
      "part",
      "enum",
      "partition",
      "action",
      "object",
      "initial",
      "final",
      "decision",
      "merge",
      "fork",
      "join",
      "flowFinal",
      "interruptible",
      "ref",
    ] as const;

    for (const keyword of keywords) {
      if (stream.match(keyword)) {
        const next = stream.peek();
        if (next === null || next === undefined || !/[A-Za-z0-9_]/.test(next)) {
          return "keyword";
        }
        stream.backUp(keyword.length);
      }
    }

    if (stream.match("{")) {
      state.inBlock = true;
      return null;
    }

    if (stream.match("}")) {
      state.inBlock = false;
      return null;
    }

    stream.next();
    return null;
  },
});

export const dslHighlightExtension = [
  dslLanguage,
  syntaxHighlighting(dslHighlightStyle),
];
