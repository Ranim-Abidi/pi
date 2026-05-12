# Contributing to JobMatch Backend

Thank you for interest in contributing to the JobMatch Backend! This document outlines the process for contributing.

## Code of Conduct

Be respectful, inclusive, and professional in all interactions.

## How to Contribute

### Reporting Bugs

1. Check if the bug is already reported in Issues
2. Provide a clear description of the bug
3. Include steps to reproduce
4. Describe expected vs actual behavior
5. Include relevant versions (Java, Spring Boot, MySQL, etc.)

### Suggesting Features

1. Describe the feature and its use case
2. Explain why this feature would be beneficial
3. Provide examples if possible
4. Be open to discussion and feedback

### Code Contributions

#### Step 1: Fork and Setup
```bash
git clone <your-fork-url>
cd PI-Backend
git remote add upstream <original-repo-url>
```

#### Step 2: Create Feature Branch
```bash
git checkout -b feature/description-of-feature
```

#### Step 3: Make Changes
- Follow code standards (see DEVELOPMENT.md)
- Write clear, focused commits
- Update relevant documentation
- Add tests for new features

#### Step 4: Test Your Code
```bash
./mvnw clean test
./mvnw checkstyle:check  # if available
```

#### Step 5: Push and Create Pull Request
```bash
git push origin feature/description-of-feature
```
- Create PR with clear title and description
- Reference related issues
- Ensure all tests pass

### Pull Request Guidelines

**PR Title Format**:
- `feat: add new feature`
- `fix: resolve bug description`
- `docs: update documentation`
- `refactor: improve code structure`
- `test: add test coverage`

**PR Description Should Include**:
1. Clear description of changes
2. Why these changes are needed
3. How to test the changes
4. Any related issues (use #123)
5. Any breaking changes

**Review Process**:
- At least one approval needed
- All CI checks must pass
- Address review comments
- Keep commits clean and logical

## Commit Message Guidelines

```
type(scope): subject

body

footer
```

**Types**: feat, fix, docs, style, refactor, perf, test, chore

**Example**:
```
feat(auth): implement JWT refresh token

Add refresh token mechanism to extend session duration.
Tokens expire after 24 hours and can be refreshed for extended access.

Fixes #456
```

## Documentation

- Update README.md for user-facing changes
- Update DEVELOPMENT.md for development setup changes
- Add comments for complex logic
- Update CHANGELOG.md with your changes
- Include JavaDoc for public methods

## Testing

- Write unit tests for new features
- Maintain or improve code coverage
- Test both success and failure scenarios
- Update integration tests if applicable

## Code Style

- Follow Google Java Style Guide
- Use meaningful variable names
- Keep methods focused and small
- Maximum line length: 120 characters
- Use proper indentation (4 spaces)

## Questions?

- Open a discussion in Issues
- Contact maintainers
- Check existing documentation

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

**Thank you for making JobMatch Backend better!** 🎉
