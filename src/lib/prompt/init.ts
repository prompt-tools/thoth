// Barrel file — triggers module side effects in dependency order.
//
// After I-01 + I-02, only two real side-effect imports remain:
//   1. ./options — registerOptionSet() loop populates optionSetMap
//      (option registry kept per I-07 design decision: 14 sets × N options
//      with cross-set queries earn the abstraction)
//   2. ./work-types/image-prompt.worktype — runs assertValidWorkTypeConfig
//      against the now-populated optionSetMap
//
// targets/* and renderers/* no longer need to be imported here because
// their singletons are pulled in transitively by registry/target.registry.ts
// and registry/adapter.registry.ts when consumers call resolveTarget /
// resolveAdapter.

import "./options";
import { imagePromptWorkType } from "./work-types/image-prompt.worktype";
import { imagePromptM001DemoWorkType } from "./work-types/image-prompt-m001-demo.worktype";
import { imagePromptAgentWorkType } from "./work-types/image-prompt-agent.worktype";
import { assertValidWorkTypeConfig } from "./registry/work-type-validator";

assertValidWorkTypeConfig(imagePromptWorkType);
assertValidWorkTypeConfig(imagePromptM001DemoWorkType);
assertValidWorkTypeConfig(imagePromptAgentWorkType);
