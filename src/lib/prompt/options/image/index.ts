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
import { imageProductMaterialOptions } from "./image-product-material.options";
import { imageWeatherOptions } from "./image-weather.options";
import { imageAnimalBreedOptions } from "./image-animal-breed.options";
import { imageAnimalCoatOptions } from "./image-animal-coat.options";
import { imageAnimalPoseOptions } from "./image-animal-pose.options";
import { imageAnimalExpressionOptions } from "./image-animal-expression.options";
import { imageArchStyleOptions } from "./image-arch-style.options";
import { imageArchTypeOptions } from "./image-arch-type.options";
import { imageArchMaterialOptions } from "./image-arch-material.options";
import { imageArchViewpointOptions } from "./image-arch-viewpoint.options";
import { imagePortraitExpressionOptions } from "./image-portrait-expression.options";
import { imageFoodStateOptions } from "./image-food-state.options";
import { imageFoodTablewareOptions } from "./image-food-tableware.options";

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
  imageProductMaterialOptions,
  imageWeatherOptions,
  // P4: animal attribute dims (scoped to pet_animal / wildlife)
  imageAnimalBreedOptions,
  imageAnimalCoatOptions,
  imageAnimalPoseOptions,
  imageAnimalExpressionOptions,
  // P5: architecture attribute dims (scoped to architectural_exterior / interior_space)
  imageArchStyleOptions,
  imageArchTypeOptions,
  imageArchMaterialOptions,
  imageArchViewpointOptions,
  // P6: portrait expression (scoped to single_person / character_design)
  imagePortraitExpressionOptions,
  // P7: food attribute dims (scoped to food_item / beverage_item)
  imageFoodStateOptions,
  imageFoodTablewareOptions,
] satisfies OptionSet[];

for (const set of imageOptionSets) {
  registerOptionSet(set);
}
