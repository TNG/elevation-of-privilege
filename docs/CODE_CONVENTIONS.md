# Code Conventions

Coding guidelines for the Elevation of Privilege project.

## TypeScript

### Configuration
- Strict mode with `noUncheckedIndexedAccess`
- React apps: ESNext modules, bundler resolution
- Server: CommonJS with Node resolution
- Target: ES2021

### Imports
- Sort: external libraries → internal `@eop/*` → relative imports
- Use type-only imports: `import type { Foo } from './foo'`

### Naming
- camelCase: variables, functions, methods
- PascalCase: React components, classes
- UPPER_CASE: constants, environment variables
- kebab-case: filenames and folders (except React components)

### Error Handling
- Use try/catch for async operations
- Validate user input with Valibot schemas (server)
- Handle errors gracefully with appropriate logging

## React Components

### Style
- Functional components with hooks only (no class components)
- Prefer props interface: `interface Props { ... }`
- Use `useCallback`/`useMemo` for performance when needed

### UI Framework
- Bootstrap and ReactStrap for components
- JointJS for Threat Dragon diagram rendering

## Testing

### Framework
- Use Vitest for all tests

### Frontend
- React Testing Library with `@testing-library/user-event`
- Test files: `.test.tsx` or `.test.ts` alongside source, or in `__tests__` directories
- Mock external dependencies (APIs, databases)

### Backend
- Supertest for API endpoint testing
- Mock external services as needed