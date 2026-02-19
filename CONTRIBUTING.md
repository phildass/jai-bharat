# Contributing to Jai Bharat

First off, thank you for considering contributing to Jai Bharat! It's people like you that make Jai Bharat such a great tool for empowering India's youth.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* **Use a clear and descriptive title**
* **Describe the exact steps to reproduce the problem**
* **Provide specific examples to demonstrate the steps**
* **Describe the behavior you observed and what behavior you expected**
* **Include screenshots if applicable**
* **Include your environment details** (OS, device, app version)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

* **Use a clear and descriptive title**
* **Provide a step-by-step description of the suggested enhancement**
* **Provide specific examples to demonstrate the steps**
* **Describe the current behavior and expected behavior**
* **Explain why this enhancement would be useful**

### Pull Requests

* Fill in the required template
* Follow the style guide
* Include appropriate test cases
* Update documentation as needed
* End all files with a newline

## Development Process

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/your-username/jai-bharat.git
cd jai-bharat

# Add upstream remote
git remote add upstream https://github.com/phildass/jai-bharat.git
```

### 2. Create a Branch

```bash
# Create a new branch for your feature
git checkout -b feature/your-feature-name

# Or for a bug fix
git checkout -b fix/bug-description
```

### 3. Set Up Development Environment

```bash
# Install dependencies
npm install

# Install module dependencies
cd modules/learn-govt-jobs && npm install
cd ../learn-ias && npm install
cd ../..

# Start development
npm start
```

### 4. Make Your Changes

* Write clear, commented code
* Follow the existing code style
* Add tests for new features
* Update documentation as needed

### 5. Test Your Changes

```bash
# Run linting
npm run lint

# Run tests
npm test

# Test on both Android and iOS
npm run android
npm run ios
```

### 6. Commit Your Changes

Follow conventional commit messages:

```bash
# Format: <type>(<scope>): <subject>

# Examples:
git commit -m "feat(voice): add multi-language voice search"
git commit -m "fix(auth): resolve token refresh issue"
git commit -m "docs(api): update API documentation"
git commit -m "test(progress): add progress sync tests"
```

Types:
* **feat**: A new feature
* **fix**: A bug fix
* **docs**: Documentation only changes
* **style**: Code style changes (formatting, etc.)
* **refactor**: Code refactoring
* **test**: Adding or updating tests
* **chore**: Maintenance tasks

### 7. Push and Create Pull Request

```bash
# Push your branch
git push origin feature/your-feature-name

# Create a Pull Request on GitHub
```

### Pull Request Guidelines

* **Title**: Clear and descriptive
* **Description**: Explain what and why
* **Screenshots**: If UI changes
* **Tests**: Include test results
* **Documentation**: Update if needed

## Style Guide

### JavaScript/TypeScript

* Use TypeScript for new code
* Use 2 spaces for indentation
* Use single quotes for strings
* Use semicolons
* Use meaningful variable names
* Add JSDoc comments for functions

```typescript
/**
 * Calculate eligibility score for a job
 * @param user - User profile
 * @param job - Job posting
 * @returns Eligibility score (0-100)
 */
async calculateEligibilityScore(user: UserProfile, job: JobPosting): Promise<number> {
  // Implementation
}
```

### React Native

* Use functional components
* Use hooks (useState, useEffect, etc.)
* Extract reusable components
* Follow naming conventions

```typescript
// Good component example
const JobCard = ({ job, onPress }: JobCardProps) => {
  const [isFavorite, setIsFavorite] = useState(false);
  
  return (
    <TouchableOpacity onPress={onPress}>
      {/* Component content */}
    </TouchableOpacity>
  );
};
```

### File Naming

* Components: `PascalCase.tsx` (e.g., `JobCard.tsx`)
* Services: `PascalCase.ts` (e.g., `AuthService.ts`)
* Utilities: `camelCase.ts` (e.g., `formatDate.ts`)
* Constants: `SCREAMING_SNAKE_CASE.ts` (e.g., `API_CONSTANTS.ts`)

### Directory Structure

```
src/
├── core/           # Core functionality
├── modules/        # Feature modules
├── shared/         # Shared code
│   ├── components/ # Reusable components
│   ├── utils/      # Utility functions
│   └── hooks/      # Custom hooks
└── services/       # Business logic services
```

## Testing Guidelines

### Unit Tests

* Test individual functions and components
* Use Jest and React Testing Library
* Aim for 80% code coverage

```typescript
describe('EligibilityService', () => {
  it('should calculate correct eligibility score', async () => {
    const score = await eligibilityService.calculateScore(mockUser, mockJob);
    expect(score).toBeGreaterThan(0);
  });
});
```

### Integration Tests

* Test feature workflows
* Test module integration
* Test API interactions

### Manual Testing

* Test on both Android and iOS
* Test on different screen sizes
* Test with different languages
* Test with voice features
* Test offline scenarios

## Documentation

### Code Documentation

* Add JSDoc comments for public APIs
* Document complex algorithms
* Add inline comments for clarity

### User Documentation

* Update README.md for user-facing changes
* Update relevant guide in docs/
* Add examples and screenshots

### API Documentation

* Document new endpoints in docs/api.md
* Include request/response examples
* Document error cases

## Module Development

### Creating a New Module

1. Create module directory in `modules/`
2. Implement ModuleConfig interface
3. Register with ModuleRegistry
4. Add documentation
5. Add tests

See [Module Integration Guide](docs/module-integration.md) for details.

## Security

### Reporting Security Issues

**DO NOT** create a public GitHub issue for security vulnerabilities.

Instead, email: security@jaibharat.cloud

We will respond within 24 hours.

### Security Guidelines

* Never commit secrets or API keys
* Use environment variables for sensitive data
* Follow OWASP security practices
* Validate all user input
* Sanitize data before display

## Community

### Getting Help

* **Documentation**: Check docs/ folder
* **Issues**: Search existing issues
* **Discussions**: GitHub Discussions
* **Email**: dev@jaibharat.cloud

### Communication

* Be respectful and inclusive
* Provide constructive feedback
* Help others learn and grow
* Share knowledge and experiences

## Recognition

Contributors will be:
* Listed in CONTRIBUTORS.md
* Credited in release notes
* Acknowledged on our website
* Invited to contributor events

## License

By contributing to Jai Bharat, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to reach out:
* Email: dev@jaibharat.cloud
* GitHub Issues: For technical questions
* GitHub Discussions: For general questions

---

**Thank you for contributing to Jai Bharat and empowering India's youth! 🇮🇳**
