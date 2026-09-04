import type { UmlRule } from "../../types.js";
import { packageCannotImportClassAsPackageRule } from "./cannot-import-class-as-package.js";
import { packageImportPackageToPackageRule } from "./import-package-to-package.js";
import { packageMergePackageToPackageRule } from "./merge-package-to-package.js";
import { packageNoCycleMergeRule } from "./no-cycle-merge.js";

export const PACKAGE_RULES: readonly UmlRule[] = [
  packageImportPackageToPackageRule,
  packageMergePackageToPackageRule,
  packageNoCycleMergeRule,
  packageCannotImportClassAsPackageRule,
];
