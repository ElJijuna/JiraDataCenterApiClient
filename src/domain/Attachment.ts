import type { JiraUser } from './User';

/**
 * A file attachment on a Jira issue.
 */
export interface JiraAttachment {
  /** URL of the attachment resource */
  self: string;
  /** Numeric string ID */
  id: string;
  /** Original file name */
  filename: string;
  /** User who uploaded the attachment */
  author?: JiraUser;
  /** ISO 8601 date the attachment was created */
  created: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  mimeType: string;
  /** URL to download the attachment content */
  content: string;
  /** URL to the thumbnail (images only) */
  thumbnail?: string;
}
