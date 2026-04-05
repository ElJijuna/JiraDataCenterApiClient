import type { JiraStatus } from './Status';

/**
 * Query parameters for listing issue transitions.
 */
export interface TransitionsParams {
  /** Transition ID to return a single transition */
  transitionId?: string;
  /** Fields to expand */
  expand?: string;
  /** Whether to skip remapping of issues during transition */
  skipRemoteOnlyCondition?: boolean;
}

/**
 * A workflow transition available for a Jira issue.
 */
export interface JiraTransition {
  /** Transition ID */
  id: string;
  /** Transition name */
  name: string;
  /** The status the issue will move to */
  to: JiraStatus;
  /** Whether this transition has a screen associated with it */
  hasScreen: boolean;
  /** Whether this is a global transition (appears from any status) */
  isGlobal: boolean;
  /** Whether this is the initial transition */
  isInitial: boolean;
  /** Whether this transition is conditionally available */
  isAvailable?: boolean;
  /** Whether this is a conditional transition */
  isConditional?: boolean;
  /** Whether the transition is looped */
  isLooped?: boolean;
  /** Fields required by the transition screen */
  fields?: Record<string, JiraTransitionField>;
}

/**
 * A field required by a transition screen.
 */
export interface JiraTransitionField {
  /** Whether the field is required */
  required: boolean;
  /** Field schema information */
  schema?: { type: string; system?: string; custom?: string; customId?: number };
  /** Field name */
  name: string;
  /** Field key */
  key?: string;
  /** Whether the field has a default value */
  hasDefaultValue?: boolean;
  /** Allowed values for the field */
  allowedValues?: unknown[];
}
