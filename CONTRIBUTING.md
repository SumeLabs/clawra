# Contributing to Clawra

Thank you for your interest in contributing to Clawra! 🎉

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Setup

```bash
# Fork and clone the repository
git clone https://github.com/yourusername/clawra.git
cd clawra

# Install dependencies
npm install

# Run tests
npm test
```

## Development

### Project Structure

```
clawra/
├── src/
│   ├── providers/     # Image generation providers
│   ├── utils/         # Utility functions
│   ├── clawra.js      # Main class
│   └── index.js       # Exports
├── docs/              # Documentation
├── bin/               # CLI scripts
└── skill/             # OpenClaw skill files
```

### Adding a New Provider

To add support for a new image generation provider:

1. Create a new file in `src/providers/`:

```javascript
// src/providers/myprovider.js
import { BaseProvider } from './base.js';

export class MyProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://api.myprovider.com';
  }

  getName() {
    return 'myprovider';
  }

  async generate(prompt, options) {
    // Implement generation logic
    const response = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt, ...options })
    });

    if (!response.ok) {
      throw new Error(`MyProvider API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      url: data.image_url,
      width: data.width,
      height: data.height,
      contentType: data.content_type
    };
  }
}
```

2. Export in `src/providers/index.js`:

```javascript
export { MyProvider } from './myprovider.js';

// Add to createProvider function
export function createProvider(provider, config) {
  switch (provider.toLowerCase()) {
    // ... existing cases
    case 'myprovider':
      return new MyProvider(config);
  }
}
```

3. Add documentation in `docs/CONFIGURATION.md`

4. Add tests

### Code Style

- Use ES modules (`import`/`export`)
- Use async/await for asynchronous code
- Add JSDoc comments for public APIs
- Follow existing code patterns

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Documentation

- Update README.md if changing user-facing features
- Update docs/ for configuration changes
- Add JSDoc comments for new APIs

## Submitting Changes

### Pull Request Process

1. **Fork** the repository
2. **Create a branch** for your feature (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to your fork (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### PR Guidelines

- Describe what your PR does
- Reference any related issues
- Include tests for new features
- Update documentation
- Ensure tests pass

### Commit Message Format

```
type(scope): subject

body (optional)

footer (optional)
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/tooling changes

Example:
```
feat(providers): add Stability AI support

Add support for Stability AI's SDXL model.
Includes image generation and model listing.

Closes #123
```

## Reporting Issues

### Bug Reports

Include:
- Description of the bug
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (OS, Node version, provider used)
- Error messages/logs

### Feature Requests

Include:
- Description of the feature
- Use case
- Proposed API (if applicable)
- Alternatives considered

## Code of Conduct

- Be respectful and inclusive
- Accept constructive criticism
- Focus on what's best for the community
- Show empathy towards others

## Questions?

- Join [OpenClaw Discord](https://discord.gg/openclaw)
- Open a [GitHub Discussion](https://github.com/SumeLabs/clawra/discussions)

Thank you for contributing! 🙏
