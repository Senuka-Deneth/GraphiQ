import type { UmlRule } from "../../types.js";
import { profileExtensionMarkerIsFilledTriangleRule } from "./extension-marker-is-filled-triangle.js";
import { profileExtensionStereotypeToMetaclassRule } from "./extension-stereotype-to-metaclass.js";
import { profileMetaclassNotAUserClassRule } from "./metaclass-not-a-user-class.js";
import { profileStereotypeGeneralizationRule } from "./stereotype-generalization.js";

export const PROFILE_RULES: readonly UmlRule[] = [
  profileExtensionStereotypeToMetaclassRule,
  profileExtensionMarkerIsFilledTriangleRule,
  profileStereotypeGeneralizationRule,
  profileMetaclassNotAUserClassRule,
];

export { PROFILE_METACLASS_NAMES, isProfileMetaclassName } from "./metaclasses.js";
