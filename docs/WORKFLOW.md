# Project Workflow

This document provides detailed workflow guidelines for contributing to this project.

## Committing Changes

### Commit Signoff Requirement

All commits MUST be signed off using the `--signoff` flag:

```bash
git commit --signoff -m "Your commit message"
```

This adds a `Signed-off-by:` trailer to the commit, which is required by the project. The trailer format is:

```
Signed-off-by: Your Name <your.email@example.com>
```

### Commit Message Guidelines

Follow these conventions for commit messages:

- **Feature commits**: Be concise and direct

  - Example: `Add player emoji support for profiles`
  - Example: `Add aria-label to cards in the deck`

- **Bug fixes**: Describe what was fixed

  - Example: `Fix authentication bug in lobby creation`
  - Example: `Fix test regression in card rendering`
  - Example: `Fix @koa/router v14 update`
  - Example: `Fix linting errors in shared types`

- **Refactoring**: Use "Refactor" prefix

  - Example: `Refactor create page to use functional components and hooks`
  - Example: `Refactor card definitions`
  - Example: `Make background color white by refactoring CSS into index.css`

- **Version commits**: Use specific format

  - Example: `bump version to 2.1.0`
  - Example: `bump versions` (when versioning multiple packages)

- **Updates/Upgrades**: Describe what was updated

  - Example: `Update to React 19`
  - Example: `Update to Cumulus v1.2.0`
  - Example: `Improve test stability by mocking system time`

- **Always use double quotes**: This prevents issues with special characters
  ```bash
  git commit --signoff -m "Fix authentication bug in lobby creation"
  git commit --signoff -m "Update card display components for accessibility"
  ```

**Note**: Dependency updates are typically handled by Dependabot, which uses the format `Bump [package] from [old] to [new]`.

## Versioning with Changesets

This project uses [Changesets](https://github.com/changesets/changesets) for version management and changelog generation.

### Creating a Changeset

When you make changes that warrant a version bump (new features, significant bug fixes, breaking changes), create a changeset:

```bash
npx changeset add
```

The CLI will prompt you to:

1. Select which packages are affected
2. Choose the version bump type (major, minor, patch)
3. Write a summary of the changes

This creates a new markdown file in the `.changeset/` directory. Example:

```
---
"@eop/shared": minor
"@eop/client": minor
---

Update to Cumulus Version 1.2.0
```

**Important**: Commit the changeset file along with your changes. The commit message should be brief:

```bash
git add .changeset/new-changeset-name.md
git add .
git commit --signoff -m "Add cool new feature"
```

### When to Create a Changeset

**Create a changeset for:**

- New features or functionality
- Bug fixes that affect users
- Breaking changes
- Performance improvements
- Documentation updates (if significant)
- Card deck updates (e.g., new Cumulus version)
- Major refactoring that changes API surface

**Skip changesets for:**

- Minor code style changes (formatting, typos)
  - Examples: "Fix formatting issue", "Fix linting"
- Internal refactoring that doesn't affect users
- Test updates
- Dependency updates (handled by dependabot)
- Changeset commits themselves (the `.changeset/*.md` files)

### Version Bump Types

- **patch**: Bug fixes, minor improvements (e.g., 1.0.0 → 1.0.1)
- **minor**: New features, backwards-compatible changes (e.g., 1.0.0 → 1.1.0)
- **major**: Breaking changes (e.g., 1.0.0 → 2.0.0)

### Creating a Release

When changesets have accumulated and you're ready to create a release:

```bash
npx changeset version && npm install
git add .
git commit --signoff -m "bump version to X.Y.Z"
```

This will:

1. Update `package.json` version files based on accumulated changesets
2. Move changeset files to the `.changeset/` consumption directory
3. Generate or update `CHANGELOG.md` files in all affected packages
4. Update `package-lock.json` with new versions
5. Track changes with commit hashes (e.g., `- 5f96bdd: Update to Cumulus Version 1.2.0`)

### Publishing the Release

After committing version changes:

1. Push to the repository
2. Create a pull request for the version bump (if not already done)
3. Merge the version commit to the main branch
4. CI/CD will handle deployment

**Important**: All packages are versioned together due to the `["@eop/*"]` fixed configuration in `.changeset/config.json`. When you version packages, all `@eop/*` packages are updated together to maintain version consistency.

### Complete Example Workflow

1. **Create a feature branch**

   ```bash
   git checkout -b feature-name
   ```

2. **Make your changes**

   ```bash
   # Edit files, fix bugs, add features...
   ```

3. **Create a changeset** (if appropriate)

   ```bash
   npx changeset add
   # Select affected packages (e.g., "@eop/client")
   # Choose version bump type (e.g., "minor")
   # Write description: "Add player emoji support for profiles"
   ```

4. **Commit with signoff**

   ```bash
   git add .
   git commit --signoff -m "Add player emoji support for profiles"
   ```

5. **Push and create PR**

   ```bash
   git push -u origin feature-name
   # Create a pull request on GitHub
   ```

6. **Wait for PR review and merge**

7. **Wait for accumulated changesets** (or create release immediately if urgent)

8. **Create release** (when ready)
   ```bash
   npx changeset version && npm install
   git add .
   git commit --signoff -m "bump version to 2.2.0"
   git push
   # Create PR for version bump and merge
   ```

## Resources

- [Changesets Documentation](https://github.com/changesets/changesets)
- [Changesets CLI Reference](https://github.com/changesets/changesets/tree/main/packages/cli)
- [Semantic Versioning](https://semver.org/)
- [How Changesets Works](https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md)
