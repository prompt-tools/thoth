import { registerOptionSet } from "../../registry";
import type { OptionSet } from "../../types";
import { imageUseCaseOptions } from "./image-use-case.options";
import { imageSubjectOptions } from "./image-subject.options";
import { imageSceneOptions } from "./image-scene.options";
import { imageCompositionOptions } from "./image-composition.options";
import { imageArtStyleOptions } from "./image-art-style.options";
import { imageColorPaletteOptions } from "./image-color-palette.options";
import { imageLightingOptions } from "./image-lighting.options";
import { imageMoodOptions } from "./image-mood.options";
import { imagePerspectiveOptions } from "./image-perspective.options";
import { imageAspectRatioOptions } from "./image-aspect-ratio.options";
import { imageDetailLevelOptions } from "./image-detail-level.options";
import { imagePostProcessingOptions } from "./image-post-processing.options";
import { imageConstraintsOptions } from "./image-constraints.options";
import { imageTimeSeasonOptions } from "./image-time-season.options";
import { imagePublishScenarioOptions } from "./image-publish-scenario.options";
import { imageFramingOptions } from "./image-framing.options";
import { imageCameraAngleOptions } from "./image-camera-angle.options";
import { imageCameraOptions } from "./image-camera.options";
import { imagePoseOptions } from "./image-pose.options";
import { imageOutfitOptions } from "./image-outfit.options";
import { imageHairOptions } from "./image-hair.options";
import { imagePortraitExpressionOptions } from "./image-portrait-expression.options";
import { imagePersonTypeOptions } from "./image-person-type.options";
import { imageGenderPresentationOptions } from "./image-gender-presentation.options";
import { imageAgeBandOptions } from "./image-age-band.options";
import { imageSkinToneOptions } from "./image-skin-tone.options";
import { imageFaceFeaturesOptions } from "./image-face-features.options";
import { imageBodyTypeOptions } from "./image-body-type.options";
import { imageCharacterArchetypeOptions } from "./image-character-archetype.options";
import { imageCharacterRenderStyleOptions } from "./image-character-render-style.options";
import { imageCharacterInteractionOptions } from "./image-character-interaction.options";

const imageOptionSets = [
  imagePublishScenarioOptions,
  imageUseCaseOptions,
  imageSubjectOptions,
  imageSceneOptions,
  imageCompositionOptions,
  imageArtStyleOptions,
  imageColorPaletteOptions,
  imageLightingOptions,
  imageMoodOptions,
  imagePerspectiveOptions,
  imageAspectRatioOptions,
  imageDetailLevelOptions,
  imagePostProcessingOptions,
  imageConstraintsOptions,
  imageTimeSeasonOptions,
  imageFramingOptions,
  imageCameraAngleOptions,
  imageCameraOptions,
  imagePoseOptions,
  imageOutfitOptions,
  imageHairOptions,
  imagePortraitExpressionOptions,
  imagePersonTypeOptions,
  imageGenderPresentationOptions,
  imageAgeBandOptions,
  imageSkinToneOptions,
  imageFaceFeaturesOptions,
  imageBodyTypeOptions,
  imageCharacterArchetypeOptions,
  imageCharacterRenderStyleOptions,
  imageCharacterInteractionOptions,
] satisfies OptionSet[];

for (const set of imageOptionSets) {
  registerOptionSet(set);
}
