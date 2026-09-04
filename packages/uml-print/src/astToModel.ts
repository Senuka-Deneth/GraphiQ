import { assertNever } from "@graphiq/uml-core";
import type { DiagramAst } from "@graphiq/uml-dsl";
import type { UmlModel } from "@graphiq/uml-model";
import { classAstToModel } from "./classAstToModel.js";
import { objectAstToModel } from "./objectAstToModel.js";

export function astToModel(ast: DiagramAst, previous?: UmlModel): UmlModel {
  switch (ast.kind) {
    case "class":
      return classAstToModel(ast, previous?.kind === "class" ? previous : undefined);
    case "object":
      return objectAstToModel(ast, previous?.kind === "object" ? previous : undefined);
    default:
      return assertNever(ast);
  }
}
