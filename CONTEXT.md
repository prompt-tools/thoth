# Portrait Adaptive Prompting

This context describes the vocabulary of the portrait and character prompt wizard. It keeps model-guided questioning distinct from the deterministic prompt that results from a user's answers.

## Language

**Subject brief**:
The required first free-text description of the desired person or character. It may be terse or detailed and may name the role and its defining traits.
_Avoid_: Theme, raw intent, opening prompt

**Known fact**:
A visual or delivery detail explicitly present in the Subject brief or confirmed by a prior user answer.
_Avoid_: Guess, inferred default

**Eligible dimension**:
An unanswered portrait question whose semantic scope applies to the Known facts and does not conflict with them.
_Avoid_: Next fixed question, mandatory field

**Adaptive turn**:
One model-guided question that selects an Eligible dimension, presents it in contextual wording, and gathers the user's answer.
_Avoid_: Step, fixed wizard page

**Catalog-backed candidate**:
A selectable answer whose meaning and final prompt fragment are defined by the portrait catalog, even when the model chose it dynamically.
_Avoid_: Model-generated option, arbitrary choice

**Free-text answer**:
A value supplied directly by the user when no Catalog-backed candidate expresses the intended detail.
_Avoid_: Model-generated option

**Background direction**:
The environment or backdrop that supports the subject's story, mood, and composition. It may be chosen from Catalog-backed candidates or supplied as a Free-text answer.
_Avoid_: Decoration, optional filler

**Differentiation coverage**:
Explicit intent across the character signature, narrative behavior, visual world, and presentation purpose pillars. Coverage is sufficient only when every pillar helps distinguish the requested image from a generic portrait.
_Avoid_: Completeness score, fixed question count

**Completion**:
The point when Differentiation coverage is sufficient and no remaining Eligible dimension is likely to materially change the intended image. A fully specified Subject brief may reach it without an Adaptive turn.
_Avoid_: Exhausted question list, fixed step count

**Adaptive routing gate**:
The ordered evidence required before Adaptive turns may replace fixed question ordering: deterministic replay, the pinned live fixture matrix, real-browser walkthroughs, and a staged Canary cohort.
_Avoid_: Unit-test pass, build pass

**Journey**:
One continuous prompt-building interaction from Subject brief to Completion or abandonment. It remains in one routing cohort throughout.
_Avoid_: Page view, per-turn session

**Canary cohort**:
A stable subset of real Journeys routed through Adaptive turns while the fixed-order control remains available for comparison and rollback.
_Avoid_: Per-turn random sample, full rollout
