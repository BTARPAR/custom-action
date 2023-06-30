const core = require('@actions/core');
const { Octokit } = require('@octokit/rest');
const fs = require('fs');

async function run() {
  try {
    // Get the input values
    const githubToken = core.getInput('github-token');
    const octokit = new Octokit({ auth: `token ${githubToken}` });

    // Get the diff between last merge and current merge
    const response = await octokit.repos.compareCommits({
      owner: process.env.GITHUB_REPOSITORY_OWNER,
      repo: process.env.GITHUB_REPOSITORY,
      base: process.env.GITHUB_BASE_REF,
      head: process.env.GITHUB_HEAD_REF,
    });

    // Increment the version in package.json
    const packageJsonPath = 'package.json';
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath));
    const currentVersion = packageJson.version;
    const newVersion = incrementVersion(currentVersion);
    packageJson.version = newVersion;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

    // Commit and push the changes
    await octokit.repos.createOrUpdateFileContents({
      owner: process.env.GITHUB_REPOSITORY_OWNER,
      repo: process.env.GITHUB_REPOSITORY,
      path: packageJsonPath,
      message: `Bump version to ${newVersion}`,
      content: Buffer.from(JSON.stringify(packageJson, null, 2)).toString('base64'),
      sha: response.data.files[0].sha,
      branch: 'main',
    });

    console.log(`Successfully bumped version to ${newVersion}`);
  } catch (error) {
    core.setFailed(error.message);
  }
}

function incrementVersion(version) {
  const versionParts = version.split('.');
  const incrementedVersionParts = versionParts.map((part) => parseInt(part) + 1);
  return incrementedVersionParts.join('.');
}

run();
