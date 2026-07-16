/** One answered dimension in the running conversation. */
export interface AgentHistoryItem {
  questionId: string;
  selectedOptionIds: string[];
  /** Free-text the user typed for this dimension (escape hatch); overrides options. */
  freeText?: string;
}

/** The agent's structured decision for the next turn. Returned via Anthropic
 *  tool-use so we never parse free text. */
export interface AgentDecision {
  /** Dimension id to ask next. Must exist in the catalog manifest. */
  nextQuestionId: string;
  /** Contextual wording for an Adaptive Ask. Fixed routing uses the catalog title. */
  questionText?: string;
  /** Subset of that dimension's option ids to surface (the agent narrows). */
  visibleOptionIds: string[];
  /** One short zh sentence guiding the user on this step. */
  helperText?: string;
  /** True when the agent judges it has gathered enough to produce a prompt. */
  done: boolean;
}
