# Portrait Background Taxonomy and Questioning Rules

Date: 2026-07-14
Scope: portrait and character prompt wizard only

## Decision

Background is a conditional high-value dimension, not a fixed required step.

Ask about it when the answer would materially change the character's spatial relationship, narrative setting, composition, delivery use, or readability. Skip it when the brief or a prior answer already states the background, when the output type constrains it, or when a close crop makes it low-value.

When background is eligible, DeepSeek chooses 3–6 catalog-backed candidates that all answer the same contextual question. The UI always keeps a separate user-owned free-text path. DeepSeek must not invent candidate values.

## Primary-source findings

- Midjourney treats **Environment**, **Lighting**, **Mood**, and **Composition** as separate prompt concerns. It also recommends short, specific descriptions instead of long lists. This supports a dedicated environment decision and rejects catalog dumping. [Midjourney Prompt Basics](https://docs.midjourney.com/hc/en-us/articles/32023408776205-Prompt-Basics)
- Adobe recommends simple, direct prompts built from subject, descriptors, and setting. Its examples show that changing a setting changes the story, while lighting and style remain separate controls. [Adobe Firefly: Writing effective text prompts](https://helpx.adobe.com/sg/firefly/web/work-with-images/generate-images/writing-effective-text-prompts.html)
- Adobe's background workflow explicitly requires a generated background to fit the subject's lighting, shadows, and perspective. Background therefore cannot be selected independently of established composition and lighting facts. [Adobe Photoshop: Generate Background](https://helpx.adobe.com/uk/photoshop/desktop/repair-retouch/remove-objects-fill-space/replace-background-with-generate-background.html)
- NovelAI's character guide defines the character first, then varies pose, camera, and background while warning that excessive detail is not always better. This supports preserving stable character facts and asking only for missing, material context. [NovelAI: Creating Consistent Characters](https://docs.novelai.net/en/image/tutorial-charactercreation/)
- Stability exposes foreground and background as separate prompt inputs and warns that background content can bleed into the subject. This reinforces explicit subject/background boundaries and conflict checks. [Stability AI API reference](https://platform.stability.ai/docs/api-reference)

These sources do not prescribe one universal location list. The useful product decision is therefore a small semantic catalog plus free text, not an exhaustive place taxonomy.

## Current catalog audit

`image_scene` currently contains 17 options:

| Family | Current options | Assessment |
| --- | --- | --- |
| Clean backgrounds | solid, white, black, gradient, transparent | Good delivery coverage; transparent is a delivery constraint rather than a scene |
| Environmental | natural landscape, snow, neon city, urban street, indoor, studio, garden, sky, cosmos | Broad coverage, but `natural_landscape`, `indoor_setting`, and `starry_cosmos` collapse materially different places |
| Artistic | abstract, blurred bokeh, textured | These are treatments rather than locations; bokeh overlaps camera and post-processing |

Concrete code findings:

- Category metadata is not exposed to the model or UI; the manifest sends individual options only.
- `natural_landscape` combines mountains, ocean, and forest.
- `indoor_setting` combines cozy and modern interiors.
- `starry_cosmos` combines a terrestrial night sky and outer space.
- `blurred_bokeh` duplicates camera/post-processing depth-of-field semantics.
- `white_bg`, `black_bg`, `studio_env`, `snow_scene`, and `neon_cityscape` currently inject lighting, time, season, or style semantics into their prompt fragments.
- Existing seed signals mention beach, office, convention, campus, castle, and similar contexts that have no exact catalog option.
- Scene is single-select, so parent/child overlap cannot produce two simultaneous scene IDs, but semantic duplication can still appear across dimensions.

## Recommended taxonomy

Use four semantic families for model reasoning. They do not require a new runtime abstraction; they can remain catalog metadata or prompt guidance.

1. **Controlled backdrop** — solid, white, black, gradient, studio.
2. **Narrative environment** — indoor, urban, garden, natural landscape, snow.
3. **World environment** — neon/futuristic city, sky, cosmos; future evidence may justify historical or fantasy locations.
4. **Background treatment or delivery** — abstract, textured, soft light texture/bokeh, transparent.

The first implementation should keep all 17 IDs. Do not add an exhaustive place ontology. Make these minimum catalog corrections:

1. Remove lighting from `white_bg`, `black_bg`, and `studio_env` fragments.
2. Remove forced winter season from `snow_scene`.
3. Remove shallow-depth-of-field language from `blurred_bokeh`; camera owns depth of field.
4. Keep `transparent_bg` for compatibility, but treat it as a hard delivery constraint in eligibility checks.
5. Preserve exact user wording when a specific place is broader than the matching catalog value; do not replace “维多利亚时代火车站” with generic `indoor_setting`.

Only split or add location IDs after replay/telemetry shows repeated free-text clusters. The first candidates to measure are:

- coast/beach and forest/woodland from `natural_landscape`;
- home/lifestyle, workplace/office, cafe/social, and school/campus from `indoor_setting`;
- historical/cultural, fantasy, and stage/event environments.

This is the smallest catalog change that improves correctness now without freezing a speculative ontology.

## Dimension boundaries

| Dimension | Owns | Does not own |
| --- | --- | --- |
| Background | Location, spatial setting, backdrop medium | Light source, camera blur, art medium |
| Lighting | Source, direction, softness, contrast, color of light | Location |
| Time/season | Day period and season | The physical place |
| Weather/atmosphere | Rain, snow in the air, fog, wind | A snow-covered location by itself |
| Camera/composition | Framing, viewpoint, depth of field, subject/background scale | Narrative place |
| Style | Photo/illustration/rendering language | Location inferred from genre |
| Delivery | Transparency, cutout, compositing requirements | Narrative scene |

Genre, profession, and mood may rank candidates but are not Known facts. “Cyberpunk swordswoman” does not mean neon city; “fantasy elf” does not mean forest; “professional headshot” does not mean studio.

## Eligibility and priority

`Eligible(background) = unanswered × applicable × material × not_constrained`

Evaluate in this order:

| Condition | Result |
| --- | --- |
| Prior answer already confirms background | Skip; never repeat |
| Brief explicitly states a location or backdrop | Skip; preserve exact wording |
| Brief requires transparent/no background | Skip; treat as hard delivery constraint |
| Character sheet, turnaround, sticker, or isolated asset | Skip unless the brief explicitly asks for a setting |
| Close-up/avatar with no narrative environment | Usually skip |
| Wide shot or environmental portrait with no setting | High-priority ask |
| Novel cover, poster, banner, or key visual with no setting | High-priority ask |
| Composition needs negative space, leading lines, or framing architecture | High-priority ask focused on backdrop function |
| Character acts on or interacts with an unspecified environment | High-priority ask |
| Half/full body with role, era, or story cues but no location | Medium-priority ask |
| Brief only says broad indoor/outdoor and detail would materially change output | Ask within that family only |
| No coherent 3–6 candidates can be formed | Skip instead of dumping unrelated options |

## Candidate policy

1. Filter hard conflicts, rejected choices, and delivery-incompatible options.
2. Rank from at most three anchors: output/composition, framing/action, and subject/era/mood.
3. Return 3–6 valid catalog IDs.
4. Keep the set semantically coherent. Options may cross catalog families only when each is a plausible answer to the same contextual question.
5. Show free text separately; it does not count toward 3–6.
6. Preserve specific free text verbatim in the deterministic render path.
7. Never widen a Known fact: “outdoor” cannot yield indoor/studio candidates.

Good question: “这张侦探小说封面里，他身后的环境更偏哪种叙事空间？”
Bad question: “你想要室内、室外、城市、自然还是艺术背景？”

## Replay fixtures

| Brief and known facts | Expected | Rationale / candidate direction |
| --- | --- | --- |
| 海边回眸的女生，胶片感，黄昏 | Skip | Beach is explicit; preserve free text |
| Cyberpunk 女剑士，全身立绘 | Ask high | Neon city, urban street, black, abstract; genre only ranks |
| LinkedIn headshot, white background | Skip | Exact controlled backdrop |
| 银发角色设定表，front/side/back turnaround | Skip | Output constrains a clean non-narrative backdrop |
| Tired detective for a noir novel cover | Ask high | Urban, indoor, black, textured, soft-light backdrop |
| VTuber bust, transparent PNG for Live2D | Skip | Hard delivery constraint |
| 唐风公主半身像，温柔克制 | Ask medium | Garden, indoor, textured, solid; do not invent palace |
| Lone astronaut, extreme wide shot | Ask high | Cosmos, sky, natural landscape, abstract |
| 85mm close-up, warm bokeh lights | Skip | Backdrop treatment already explicit |
| 情侣订婚照，用于邀请函，半身 | Ask high | Garden, landscape, soft-light backdrop, indoor |
| Close-up portrait, moody side lighting | Skip | Background is low materiality |
| Full-body fashion banner with copy space | Ask high | Solid, gradient, studio, abstract, urban |
| 女学生坐在教室窗边，午后阳光 | Skip | Exact location exists; lighting is separate |
| Dancer silhouette on red-to-black gradient | Skip | Exact controlled backdrop |
| Company leadership team for About page | Ask medium | Studio, white, solid, indoor, gradient |
| Moonlit elf archer in an enchanted forest | Skip | Exact environment exists; preserve it |
| 京剧武生全身海报 | Ask high | Black, textured, studio, solid, abstract; do not infer stage |
| 乙游 CG：两人牵手站在樱花树下 | Skip | Exact relational environment exists |
| Weathered cowboy, wide shot at sunset | Ask high | Sunset is time/light, not location |
| Minimal beauty campaign, close crop | Skip | Style does not make a scene material |
| Young wizard reading an ancient book, medium shot | Ask medium | Indoor, garden, cosmos, black, textured |
| Anime key visual, heroes running through a snowstorm | Skip | Environment is already explicit |

## Acceptance signals for the next rubric

Hard failures:

- asks again after an explicit background;
- conflicts with background, output, framing, or delivery Known facts;
- returns a candidate outside the catalog;
- returns fewer than 3 or more than 6 catalog candidates;
- omits the free-text path;
- promotes genre, profession, style, or mood inference into a Known fact;
- returns unrelated catalog samples without a contextual reason for every option.

Suggested replay targets:

- explicit-background repeat rate: 0%;
- catalog ID validity: 100%;
- candidate cardinality compliance: 100%;
- free-text availability and verbatim preservation: 100%;
- ask/skip agreement on approved fixtures: at least 95%;
- generic scene dump rate: at most 5%.

## Implementation implications

This research does not authorize implementation. The next contract and quality-rubric decisions must account for four verified gaps:

1. Runtime currently fixes the next dimension before the model call.
2. Current scene activation does not semantically suppress background facts found in the Subject brief.
3. The response parser does not enforce the promised 3–6 candidate count.
4. Current catalog fragments cross background, lighting, time, style, and camera boundaries.
