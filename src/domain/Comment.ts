import type { JiraUser } from './User';
import type { PaginationParams } from './Pagination';

/**
 * Query parameters for listing issue comments.
 */
export interface CommentsParams extends PaginationParams {
  /** Field to order results by (e.g. `'created'`) */
  orderBy?: string;
  /** Fields to expand (e.g. `'renderedBody'`) */
  expand?: string;
}

/**
 * A comment on a Jira issue.
 */
export interface JiraComment {
  /** URL of the comment resource */
  self: string;
  /** Numeric string ID */
  id: string;
  /** User who created the comment */
  author?: JiraUser;
  /** Comment body text */
  body: string;
  /** Rendered HTML body (when `expand=renderedBody` is used) */
  renderedBody?: string;
  /** User who last updated the comment */
  updateAuthor?: JiraUser;
  /** ISO 8601 date the comment was created */
  created: string;
  /** ISO 8601 date the comment was last updated */
  updated: string;
  /** Visibility restriction for the comment */
  visibility?: JiraCommentVisibility;
}

/**
 * Visibility restriction on a comment.
 */
export interface JiraCommentVisibility {
  /** Restriction type: `'role'` or `'group'` */
  type: 'role' | 'group';
  /** Role or group name */
  value: string;
}

/**
 * Paged wrapper returned by `GET /rest/api/latest/issue/{key}/comment`.
 */
export interface JiraCommentResponse {
  /** Comments in this page */
  comments: JiraComment[];
  /** Index of the first comment */
  startAt: number;
  /** Maximum number of comments returned */
  maxResults: number;
  /** Total number of comments */
  total: number;
}
