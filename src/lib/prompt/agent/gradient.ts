// Portrait-only gradient. Non-portrait primary types were removed so the
// adaptive guide only asks questions that serve human portraits and characters.


export type Precision = "simple" | "standard" | "detailed";

export interface GradientItem {
  questionId: string;
  rationale?: string;
  corpusFreq?: number | null;
  source: string;
  /** See QuestionSchema.scopeToOption — gate this dim on a selected subject option. */
  scopeToOption?: string[];
}

export interface PrecompiledCondition {
  dimension: string;
  op: "in";
  values: string[];  // full-prefix option ids: image_<dim>:<suffix>
}

export interface ConditionalEntry {
  questionId: string;
  condition: PrecompiledCondition;
  minPrecision: Precision | "any";
  tierWhenActive: "suppress" | "activate";
  source: string;
}

export interface PrimaryTypeGradient {
  type: string;
  essential: GradientItem[];
  secondary: GradientItem[];
  tertiary: GradientItem[];
  conditional: ConditionalEntry[];
  order: string[];
}

export interface GradientData {
  shared: {
    essential: GradientItem[];
    tertiary: GradientItem[];
  };
  primaryTypes: PrimaryTypeGradient[];
}

export const GRADIENT: GradientData = {
  "shared": {
    "essential": [],
    "tertiary": [
      {
        "questionId": "detail_level",
        "source": "audit:always(倒数第二步)"
      },
      {
        "questionId": "use_case",
        "source": "audit:always(入口路由后)"
      }
    ]
  },
  "primaryTypes": [
    {
      "type": "人像",
      "essential": [
        {
          "questionId": "subject",
          "rationale": "主体=人物类型，首轮必问",
          "corpusFreq": 667,
          "source": "audit:always"
        },
        {
          "questionId": "person_type",
          "rationale": "人物方向决定是真人写真、漂亮男女、游戏/小说/乙游/二次元角色",
          "corpusFreq": null,
          "source": "portrait-only:taxonomy",
          "scopeToOption": [
            "image_subject:single_person",
            "image_subject:beautiful_woman",
            "image_subject:handsome_man",
            "image_subject:couple_portrait",
            "image_subject:group_portrait",
            "image_subject:game_character",
            "image_subject:novel_character",
            "image_subject:otome_character",
            "image_subject:anime_character",
            "image_subject:virtual_idol",
            "image_subject:cosplay_character",
            "image_subject:character_design",
            "image_subject:silhouette_figure"
          ]
        },
        {
          "questionId": "gender_presentation",
          "rationale": "性别呈现影响脸部、服饰、姿态和角色气质",
          "corpusFreq": null,
          "source": "portrait-only:taxonomy",
          "scopeToOption": [
            "image_subject:single_person",
            "image_subject:beautiful_woman",
            "image_subject:handsome_man",
            "image_subject:couple_portrait",
            "image_subject:group_portrait",
            "image_subject:game_character",
            "image_subject:novel_character",
            "image_subject:otome_character",
            "image_subject:anime_character",
            "image_subject:virtual_idol",
            "image_subject:cosplay_character",
            "image_subject:character_design",
            "image_subject:silhouette_figure"
          ]
        },
        {
          "questionId": "framing",
          "rationale": "景别控深枢纽，决定后续细节深度",
          "corpusFreq": null,
          "source": "audit:always"
        },
        {
          "questionId": "portrait_expression",
          "rationale": "人物表情/神态是人像和角色图核心",
          "corpusFreq": null,
          "source": "portrait-only:expression",
          "scopeToOption": [
            "image_subject:single_person",
            "image_subject:beautiful_woman",
            "image_subject:handsome_man",
            "image_subject:couple_portrait",
            "image_subject:group_portrait",
            "image_subject:game_character",
            "image_subject:novel_character",
            "image_subject:otome_character",
            "image_subject:anime_character",
            "image_subject:virtual_idol",
            "image_subject:cosplay_character",
            "image_subject:character_design",
            "image_subject:silhouette_figure"
          ]
        }
      ],
      "secondary": [
        {
          "questionId": "scene",
          "rationale": "场景/背景（简单模式由自动补全承担）",
          "corpusFreq": 860,
          "source": "audit:always"
        },
        {
          "questionId": "aspect_ratio",
          "rationale": "画幅比例（标准精度起问）",
          "corpusFreq": null,
          "source": "audit:always"
        },
        {
          "questionId": "age_band",
          "rationale": "年龄段影响真实人像、小说人物和角色设定的可信度",
          "corpusFreq": null,
          "source": "portrait-only:identity",
          "scopeToOption": [
            "image_subject:single_person",
            "image_subject:beautiful_woman",
            "image_subject:handsome_man",
            "image_subject:couple_portrait",
            "image_subject:group_portrait",
            "image_subject:game_character",
            "image_subject:novel_character",
            "image_subject:otome_character",
            "image_subject:anime_character",
            "image_subject:virtual_idol",
            "image_subject:cosplay_character",
            "image_subject:character_design",
            "image_subject:silhouette_figure"
          ]
        },
        {
          "questionId": "skin_tone",
          "rationale": "肤色/肤质与真实人像质量、角色辨识度相关",
          "corpusFreq": null,
          "source": "portrait-only:identity",
          "scopeToOption": [
            "image_subject:single_person",
            "image_subject:beautiful_woman",
            "image_subject:handsome_man",
            "image_subject:couple_portrait",
            "image_subject:group_portrait",
            "image_subject:game_character",
            "image_subject:novel_character",
            "image_subject:otome_character",
            "image_subject:anime_character",
            "image_subject:virtual_idol",
            "image_subject:cosplay_character",
            "image_subject:character_design",
            "image_subject:silhouette_figure"
          ]
        },
        {
          "questionId": "face_features",
          "rationale": "脸型/五官是人物提示词结构中的身份锁定块",
          "corpusFreq": null,
          "source": "portrait-only:identity",
          "scopeToOption": [
            "image_subject:single_person",
            "image_subject:beautiful_woman",
            "image_subject:handsome_man",
            "image_subject:couple_portrait",
            "image_subject:group_portrait",
            "image_subject:game_character",
            "image_subject:novel_character",
            "image_subject:otome_character",
            "image_subject:anime_character",
            "image_subject:virtual_idol",
            "image_subject:cosplay_character",
            "image_subject:character_design",
            "image_subject:silhouette_figure"
          ]
        },
        {
          "questionId": "body_type",
          "rationale": "半身/全身图需要明确身形比例；特写时可抑制",
          "corpusFreq": null,
          "source": "portrait-only:identity",
          "scopeToOption": [
            "image_subject:single_person",
            "image_subject:beautiful_woman",
            "image_subject:handsome_man",
            "image_subject:couple_portrait",
            "image_subject:group_portrait",
            "image_subject:game_character",
            "image_subject:novel_character",
            "image_subject:otome_character",
            "image_subject:anime_character",
            "image_subject:virtual_idol",
            "image_subject:cosplay_character",
            "image_subject:character_design",
            "image_subject:silhouette_figure"
          ]
        },
        {
          "questionId": "character_archetype",
          "rationale": "游戏/小说/乙游/虚拟角色需要角色原型和身份气质",
          "corpusFreq": null,
          "source": "portrait-only:character",
          "scopeToOption": [
            "image_subject:game_character",
            "image_subject:novel_character",
            "image_subject:otome_character",
            "image_subject:anime_character",
            "image_subject:virtual_idol",
            "image_subject:cosplay_character",
            "image_subject:character_design"
          ]
        },
        {
          "questionId": "character_render_style",
          "rationale": "真人/半写实/乙游CG/卡面/小说封面决定输出语言",
          "corpusFreq": null,
          "source": "portrait-only:character",
          "scopeToOption": [
            "image_subject:single_person",
            "image_subject:beautiful_woman",
            "image_subject:handsome_man",
            "image_subject:couple_portrait",
            "image_subject:group_portrait",
            "image_subject:game_character",
            "image_subject:novel_character",
            "image_subject:otome_character",
            "image_subject:anime_character",
            "image_subject:virtual_idol",
            "image_subject:cosplay_character",
            "image_subject:character_design",
            "image_subject:silhouette_figure"
          ]
        },
        {
          "questionId": "character_interaction",
          "rationale": "动作/互动覆盖乙游POV、情侣关系、战斗和道具动作",
          "corpusFreq": null,
          "source": "portrait-only:character",
          "scopeToOption": [
            "image_subject:single_person",
            "image_subject:beautiful_woman",
            "image_subject:handsome_man",
            "image_subject:couple_portrait",
            "image_subject:group_portrait",
            "image_subject:game_character",
            "image_subject:novel_character",
            "image_subject:otome_character",
            "image_subject:anime_character",
            "image_subject:virtual_idol",
            "image_subject:cosplay_character",
            "image_subject:character_design",
            "image_subject:silhouette_figure"
          ]
        },
        {
          "questionId": "lighting",
          "rationale": "光线对人像质感影响大，但人像分支降级/pro 档（doc §3.3）",
          "corpusFreq": 580,
          "source": "redesign:P2:lighting-demote"
        },
        {
          "questionId": "color_palette",
          "rationale": "色调降级为 secondary（owner decision 3，去除 maintainer-override pin）",
          "corpusFreq": 103,
          "source": "redesign:P2:color-demote"
        },
        {
          "questionId": "camera",
          "rationale": "镜头焦段决定透视/景深，audit 人像 always",
          "corpusFreq": 403,
          "source": "audit:always(demoted:非首问核心,降simple动线)"
        },
        {
          "questionId": "camera_angle",
          "rationale": "机位/视角影响人像气势、乙游代入和角色卡面张力",
          "corpusFreq": null,
          "source": "portrait-only:camera-angle"
        },
        {
          "questionId": "art_style",
          "rationale": "画风影响整体视觉；audit precision>=medium",
          "corpusFreq": 435,
          "source": "audit:precision>=medium"
        },
        {
          "questionId": "mood",
          "rationale": "情绪/氛围",
          "corpusFreq": 201,
          "source": "audit:precision>=medium"
        },
        {
          "questionId": "pose",
          "rationale": "姿态/动作；audit 人像 always 但 framing=close_up 时 suppress",
          "corpusFreq": 133,
          "source": "audit:always",
          "scopeToOption": [
            "image_subject:single_person",
            "image_subject:beautiful_woman",
            "image_subject:handsome_man",
            "image_subject:couple_portrait",
            "image_subject:group_portrait",
            "image_subject:game_character",
            "image_subject:novel_character",
            "image_subject:otome_character",
            "image_subject:anime_character",
            "image_subject:virtual_idol",
            "image_subject:cosplay_character",
            "image_subject:character_design",
            "image_subject:silhouette_figure"
          ]
        },
        {
          "questionId": "outfit",
          "rationale": "着装/造型；framing=close_up 时 suppress",
          "corpusFreq": 187,
          "source": "audit:always",
          "scopeToOption": [
            "image_subject:single_person",
            "image_subject:beautiful_woman",
            "image_subject:handsome_man",
            "image_subject:couple_portrait",
            "image_subject:group_portrait",
            "image_subject:game_character",
            "image_subject:novel_character",
            "image_subject:otome_character",
            "image_subject:anime_character",
            "image_subject:virtual_idol",
            "image_subject:cosplay_character",
            "image_subject:character_design",
            "image_subject:silhouette_figure"
          ]
        },
        {
          "questionId": "hair",
          "rationale": "发型；特写/半身时有意义",
          "corpusFreq": 50,
          "source": "audit:always",
          "scopeToOption": [
            "image_subject:single_person",
            "image_subject:beautiful_woman",
            "image_subject:handsome_man",
            "image_subject:couple_portrait",
            "image_subject:group_portrait",
            "image_subject:game_character",
            "image_subject:novel_character",
            "image_subject:otome_character",
            "image_subject:anime_character",
            "image_subject:virtual_idol",
            "image_subject:cosplay_character",
            "image_subject:character_design",
            "image_subject:silhouette_figure"
          ]
        }
      ],
      "tertiary": [
        {
          "questionId": "composition",
          "rationale": "专业人像/角色图需要控制留白、主体位置和封面空间",
          "corpusFreq": 248,
          "source": "portrait-only:composition"
        },
        {
          "questionId": "post_processing",
          "rationale": "后期效果；precision=high",
          "corpusFreq": null,
          "source": "audit:precision=high"
        }
      ],
      "conditional": [
        {
          "questionId": "pose",
          "condition": {
            "dimension": "framing",
            "op": "in",
            "values": [
              "image_framing:close_up"
            ]
          },
          "minPrecision": "any",
          "tierWhenActive": "suppress",
          "source": "audit:framingDepthRules"
        },
        {
          "questionId": "outfit",
          "condition": {
            "dimension": "framing",
            "op": "in",
            "values": [
              "image_framing:close_up"
            ]
          },
          "minPrecision": "any",
          "tierWhenActive": "suppress",
          "source": "audit:framingDepthRules"
        },
        {
          "questionId": "body_type",
          "condition": {
            "dimension": "framing",
            "op": "in",
            "values": [
              "image_framing:close_up"
            ]
          },
          "minPrecision": "any",
          "tierWhenActive": "suppress",
          "source": "portrait-only:framingDepthRules"
        },
        {
          "questionId": "character_interaction",
          "condition": {
            "dimension": "framing",
            "op": "in",
            "values": [
              "image_framing:close_up"
            ]
          },
          "minPrecision": "any",
          "tierWhenActive": "suppress",
          "source": "portrait-only:framingDepthRules"
        },
        {
          "questionId": "hair",
          "condition": {
            "dimension": "framing",
            "op": "in",
            "values": [
              "image_framing:wide_shot",
              "image_framing:extreme_wide"
            ]
          },
          "minPrecision": "any",
          "tierWhenActive": "suppress",
          "source": "audit:framingDepthRules"
        }
      ],
      "order": [
        "subject",
        "person_type",
        "gender_presentation",
        "framing",
        "portrait_expression",
        "scene",
        "aspect_ratio",
        "age_band",
        "face_features",
        "hair",
        "outfit",
        "pose",
        "body_type",
        "skin_tone",
        "lighting",
        "camera",
        "camera_angle",
        "character_render_style",
        "character_archetype",
        "character_interaction",
        "color_palette",
        "art_style",
        "mood",
        "composition",
        "post_processing"
      ]
    },
    {
      "type": "通用",
      "essential": [
        {
          "questionId": "subject",
          "rationale": "通用入口也固定为人像主体",
          "corpusFreq": 667,
          "source": "portrait-only:fallback"
        },
        {
          "questionId": "person_type",
          "rationale": "无描述时仍先明确人像方向",
          "corpusFreq": null,
          "source": "portrait-only:fallback",
          "scopeToOption": [
            "image_subject:single_person",
            "image_subject:beautiful_woman",
            "image_subject:handsome_man",
            "image_subject:couple_portrait",
            "image_subject:group_portrait",
            "image_subject:game_character",
            "image_subject:novel_character",
            "image_subject:otome_character",
            "image_subject:anime_character",
            "image_subject:virtual_idol",
            "image_subject:cosplay_character",
            "image_subject:character_design",
            "image_subject:silhouette_figure"
          ]
        },
        {
          "questionId": "gender_presentation",
          "rationale": "无描述时仍收窄性别呈现",
          "corpusFreq": null,
          "source": "portrait-only:fallback",
          "scopeToOption": [
            "image_subject:single_person",
            "image_subject:beautiful_woman",
            "image_subject:handsome_man",
            "image_subject:couple_portrait",
            "image_subject:group_portrait",
            "image_subject:game_character",
            "image_subject:novel_character",
            "image_subject:otome_character",
            "image_subject:anime_character",
            "image_subject:virtual_idol",
            "image_subject:cosplay_character",
            "image_subject:character_design",
            "image_subject:silhouette_figure"
          ]
        },
        {
          "questionId": "framing",
          "rationale": "景别控深",
          "corpusFreq": null,
          "source": "portrait-only:fallback"
        },
        {
          "questionId": "portrait_expression",
          "rationale": "表情/神态",
          "corpusFreq": null,
          "source": "portrait-only:fallback",
          "scopeToOption": [
            "image_subject:single_person",
            "image_subject:beautiful_woman",
            "image_subject:handsome_man",
            "image_subject:couple_portrait",
            "image_subject:group_portrait",
            "image_subject:game_character",
            "image_subject:novel_character",
            "image_subject:otome_character",
            "image_subject:anime_character",
            "image_subject:virtual_idol",
            "image_subject:cosplay_character",
            "image_subject:character_design",
            "image_subject:silhouette_figure"
          ]
        }
      ],
      "secondary": [
        {
          "questionId": "scene",
          "rationale": "人像背景/场景（简单模式由自动补全承担）",
          "corpusFreq": 860,
          "source": "portrait-only:fallback"
        },
        {
          "questionId": "aspect_ratio",
          "rationale": "画幅比例（标准精度起问）",
          "corpusFreq": null,
          "source": "portrait-only:fallback"
        },
        {
          "questionId": "lighting",
          "rationale": "人像光线",
          "corpusFreq": 580,
          "source": "portrait-only:fallback"
        },
        {
          "questionId": "camera",
          "rationale": "人像镜头",
          "corpusFreq": 403,
          "source": "portrait-only:fallback"
        },
        {
          "questionId": "character_render_style",
          "rationale": "角色/人像呈现风格",
          "corpusFreq": null,
          "source": "portrait-only:fallback",
          "scopeToOption": [
            "image_subject:single_person",
            "image_subject:beautiful_woman",
            "image_subject:handsome_man",
            "image_subject:couple_portrait",
            "image_subject:group_portrait",
            "image_subject:game_character",
            "image_subject:novel_character",
            "image_subject:otome_character",
            "image_subject:anime_character",
            "image_subject:virtual_idol",
            "image_subject:cosplay_character",
            "image_subject:character_design",
            "image_subject:silhouette_figure"
          ]
        }
      ],
      "tertiary": [],
      "conditional": [],
      "order": [
        "subject",
        "person_type",
        "gender_presentation",
        "framing",
        "portrait_expression",
        "scene",
        "aspect_ratio",
        "lighting",
        "camera",
        "character_render_style"
      ]
    }
  ]
};
