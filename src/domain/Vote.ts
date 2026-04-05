import type { JiraUser } from './User';

/**
 * Vote information for a Jira issue.
 */
export interface JiraVotes {
  /** URL of the votes resource */
  self: string;
  /** Total number of votes */
  votes: number;
  /** Whether the authenticated user has voted */
  hasVoted: boolean;
  /** Users who have voted (only returned when expanding votes) */
  voters?: JiraUser[];
}
