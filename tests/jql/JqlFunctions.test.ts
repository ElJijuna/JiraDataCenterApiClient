import { JqlFunctions } from '../../src/jql/JqlFunctions';
import { JqlRaw } from '../../src/jql/JqlRaw';

describe('JqlFunctions', () => {
  it('renders zero-argument functions', () => {
    expect(JqlFunctions.currentUser().toJql()).toBe('currentUser()');
    expect(JqlFunctions.currentLogin().toJql()).toBe('currentLogin()');
    expect(JqlFunctions.lastLogin().toJql()).toBe('lastLogin()');
    expect(JqlFunctions.now().toJql()).toBe('now()');
    expect(JqlFunctions.openSprints().toJql()).toBe('openSprints()');
    expect(JqlFunctions.closedSprints().toJql()).toBe('closedSprints()');
    expect(JqlFunctions.futureSprints().toJql()).toBe('futureSprints()');
    expect(JqlFunctions.issueHistory().toJql()).toBe('issueHistory()');
    expect(JqlFunctions.votedIssues().toJql()).toBe('votedIssues()');
    expect(JqlFunctions.watchedIssues().toJql()).toBe('watchedIssues()');
    expect(JqlFunctions.standardIssueTypes().toJql()).toBe('standardIssueTypes()');
    expect(JqlFunctions.subTaskIssueTypes().toJql()).toBe('subTaskIssueTypes()');
  });

  it('quotes string arguments', () => {
    expect(JqlFunctions.membersOf('jira-developers').toJql()).toBe('membersOf("jira-developers")');
    expect(JqlFunctions.earliestUnreleasedVersion('OPS').toJql()).toBe(
      'earliestUnreleasedVersion("OPS")',
    );
    expect(JqlFunctions.latestReleasedVersion('OPS').toJql()).toBe('latestReleasedVersion("OPS")');
    expect(JqlFunctions.projectsWhereUserHasPermission('Edit Issues').toJql()).toBe(
      'projectsWhereUserHasPermission("Edit Issues")',
    );
    expect(JqlFunctions.projectsWhereUserHasRole('Developers').toJql()).toBe(
      'projectsWhereUserHasRole("Developers")',
    );
  });

  it('renders date period functions with and without offsets', () => {
    expect(JqlFunctions.startOfDay().toJql()).toBe('startOfDay()');
    expect(JqlFunctions.startOfDay('-1d').toJql()).toBe('startOfDay("-1d")');
    expect(JqlFunctions.endOfDay('+1d').toJql()).toBe('endOfDay("+1d")');
    expect(JqlFunctions.startOfWeek().toJql()).toBe('startOfWeek()');
    expect(JqlFunctions.endOfWeek().toJql()).toBe('endOfWeek()');
    expect(JqlFunctions.startOfMonth().toJql()).toBe('startOfMonth()');
    expect(JqlFunctions.endOfMonth().toJql()).toBe('endOfMonth()');
    expect(JqlFunctions.startOfYear().toJql()).toBe('startOfYear()');
    expect(JqlFunctions.endOfYear().toJql()).toBe('endOfYear()');
  });

  it('skips trailing optional arguments', () => {
    expect(JqlFunctions.linkedIssues('PROJ-42').toJql()).toBe('linkedIssues("PROJ-42")');
    expect(JqlFunctions.linkedIssues('PROJ-42', 'blocks').toJql()).toBe(
      'linkedIssues("PROJ-42", "blocks")',
    );
    expect(JqlFunctions.releasedVersions().toJql()).toBe('releasedVersions()');
    expect(JqlFunctions.unreleasedVersions('OPS').toJql()).toBe('unreleasedVersions("OPS")');
    expect(JqlFunctions.componentsLeadByUser().toJql()).toBe('componentsLeadByUser()');
    expect(JqlFunctions.projectsLeadByUser('pilmee').toJql()).toBe('projectsLeadByUser("pilmee")');
    expect(JqlFunctions.updatedBy('pilmee').toJql()).toBe('updatedBy("pilmee")');
    expect(JqlFunctions.updatedBy('pilmee', '-30d', '-1d').toJql()).toBe(
      'updatedBy("pilmee", "-30d", "-1d")',
    );
  });

  it('returns JqlRaw instances usable as operands', () => {
    expect(JqlFunctions.currentUser()).toBeInstanceOf(JqlRaw);
    expect(String(JqlFunctions.currentUser())).toBe('currentUser()');
  });
});
