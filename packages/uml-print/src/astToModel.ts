import { assertNever } from "@graphiq/uml-core";
import type { DiagramAst } from "@graphiq/uml-dsl";
import type { UmlModel } from "@graphiq/uml-model";
import { classAstToModel } from "./classAstToModel.js";
import { componentAstToModel } from "./componentAstToModel.js";
import { deploymentAstToModel } from "./deploymentAstToModel.js";
import { objectAstToModel } from "./objectAstToModel.js";
import { packageAstToModel } from "./packageAstToModel.js";

export function astToModel(ast: DiagramAst, previous?: UmlModel): UmlModel {
  switch (ast.kind) {
    case "class":
      return classAstToModel(ast, previous?.kind === "class" ? previous : undefined);
    case "object":
      return objectAstToModel(ast, previous?.kind === "object" ? previous : undefined);
    case "package":
      return packageAstToModel(ast, previous?.kind === "package" ? previous : undefined);
    case "component":
      return componentAstToModel(ast, previous?.kind === "component" ? previous : undefined);
    case "deployment":
      return deploymentAstToModel(ast, previous?.kind === "deployment" ? previous : undefined);
    default:
      return assertNever(ast);
  }
}
