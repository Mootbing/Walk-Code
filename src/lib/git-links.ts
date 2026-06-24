function githubPathFromRepoUrl(repoUrl: string) {
  const trimmed = repoUrl.trim().replace(/\.git$/, "");
  const httpsMatch = trimmed.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)$/i);
  if (httpsMatch) return `${httpsMatch[1]}/${httpsMatch[2]}`;

  const sshMatch = trimmed.match(/^git@github\.com:([^/]+)\/([^/]+)$/i);
  if (sshMatch) return `${sshMatch[1]}/${sshMatch[2]}`;

  return null;
}

export function repoLabel(repoUrl: string) {
  const githubPath = githubPathFromRepoUrl(repoUrl);
  if (githubPath) return githubPath;

  try {
    const parsed = new URL(repoUrl);
    const pathLabel = parsed.pathname.replace(/^\/+/, "").replace(/\.git$/, "");
    return pathLabel || parsed.hostname;
  } catch {
    return repoUrl.replace(/\.git$/, "") || "unknown";
  }
}

function encodeBranchPath(branch: string) {
  return branch.split("/").map(encodeURIComponent).join("/");
}

export function githubBranchUrl(repoUrl: string, branch: string) {
  const repoPath = githubPathFromRepoUrl(repoUrl);
  if (!repoPath) return null;

  return `https://github.com/${repoPath}/tree/${encodeBranchPath(branch)}`;
}

export function githubCommitUrl(repoUrl: string, sha: string | null) {
  const repoPath = githubPathFromRepoUrl(repoUrl);
  if (!repoPath || !sha || sha === "unborn") return null;

  return `https://github.com/${repoPath}/commit/${encodeURIComponent(sha)}`;
}
