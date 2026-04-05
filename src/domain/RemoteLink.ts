/**
 * A remote link (e.g. to a web URL) associated with a Jira issue.
 */
export interface JiraRemoteLink {
  /** URL of the remote link resource */
  self: string;
  /** Numeric ID */
  id: number;
  /** Global unique ID used for deduplication across systems */
  globalId?: string;
  /** Application info for the linked external system */
  application?: {
    type?: string;
    name?: string;
  };
  /** Relationship description (e.g. `'is implemented by'`) */
  relationship?: string;
  /** The linked remote object */
  object: JiraRemoteLinkObject;
}

/**
 * The remote object referenced by a {@link JiraRemoteLink}.
 */
export interface JiraRemoteLinkObject {
  /** URL of the remote resource */
  url: string;
  /** Title of the remote resource */
  title: string;
  /** Summary / description */
  summary?: string;
  /** Icon for the remote resource */
  icon?: {
    url16x16?: string;
    title?: string;
    link?: string;
  };
  /** Status of the remote resource */
  status?: {
    resolved?: boolean;
    icon?: {
      url16x16?: string;
      title?: string;
      link?: string;
    };
  };
}
