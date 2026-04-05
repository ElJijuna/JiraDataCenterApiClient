import type { JiraUser } from './User';

/**
 * A Jira project component.
 */
export interface JiraComponent {
  /** URL of the component resource */
  self?: string;
  /** Numeric string ID */
  id?: string;
  /** Component name */
  name: string;
  /** Component description */
  description?: string;
  /** The user designated as the component lead */
  lead?: JiraUser;
  /** Assignee type for issues created with this component */
  assigneeType?: 'PROJECT_DEFAULT' | 'COMPONENT_LEAD' | 'PROJECT_LEAD' | 'UNASSIGNED';
  /** The auto-assigned user for this component */
  assignee?: JiraUser;
  /** The real assignee for this component */
  realAssignee?: JiraUser;
  /** Whether the real assignee is enabled */
  realAssigneeType?: string;
  /** Whether the component is enabled */
  isAssigneeTypeValid?: boolean;
  /** Project key this component belongs to */
  project?: string;
  /** Project ID this component belongs to */
  projectId?: number;
}
