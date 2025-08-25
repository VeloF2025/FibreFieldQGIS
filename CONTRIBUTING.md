# Contributing to FibreField

Thank you for your interest in contributing to FibreField! This document provides guidelines for contributing to the project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## How to Contribute

### Reporting Issues

1. Check if the issue already exists in the GitHub Issues
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce (if applicable)
   - Expected vs actual behavior
   - Screenshots (if UI-related)
   - Device/browser information

### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Make your changes following our coding standards
4. Test thoroughly on mobile devices
5. Commit with clear messages:
   ```bash
   git commit -m "feat: add offline map support"
   ```
6. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
7. Create a Pull Request with:
   - Clear description of changes
   - Screenshots of UI changes
   - Testing steps
   - Related issue numbers

## Development Setup

See README.md for detailed setup instructions.

## Coding Standards

### JavaScript/React

- Use functional components with hooks
- Follow React best practices
- Keep components small and focused
- Use meaningful variable and function names
- Add comments for complex logic

### CSS

- Use CSS modules or styled-components
- Follow mobile-first design
- Ensure accessibility (WCAG 2.1 AA)
- Test in bright sunlight conditions

### Testing

- Test on real devices when possible
- Include offline testing
- Test with slow network conditions
- Verify PWA functionality

## Commit Message Format

We follow Conventional Commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc)
- `refactor:` Code refactoring
- `test:` Test additions or fixes
- `chore:` Maintenance tasks

## Priority Areas

We especially welcome contributions in:

1. Offline functionality improvements
2. Performance optimizations for low-end devices
3. Accessibility enhancements
4. Multi-language support
5. Testing coverage

## Questions?

Feel free to create an issue for any questions about contributing.