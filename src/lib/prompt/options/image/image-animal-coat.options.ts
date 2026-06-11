import type { OptionSet } from "../../types";

/**
 * P4: Animal coat color and pattern vocabulary.
 * Covers the main coat types well-represented in T2I training data.
 * Scoped to image_subject:pet_animal and image_subject:wildlife via gradient.
 */
export const imageAnimalCoatOptions: OptionSet = {
  id: "image_animal_coat",
  version: "0.1.0",
  label: { zh: "毛色/花纹", en: "Coat color / pattern" },
  options: [
    {
      id: "image_animal_coat:solid_golden",
      version: "0.1.0",
      label: { zh: "纯金色/奶油色", en: "Golden / cream" },
      plain: { zh: "金色或奶油色纯色毛", en: "Solid golden or cream fur" },
      professionalTerms: ["golden coat", "cream coat"],
      promptFragment: {
        zh: "纯金色或奶油色被毛，毛色均匀光泽，温暖柔和的色调",
        en: "solid golden or cream coat with uniform sheen and warm soft tone",
      },
      riskHint: { zh: "", en: "" },
      appliesTo: ["generic_image"],
    },
    {
      id: "image_animal_coat:solid_black",
      version: "0.1.0",
      label: { zh: "纯黑色", en: "Solid black" },
      plain: { zh: "全身纯黑色被毛", en: "All-black coat" },
      professionalTerms: ["solid black coat", "black fur"],
      promptFragment: {
        zh: "全身纯黑色被毛，深邃光滑，毛发在光线下呈现蓝黑色光泽",
        en: "solid black coat, deep and glossy with a blue-black sheen in the light",
      },
      riskHint: { zh: "", en: "" },
      appliesTo: ["generic_image"],
    },
    {
      id: "image_animal_coat:solid_white",
      version: "0.1.0",
      label: { zh: "纯白色", en: "Solid white" },
      plain: { zh: "全身纯白色被毛", en: "All-white coat" },
      professionalTerms: ["solid white coat", "white fur"],
      promptFragment: {
        zh: "全身纯白色被毛，柔软蓬松，干净无杂色",
        en: "solid white coat, soft and fluffy with no color variation",
      },
      riskHint: { zh: "", en: "" },
      appliesTo: ["generic_image"],
    },
    {
      id: "image_animal_coat:orange_tabby",
      version: "0.1.0",
      label: { zh: "橘色虎斑", en: "Orange tabby" },
      plain: { zh: "橘色底配虎斑条纹", en: "Orange base with tabby stripes" },
      professionalTerms: ["orange tabby", "ginger tabby coat"],
      promptFragment: {
        zh: "橘色虎斑毛色，鲜亮橙红底色配深棕色斑纹条纹",
        en: "orange tabby coat with bright ginger base and deep brown tabby stripe markings",
      },
      riskHint: { zh: "", en: "" },
      appliesTo: ["generic_image"],
    },
    {
      id: "image_animal_coat:gray_tabby",
      version: "0.1.0",
      label: { zh: "灰色虎斑", en: "Gray tabby" },
      plain: { zh: "灰色底配虎斑条纹", en: "Gray base with tabby stripes" },
      professionalTerms: ["gray tabby", "silver tabby coat"],
      promptFragment: {
        zh: "灰色虎斑毛色，银灰色底色配深灰色斑纹条纹，低调而优雅",
        en: "gray tabby coat with silver-gray base and dark gray tabby stripe markings",
      },
      riskHint: { zh: "", en: "" },
      appliesTo: ["generic_image"],
    },
    {
      id: "image_animal_coat:tuxedo",
      version: "0.1.0",
      label: { zh: "黑白燕尾服", en: "Tuxedo" },
      plain: { zh: "黑白双色，腹部和胸部白色", en: "Black and white with white belly and chest" },
      professionalTerms: ["tuxedo cat coat", "bicolor black-white"],
      promptFragment: {
        zh: "黑白燕尾服花色，黑色背部与白色胸腹形成鲜明对比，干净利落",
        en: "tuxedo bicolor coat with black back and white chest and belly in a clean formal contrast",
      },
      riskHint: { zh: "", en: "" },
      appliesTo: ["generic_image"],
    },
    {
      id: "image_animal_coat:calico",
      version: "0.1.0",
      label: { zh: "三花/玳瑁", en: "Calico / tortoiseshell" },
      plain: { zh: "橙、黑、白三色混合", en: "Orange, black and white patchwork" },
      professionalTerms: ["calico coat", "tortoiseshell coat", "tricolor cat"],
      promptFragment: {
        zh: "三花或玳瑁被毛，橙、黑、白三色不规则拼色，每只都独一无二",
        en: "calico or tortoiseshell coat with irregular patchwork of orange, black and white — uniquely patterned",
      },
      riskHint: { zh: "", en: "" },
      appliesTo: ["generic_image"],
    },
    {
      id: "image_animal_coat:bicolor_black_white",
      version: "0.1.0",
      label: { zh: "黑白双色", en: "Black and white" },
      plain: { zh: "黑白双色大面积拼色", en: "Large-patch black and white bicolor" },
      professionalTerms: ["bicolor coat", "piebald"],
      promptFragment: {
        zh: "黑白双色被毛，大块色斑分布，清晰的颜色边界",
        en: "black-and-white bicolor coat with large color patches and clean color boundaries",
      },
      riskHint: { zh: "", en: "" },
      appliesTo: ["generic_image"],
    },
    {
      id: "image_animal_coat:merle_spotted",
      version: "0.1.0",
      label: { zh: "梅花斑/斑点", en: "Merle / spotted" },
      plain: { zh: "大理石花纹或斑点图案", en: "Marbled or dappled spot pattern" },
      professionalTerms: ["merle coat", "dappled coat", "spotted pattern"],
      promptFragment: {
        zh: "梅花斑或斑点被毛，底色上分布不规则暗色斑块，视觉独特",
        en: "merle or spotted coat with irregular dark patches distributed over the base color",
      },
      riskHint: { zh: "", en: "" },
      appliesTo: ["generic_image"],
    },
    {
      id: "image_animal_coat:colorpoint",
      version: "0.1.0",
      label: { zh: "重色点（暹罗色）", en: "Colorpoint" },
      plain: { zh: "浅色身体配深色面耳爪尾", en: "Light body with dark face, ears, paws and tail" },
      professionalTerms: ["colorpoint coat", "Siamese-pattern coat"],
      promptFragment: {
        zh: "重色点被毛，浅色（奶油/白）躯体，深色（深褐/灰蓝）面部、耳朵、四肢末端和尾巴",
        en: "colorpoint coat with light cream or white body and dark seal, blue or lilac point markings on face, ears, paws and tail",
      },
      riskHint: { zh: "", en: "" },
      appliesTo: ["generic_image"],
    },
  ],
};
