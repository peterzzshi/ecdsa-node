# TypeScript React Client

This is a React client written in TypeScript with Vite, ESLint 9, and Airbnb style guide.

## Scripts

- `npm run dev` - Start the development server with hot reload
- `npm run build` - Build the TypeScript project for production
- `npm run preview` - Preview the production build
- `npm run lint` - Check code for linting errors
- `npm run lint:fix` - Auto-fix linting errors

## Development

All TypeScript source files are in the `src/` directory with `.tsx` and `.ts` extensions.

## Linting

This project uses ESLint 9 with TypeScript support and follows Airbnb style guide conventions for React:
- Single quotes
- 2-space indentation
- Semicolons required
- Trailing commas in multi-line objects/arrays
- Max line length of 100 characters
- React Hooks rules enforced
- TypeScript strict mode enabled

## Type Safety

All components are fully typed with TypeScript:
- React component props are typed with interfaces
- Axios responses have type annotations
- No `any` types (proper error handling with AxiosError)

