/**
 * Tests for git helper functions
 */

import {
  isGitRepository,
  getMainBranch,
  getCurrentBranch,
  hasUncommittedChanges,
  branchExists,
  getChangedFiles,
  hasScript,
  generateBranchName,
  getRemoteUrl,
  getRecentCommits,
} from "../src/utils/git-helpers.js";

export async function testGitHelpers() {
  const tests = [];

  // Test isGitRepository
  tests.push({
    name: "isGitRepository - should detect git repo",
    passed: isGitRepository(),
    details: "Checks if current directory is a git repository",
  });

  // Test getCurrentBranch
  try {
    const currentBranch = getCurrentBranch();
    tests.push({
      name: "getCurrentBranch - should return branch name",
      passed: typeof currentBranch === "string" && currentBranch.length > 0,
      details: `Current branch: ${currentBranch}`,
    });
  } catch (error) {
    tests.push({
      name: "getCurrentBranch - should return branch name",
      passed: false,
      error: error.message,
    });
  }

  // Test getMainBranch
  try {
    const mainBranch = getMainBranch();
    tests.push({
      name: "getMainBranch - should return main branch",
      passed:
        typeof mainBranch === "string" &&
        ["main", "master"].includes(mainBranch),
      details: `Main branch: ${mainBranch}`,
    });
  } catch (error) {
    tests.push({
      name: "getMainBranch - should return main branch",
      passed: false,
      error: error.message,
    });
  }

  // Test hasUncommittedChanges
  try {
    const hasChanges = hasUncommittedChanges();
    tests.push({
      name: "hasUncommittedChanges - should check for changes",
      passed: typeof hasChanges === "boolean",
      details: `Has uncommitted changes: ${hasChanges}`,
    });
  } catch (error) {
    tests.push({
      name: "hasUncommittedChanges - should check for changes",
      passed: false,
      error: error.message,
    });
  }

  // Test branchExists
  try {
    const currentBranch = getCurrentBranch();
    const exists = branchExists(currentBranch);
    tests.push({
      name: "branchExists - should check if branch exists",
      passed: exists === true,
      details: `Branch ${currentBranch} exists: ${exists}`,
    });

    const fakeExists = branchExists("fake-branch-that-does-not-exist-12345");
    tests.push({
      name: "branchExists - should return false for non-existent branch",
      passed: fakeExists === false,
      details: "Fake branch correctly detected as non-existent",
    });
  } catch (error) {
    tests.push({
      name: "branchExists - should check if branch exists",
      passed: false,
      error: error.message,
    });
  }

  // Test getChangedFiles
  try {
    const changedFiles = getChangedFiles();
    tests.push({
      name: "getChangedFiles - should return array",
      passed: Array.isArray(changedFiles),
      details: `Found ${changedFiles.length} changed files`,
    });
  } catch (error) {
    tests.push({
      name: "getChangedFiles - should return array",
      passed: false,
      error: error.message,
    });
  }

  // Test hasScript
  try {
    const hasTest = hasScript("test");
    const hasNonexistent = hasScript("nonexistent-script-12345");
    tests.push({
      name: "hasScript - should detect package.json scripts",
      passed: typeof hasTest === "boolean" && hasNonexistent === false,
      details: `Has test script: ${hasTest}, Has fake script: ${hasNonexistent}`,
    });
  } catch (error) {
    tests.push({
      name: "hasScript - should detect package.json scripts",
      passed: false,
      error: error.message,
    });
  }

  // Test generateBranchName
  try {
    const branchName1 = generateBranchName("Add user authentication feature");
    const branchName2 = generateBranchName(
      "Fix critical bug in payment processing",
      "hotfix/",
    );

    tests.push({
      name: "generateBranchName - should generate valid branch names",
      passed:
        branchName1.startsWith("feature/") &&
        branchName1.includes("add-user-authentication") &&
        branchName2.startsWith("hotfix/") &&
        branchName2.includes("fix-critical-bug"),
      details: `Generated: ${branchName1}, ${branchName2}`,
    });
  } catch (error) {
    tests.push({
      name: "generateBranchName - should generate valid branch names",
      passed: false,
      error: error.message,
    });
  }

  // Test getRemoteUrl
  try {
    const remoteUrl = getRemoteUrl();
    tests.push({
      name: "getRemoteUrl - should return remote URL or null",
      passed:
        remoteUrl === null ||
        (typeof remoteUrl === "string" && remoteUrl.length > 0),
      details: remoteUrl ? `Remote URL: ${remoteUrl}` : "No remote URL found",
    });
  } catch (error) {
    tests.push({
      name: "getRemoteUrl - should return remote URL or null",
      passed: false,
      error: error.message,
    });
  }

  // Test getRecentCommits
  try {
    const commits = getRecentCommits(5);
    tests.push({
      name: "getRecentCommits - should return commit array",
      passed: Array.isArray(commits) && commits.length <= 5,
      details: `Found ${commits.length} recent commits`,
    });

    if (commits.length > 0) {
      const firstCommit = commits[0];
      tests.push({
        name: "getRecentCommits - commits should have hash and message",
        passed:
          typeof firstCommit === "object" &&
          typeof firstCommit.hash === "string" &&
          typeof firstCommit.message === "string" &&
          firstCommit.hash.length > 0,
        details: `First commit: ${firstCommit.hash} - ${firstCommit.message.substring(0, 50)}...`,
      });
    }
  } catch (error) {
    tests.push({
      name: "getRecentCommits - should return commit array",
      passed: false,
      error: error.message,
    });
  }

  return tests;
}
