// User-editable site configuration.
export const SITE = {
  title: 'Scheinkognat',
  description: 'Linguistische Koinzidenzen zwischen Sprachen.',
  // GitHub repo for submission/PR flow. Update to actual values before deploy.
  github: {
    owner: 'kmein',
    repo: 'scheinkognat',
  },
};

export const githubIssueUrl = (params: { title: string; body: string; labels?: string[] }): string => {
  const u = new URL(`https://github.com/${SITE.github.owner}/${SITE.github.repo}/issues/new`);
  u.searchParams.set('title', params.title);
  u.searchParams.set('body', params.body);
  if (params.labels) u.searchParams.set('labels', params.labels.join(','));
  return u.toString();
};
