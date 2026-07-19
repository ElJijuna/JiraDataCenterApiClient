/**
 * A custom field option (a single selectable value of a select/radio/checkbox
 * custom field).
 *
 * `GET /rest/api/latest/customFieldOption/{id}`
 */
export interface JiraCustomFieldOption {
  /** URL of the option resource */
  self: string;
  /** The option value shown to users */
  value: string;
  /** Whether the option is disabled */
  disabled?: boolean;
}
