# Actually Awesome - Nutrient SDK Showcase

A comprehensive showcase application demonstrating Nutrient Web SDK capabilities, built with Next.js 16, React 19, and TypeScript.

## Features

### Content Edit API Demo
- **Text Detection**: Automatically detect all text blocks across PDF documents
- **Text Selection**: Visual selection and highlighting of text blocks
- **Find & Replace**: Search and replace text across entire documents
- **Session Management**: Controlled editing sessions with commit/discard
- **Real-time Preview**: See changes as annotations before committing

### Document Generator Demo
- Interactive wizard for document creation
- Template-based document generation
- Multi-step form interface

### Text Comparison Demo
- Side-by-side PDF comparison
- Text diff visualization
- Custom comparison UI

## Tech Stack

- **Framework**: Next.js 16.1.1 with App Router and Turbopack
- **React**: 19.x with modern hooks and concurrent features
- **TypeScript**: 5.9.3 with strict type checking
- **PDF SDK**: Nutrient Web SDK 1.10.0
- **Testing**: Vitest + @testing-library/react
- **Code Quality**: Biome for linting and formatting
- **Package Manager**: pnpm

## Getting Started

### Prerequisites

- Node.js 18+ (LTS recommended)
- pnpm 8+ (or npm/yarn)
- Nutrient SDK license key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd actually-awesome
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
# Copy example env file
cp .env.example .env.local

# Add your Nutrient license key
NEXT_PUBLIC_NUTRIENT_LICENSE_KEY=your_license_key_here
```

4. Start the development server:
```bash
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
app/
├── web-sdk/
│   ├── content-edit-api/     # Content editing demo
│   │   ├── components/       # UI components
│   │   ├── viewer.tsx        # Main viewer (731 lines)
│   │   └── page.tsx          # Route component
│   ├── document-generator/   # Document generation demo
│   └── text-comparison/      # Text comparison demo
├── layout.tsx                # Root layout
└── page.tsx                  # Home page

lib/
├── hooks/                    # Custom React hooks
│   ├── useSyncRef.ts        # Ref synchronization
│   ├── useTextBlocks.ts     # Text block management
│   └── useViewerSession.ts  # Session lifecycle
├── utils/                    # Utility functions
│   └── typeGuards.ts        # Type safety helpers
├── context/                  # React contexts
├── events/                   # Event system
├── types/                    # TypeScript definitions
└── constants.ts             # App constants

tests/
└── setup.ts                 # Test configuration

docs/
└── ARCHITECTURE.md          # Architecture documentation
```

## Available Scripts

### Development
```bash
pnpm dev          # Start development server with Turbopack
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run Biome linter
pnpm format       # Format code with Biome
```

### Testing
```bash
pnpm test         # Run all tests
pnpm test:watch   # Run tests in watch mode
pnpm test:ui      # Open Vitest UI
```

### Code Quality
```bash
pnpm biome check                    # Check linting and formatting
pnpm biome check --write            # Fix linting and formatting issues
pnpm biome format --write           # Format all files
```

## Architecture

### Component Architecture

The application follows a component-based architecture with clear separation of concerns:

- **Main Viewer**: Orchestrates PDF operations and state management
- **UI Components**: Reusable, props-based components (FindReplaceDialog, StatsPopup)
- **Custom Hooks**: Encapsulated logic for sessions, text blocks, and refs
- **Type Guards**: Safe SDK interop with TypeScript

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture documentation.

### Key Design Patterns

1. **Custom Hooks Pattern**: Encapsulate complex logic in reusable hooks
2. **Controlled Components**: All UI components use controlled props
3. **Type Safety**: Comprehensive TypeScript typing throughout
4. **Event System**: Typed event system for component communication
5. **Context Pattern**: Share SDK instance across components

## Testing

The project includes comprehensive test coverage:

- **75 tests** across 4 test files (+31% from initial baseline)
- **Unit tests** for hooks and utilities
- **Component tests** for UI components with CSS module and error scenario testing
- **Integration tests** for complex workflows

### Running Tests

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# UI mode
pnpm test:ui

# Coverage report
pnpm test:coverage
```

## Content Edit API Usage

### Basic Text Detection

```tsx
import { useViewerSession } from '@/lib/hooks/useViewerSession';
import { useTextBlocks } from '@/lib/hooks/useTextBlocks';

function MyComponent() {
  const { beginSession, commitSession } = useViewerSession();
  const { detectTextBlocks, textBlocks } = useTextBlocks();

  const handleDetect = async () => {
    const session = await beginSession();
    await detectTextBlocks(session, totalPages);
    // textBlocks now contains all detected text
  };
}
```

### Find and Replace

```tsx
const { findAndReplace } = useTextBlocks();
const session = useViewerSession();

const handleReplace = async () => {
  const { updates, count } = findAndReplace('old text', 'new text');
  await session.getSession()?.updateTextBlocks(updates);
  await session.commitSession();
  console.log(`Replaced ${count} instances`);
};
```

## Custom Hooks

### useSyncRef

Keep a ref synchronized with state for use in stable callbacks:

```tsx
const [count, setCount] = useState(0);
const countRef = useSyncRef(count);

const handleClick = useCallback(() => {
  // countRef.current always has latest count
  console.log(countRef.current);
}, []); // No need to include count in deps
```

### useTextBlocks

Manage text blocks state and operations:

```tsx
const {
  textBlocks,           // All detected blocks
  selectedBlocks,       // Selected blocks
  selectedCount,        // Count of selections
  isDetecting,          // Loading state
  detectTextBlocks,     // Detect all text
  toggleBlockSelection, // Toggle selection
  findAndReplace       // Find/replace text
} = useTextBlocks();
```

### useViewerSession

Manage Nutrient content editing sessions:

```tsx
const {
  beginSession,      // Start new session
  commitSession,     // Save changes
  discardSession,    // Cancel changes
  hasActiveSession  // Check if session active
} = useViewerSession();
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Performance

- **Lazy Loading**: Components render only when visible
- **Memoization**: Callbacks and values memoized to prevent re-renders
- **Efficient Updates**: Batched text block updates
- **Turbopack**: Fast development builds

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub/GitLab/Bitbucket
2. Import project in Vercel
3. Add environment variables
4. Deploy

```bash
# Or use Vercel CLI
npx vercel
```

### Other Platforms

The app can be deployed to any platform supporting Next.js:

```bash
pnpm build
pnpm start
```

## Contributing

### Development Workflow

1. Create a feature branch
2. Make your changes
3. Add tests for new functionality
4. Run tests and linting
5. Submit a pull request

### Code Style

- Follow TypeScript best practices
- Add JSDoc comments to public APIs
- Write tests for new features
- Use Biome for formatting

## License

[Your License Here]

## Resources

### Documentation
- [Nutrient SDK Documentation](https://pspdfkit.com/guides/web/)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

### Internal Documentation
- [Architecture Guide](docs/ARCHITECTURE.md) - Detailed architecture overview
- [API Reference](docs/API.md) - API documentation (coming soon)

## Troubleshooting

### Common Issues

**Issue**: PDF doesn't load
- Verify Nutrient license key is set
- Check console for SDK errors
- Ensure PDF file exists and is accessible

**Issue**: Text detection fails
- Verify an active session exists
- Check if PDF contains selectable text
- Review SDK console errors

**Issue**: Tests failing
- Run `pnpm install` to ensure dependencies are up to date
- Clear test cache: `pnpm test --clearCache`
- Check test setup in `tests/setup.ts`

## Support

For issues and questions:
- File an issue on GitHub
- Check existing documentation
- Review SDK documentation

## Changelog

### v1.0.0 - Current
- ✅ Phase 1: Quick Wins (completed)
  - Created custom hooks (useSyncRef, useTextBlocks, useViewerSession)
  - Added type guards for SDK safety
  - Implemented typed event system

- ✅ Phase 2: Component Refactoring (completed)
  - Extracted FindReplaceDialog component
  - Extracted StatsPopup component
  - Reduced main viewer from 940 to 731 lines

- ✅ Phase 3: Testing Infrastructure (completed)
  - Set up Vitest with @testing-library/react
  - Added 57 tests across hooks, utilities, and components
  - Achieved comprehensive test coverage

- ✅ Phase 4: Documentation (completed)
  - Added JSDoc comments to all hooks and utilities
  - Created comprehensive architecture guide
  - Updated README with full project information

### Upcoming
- Phase 5: Performance & Polish
  - Virtual scrolling for large documents
  - Centralized error handling
  - CSS modules migration
  - Enhanced accessibility

---

Built with ❤️ using Nutrient Web SDK
