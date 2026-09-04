import { assertNever } from "@graphiq/uml-core";
import type { DiagramAst } from "@graphiq/uml-dsl";
import type { UmlModel } from "@graphiq/uml-model";
import { classAstToModel } from "./classAstToModel.js";
import { componentAstToModel } from "./componentAstToModel.js";
import { deploymentAstToModel } from "./deploymentAstToModel.js";
import { objectAstToModel } from "./objectAstToModel.js";
import { packageAstToModel } from "./packageAstToModel.js";
import { profileAstToModel } from "./profileAstToModel.js";
import { compositeStructureAstToModel } from "./compositeStructureAstToModel.js";
import { communicationAstToModel } from "./communicationAstToModel.js";
import { useCaseAstToModel } from "./useCaseAstToModel.js";

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
    case "profile":
      return profileAstToModel(ast, previous?.kind === "profile" ? previous : undefined);
    case "useCase":
      return useCaseAstToModel(ast, previous?.kind === "useCase" ? previous : undefined);
    case "compositeStructure":
      return compositeStructureAstToModel(
        ast,
        previous?.kind === "compositeStructure" ? previous : undefined,
      );
    case "communication":
      return communicationAstToModel(
        ast,
        previous?.kind === "communication" ? previous : undefined,
      );
    default:
      return assertNever(ast);
  }
}
