/** A searchable field entry returned by the JQL autocomplete data endpoint. */
export interface JiraJqlFieldReference {
  /** The field name as used in JQL (e.g. `'status'`, `'cf[10010]'`) */
  value: string;
  /** The display name shown in the Jira UI */
  displayName: string;
  /** Whether the field supports autocomplete (`'true'`/`'false'` as returned by Jira) */
  auto?: string;
  /** Whether the field can be used in `ORDER BY` (`'true'`/`'false'`) */
  orderable?: string;
  /** Whether the field is searchable (`'true'`/`'false'`) */
  searchable?: string;
  /** Custom field ID, when the field is a custom field */
  cfid?: string;
  /** JQL operators supported by the field */
  operators?: string[];
  /** Value types accepted by the field */
  types?: string[];
}

/** A JQL function entry returned by the autocomplete data endpoint. */
export interface JiraJqlFunctionReference {
  /** The function signature as used in JQL (e.g. `'currentUser()'`) */
  value: string;
  /** The display name shown in the Jira UI */
  displayName: string;
  /** Whether the function returns a list (`'true'`/`'false'`) */
  isList?: string;
  /** Value types produced by the function */
  types?: string[];
}

/**
 * Reference data for building and validating JQL against a real instance:
 * every visible field (including custom fields), every available function,
 * and the reserved words list.
 *
 * `GET /rest/api/latest/jql/autocompletedata`
 */
export interface JiraJqlAutocompleteData {
  visibleFieldNames: JiraJqlFieldReference[];
  visibleFunctionNames: JiraJqlFunctionReference[];
  jqlReservedWords: string[];
}

/** Parameters for the JQL autocomplete suggestions endpoint. */
export interface JqlSuggestionsParams {
  /** The field to suggest values for (e.g. `'status'`, `'reporter'`) */
  fieldName: string;
  /** Partial value typed so far */
  fieldValue?: string;
  /** History predicate to suggest values for (e.g. `'by'`) */
  predicateName?: string;
  /** Partial predicate value typed so far */
  predicateValue?: string;
}

/** A single autocomplete suggestion. */
export interface JiraJqlSuggestion {
  /** The value to insert into the JQL query */
  value: string;
  /** HTML display name, with the matched part highlighted */
  displayName: string;
}

/** Response of the JQL autocomplete suggestions endpoint. */
export interface JiraJqlSuggestionsResponse {
  results: JiraJqlSuggestion[];
}

/** Result of server-side JQL validation via `JiraClient.validateJql()`. */
export interface JqlValidationResult {
  /** `true` when the server accepted the query */
  valid: boolean;
  /** Error messages returned by the server when the query is invalid */
  errors: string[];
}
