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
- Request validation must use the shared schemas in
  `packages/shared/src/schemas/` and report failures with `formatIssues`,
  so clients receive stable `{ path, expected }` issue entries
- Never echo submitted values in responses or logs: error bodies and
  security log entries carry only error codes, field paths and schema
  expectations (see `contracts/post-game-create.md`)

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