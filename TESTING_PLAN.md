# Testing Implementation Plan

> **Status**: Phase 1 & 2 (Partial) Complete ✅
> **Last Updated**: 2025-10-10
> **Current Test Count**: 57 tests passing

## Overview

This document tracks the implementation of a comprehensive testing strategy for the Nutrient SDK Samples site. The goal is to catch breaking changes from SDK updates and prevent regressions from code changes.

---

## Phase 1: Foundation & Unit Tests ✅ COMPLETE

**Status**: ✅ Done
**Completed**: 2025-10-10
**Test Files**: 5
**Tests**: 24 passing
**Execution Time**: < 1 second

### Deliverables ✅

- [x] Install Vitest, React Testing Library, Happy DOM
- [x] Create `vitest.config.ts` configuration
- [x] Create `tests/setup.ts` with Next.js & SDK mocks
- [x] Add test scripts to `package.json`
- [x] Create test directory structure
- [x] Write unit tests for design system components:
  - [x] `buttons.test.tsx` (6 tests)
  - [x] `badges.test.tsx` (6 tests)
  - [x] `tags.test.tsx` (3 tests)
  - [x] `alerts.test.tsx` (5 tests)
- [x] Write integration test for navigation (4 tests)
- [x] Create GitHub Actions CI workflow
- [x] Write comprehensive `tests/README.md`

### Files Created

```
.github/workflows/test.yml
vitest.config.ts
tests/setup.ts
tests/README.md
tests/unit/components/buttons.test.tsx
tests/unit/components/badges.test.tsx
tests/unit/components/tags.test.tsx
tests/unit/components/alerts.test.tsx
tests/integration/navigation.test.tsx
```

### Coverage Achieved

- ✅ All button variants (primary, secondary, yellow, outline, small)
- ✅ All badge colors (neutral, accent, success, pink, coral)
- ✅ Tag components
- ✅ Alert types (neutral, success, warning, error)
- ✅ Homepage navigation
- ✅ Product card rendering

---

## Phase 2: Integration Tests ⏳ IN PROGRESS

**Status**: 🔄 Partially Complete
**Started**: 2025-10-10
**Estimated Tests**: +33 tests added (was estimated +15-20)
**Current Test Count**: 57 tests total (24 from Phase 1 + 33 from Phase 2)

### Goals

Test component interactions, SDK initialization, and data flow between components. Focus on catching SDK breaking changes.

### Tasks

#### 2.1 SDK Loading & Initialization Tests ⚠️ SKIPPED

**File**: `tests/integration/sdk-loading.test.tsx`

- [x] ~~Test Document Authoring SDK loads from CDN~~ - Skipped (Next.js Script component doesn't render in test env)
- [x] ~~Test Web SDK (NutrientViewer) loads from CDN~~ - Skipped (Next.js Script component doesn't render in test env)
- [x] ~~Test SDK version from environment variables~~ - Skipped (Next.js Script component doesn't render in test env)
- [ ] Test error handling when SDK fails to load - Deferred to Phase 3 (E2E)
- [ ] Test onLoad callbacks execute correctly - Deferred to Phase 3 (E2E)
- [ ] Test multiple SDK instances don't conflict - Deferred to Phase 3 (E2E)
- [ ] Test SDK script cleanup on unmount - Deferred to Phase 3 (E2E)

**Note**: SDK loading tests require E2E testing with real browser environment. Next.js `<Script>` component is not testable in unit/integration tests. These will be covered in Phase 3 with Playwright.

**Actual Tests**: 0 (deferred to Phase 3)

#### 2.2 Document Generator Tests ✅ COMPLETE

**File**: `tests/integration/document-generator.test.tsx`

- [x] Test header with title and description
- [x] Test back link to Web SDK Samples
- [x] Test loading state displays initially
- [x] Test loading spinner renders
- [x] Test dark mode classes applied
- [x] Test loading card styling
- [x] Test header styling with borders

**Note**: Wizard flow tests (navigation, form validation, context) require full SDK integration and are deferred to Phase 3.

**Actual Tests**: 7

#### 2.3 Web SDK Samples Page Filtering ✅ COMPLETE

**File**: `tests/integration/web-sdk-filtering.test.tsx`

- [x] Test all sample categories render
- [x] Test "All" category shows all samples (13 samples)
- [x] Test filtering by "User Interface" category
- [x] Test filtering by "Annotations" category
- [x] Test filtering by "Forms" category
- [x] Test filtering by "Signatures" category
- [x] Test filtering by "Document Editor" category
- [x] Test filtering by "Content Editor" category
- [x] Test filtering by "Redaction" category
- [x] Test switching back to "All" restores all samples
- [x] Test active styling on selected category button
- [x] Test table renders correct columns
- [x] Test sample links have correct hrefs
- [x] Test Product Home and Guides buttons present

**Actual Tests**: 13

#### 2.4 AI Document Processing Flow ✅ COMPLETE

**File**: `tests/integration/ai-document-processing.test.tsx`

- [x] Test main page renders with header
- [x] Test Product Home and Guides links
- [x] Test About section renders with description
- [x] Test Classification card content
- [x] Test Extraction card content
- [x] Test Validation card content
- [x] Test samples table renders
- [x] Test Invoice Management sample link
- [x] Test footer note displays
- [x] Test Invoice Management page header
- [x] Test Invoice Management back link
- [x] Test Invoice Management introduction text
- [x] Test Invoice Management feature cards
- [x] Test Invoice Management CTA button
- [x] Test Invoice Management footer note

**Actual Tests**: 13

### Files Created in Phase 2

```
tests/integration/document-generator.test.tsx (7 tests)
tests/integration/web-sdk-filtering.test.tsx (13 tests)
tests/integration/ai-document-processing.test.tsx (13 tests)
```

### Coverage Achieved

- ✅ Document Generator page rendering and loading state
- ✅ Web SDK samples page with complete category filtering
- ✅ AI Document Processing main page and Invoice Management page
- ✅ Dark mode support verification
- ✅ Navigation links and external link verification
- ✅ Table rendering and structure
- ✅ Feature card content verification

### Phase 2 Summary

**Total Tests Added**: 33
**Total Execution Time**: ~400ms
**Files Created**: 3
**Tests Passing**: 57/57 (100%)

**Key Decisions**:
- Deferred SDK loading tests to Phase 3 (E2E) due to Next.js Script component limitations
- Deferred wizard flow tests to Phase 3 as they require real SDK integration
- Focused on UI rendering, user interactions (filtering), and content verification
- Used `getByRole` queries to avoid confusion between buttons and content with same text

---

## Phase 3: E2E Tests with Playwright 📋 PLANNED

**Status**: 📋 Planned
**Estimated Time**: 2-3 days
**Estimated Tests**: +10-15 tests

### Goals

Test complete user journeys in real browsers with actual SDK rendering.

### Setup Tasks

- [ ] Install Playwright (`pnpm add -D @playwright/test`)
- [ ] Create `playwright.config.ts`
- [ ] Configure browsers (Chromium, Firefox, WebKit)
- [ ] Set up test fixtures and page objects
- [ ] Configure screenshot directory

### E2E Test Scenarios

#### 3.1 Critical User Flows

**File**: `tests/e2e/user-flows.spec.ts`

- [ ] Homepage → Web SDK Samples → Document Generator (full flow)
- [ ] Navigate to all SDK pages from homepage
- [ ] Navigate back from SDK pages to homepage
- [ ] Click external documentation links (check href, don't navigate)
- [ ] Test dark mode toggle (if implemented)

#### 3.2 SDK Integration Tests

**File**: `tests/e2e/sdk-integration.spec.ts`

- [ ] Document viewer loads and renders PDF
- [ ] Document Generator wizard completes and shows preview
- [ ] PDF viewer toolbar appears
- [ ] Can interact with viewer (zoom, scroll)
- [ ] Multiple viewers on same page don't conflict

#### 3.3 Visual Regression Tests

**File**: `tests/e2e/visual-regression.spec.ts`

- [ ] Screenshot homepage (light mode)
- [ ] Screenshot homepage (dark mode)
- [ ] Screenshot design system page
- [ ] Screenshot Web SDK samples page
- [ ] Screenshot Document Generator page
- [ ] Compare screenshots against baseline

#### 3.4 Responsive Design Tests

**File**: `tests/e2e/responsive.spec.ts`

- [ ] Test mobile viewport (375px)
- [ ] Test tablet viewport (768px)
- [ ] Test desktop viewport (1440px)
- [ ] Test navigation works on mobile
- [ ] Test tables scroll on mobile

### Playwright Configuration

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile', use: { ...devices['iPhone 12'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## Phase 4: CI/CD Enhancements 📋 PLANNED

**Status**: 📋 Planned
**Estimated Time**: 1 day

### Tasks

#### 4.1 Enhanced GitHub Actions

**File**: `.github/workflows/test.yml` (update)

- [ ] Add E2E test job
- [ ] Run E2E tests against Vercel preview deployments
- [ ] Add test result comments to PRs
- [ ] Add coverage badges to README
- [ ] Set up Codecov integration
- [ ] Cache Playwright browsers
- [ ] Parallel test execution

#### 4.2 Preview Deployment Testing

- [ ] Trigger tests on Vercel preview URLs
- [ ] Test against production-like environment
- [ ] Block PR merges if tests fail
- [ ] Store E2E test artifacts (screenshots, videos)

#### 4.3 Performance Monitoring

- [ ] Add Lighthouse CI
- [ ] Test Core Web Vitals
- [ ] Monitor bundle size
- [ ] Track test execution time

---

## Nice-to-Have Tests (Future)

### Accessibility Tests

- [ ] Install `@axe-core/playwright`
- [ ] Test all pages with axe
- [ ] Check keyboard navigation
- [ ] Test screen reader compatibility
- [ ] Verify ARIA labels

### Performance Tests

- [ ] Test SDK load time
- [ ] Test page load time
- [ ] Test bundle size
- [ ] Test memory usage

### Security Tests

- [ ] Check for XSS vulnerabilities
- [ ] Test CSP headers
- [ ] Verify no sensitive data in client code
- [ ] Check for outdated dependencies

### SEO Tests

- [ ] Test meta tags present
- [ ] Test OpenGraph tags
- [ ] Test canonical URLs
- [ ] Test sitemap.xml

---

## Test Metrics & Goals

### Current Metrics (Phase 1 + 2 Partial)

| Metric | Value |
|--------|-------|
| Test Files | 8 |
| Total Tests | 57 |
| Passing | 57 (100%) |
| Execution Time | ~1 second |
| Coverage | ~50% (UI components + integration flows) |

### Target Metrics (All Phases Complete)

| Metric | Target |
|--------|--------|
| Test Files | 20-25 |
| Total Tests | 70-100 |
| Passing | 100% |
| Execution Time | < 5 seconds (unit/integration), < 2 minutes (E2E) |
| Code Coverage | 80%+ for critical paths |
| CI Success Rate | > 95% |

---

## Testing Best Practices

### Writing Tests

1. **Test user behavior, not implementation**
   - Focus on what users see and do
   - Avoid testing internal state

2. **Use semantic queries**
   - Prefer `getByRole`, `getByLabelText`, `getByText`
   - Avoid `getByTestId` unless necessary

3. **Keep tests focused**
   - One test = one behavior
   - Clear test names describing behavior

4. **Arrange-Act-Assert pattern**
   ```tsx
   // Arrange
   render(<Component />);

   // Act
   fireEvent.click(screen.getByRole('button'));

   // Assert
   expect(screen.getByText('Result')).toBeInTheDocument();
   ```

### Maintaining Tests

1. **Update tests when features change**
   - Tests should reflect current behavior
   - Remove tests for removed features

2. **Keep mocks up to date**
   - Update SDK mocks when SDK updates
   - Match real API responses

3. **Review test failures**
   - Failing tests indicate real issues
   - Don't skip or ignore failures

4. **Monitor test performance**
   - Keep tests fast (< 5 seconds total)
   - Parallelize when possible

---

## Troubleshooting Guide

### Common Issues

#### Tests fail after SDK update
1. Check SDK API changes in release notes
2. Update mocks in `tests/setup.ts`
3. Update tests to match new behavior
4. Run `pnpm test` to verify fixes

#### Import errors with `@/` alias
1. Verify `tsconfig.json` has correct paths
2. Verify `vitest.config.ts` has resolve alias
3. Restart TypeScript server

#### Tests timeout
1. Increase timeout in test: `it('test', { timeout: 10000 })`
2. Check for missing `await` on async operations
3. Verify mocks are working correctly

#### Coverage reports missing files
1. Check `coverage.exclude` in `vitest.config.ts`
2. Ensure files are not in `node_modules` or ignored dirs
3. Run `pnpm test:coverage` again

---

## Resources

### Documentation
- [Vitest Docs](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Docs](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

### Internal Docs
- [tests/README.md](tests/README.md) - Testing guide for developers
- [.github/workflows/test.yml](.github/workflows/test.yml) - CI configuration

### Commands
```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Interactive UI
pnpm test:ui

# Coverage report
pnpm test:coverage

# Run specific test file
pnpm test buttons.test.tsx

# Run tests matching pattern
pnpm test --grep "Button"
```

---

## Decision Log

### 2025-10-10: Chose Vitest over Jest
**Reason**: Faster, better DX, native ESM support, works well with Vite/Turbopack

### 2025-10-10: Chose Happy DOM over JSDOM
**Reason**: Lighter weight, faster, sufficient for our needs

### 2025-10-10: Phase 1 before E2E
**Reason**: Quick wins, establish foundation, easier to debug

### 2025-10-10: Deferred SDK loading tests to Phase 3
**Reason**: Next.js `<Script>` component doesn't render in test environment (Happy DOM). SDK loading requires real browser environment with E2E tests.

### 2025-10-10: Used getByRole queries for duplicate text
**Reason**: "Document Editor" appears both as a button and as table content. Using `getByRole("link")` and `getByRole("button")` disambiguates between them.

---

## Success Criteria

### Phase 1 ✅
- [x] Tests run in < 1 second
- [x] 20+ tests passing
- [x] CI pipeline configured
- [x] Documentation complete

### Phase 2 ✅ (Partially Complete)
- [x] Tests run in < 3 seconds (~1 second actual)
- [x] 40+ tests passing (57 tests actual)
- [x] Critical flows tested (filtering, navigation, page rendering)
- [ ] SDK loading covered (deferred to Phase 3)

### Phase 3 (Future)
- [ ] E2E tests run in < 2 minutes
- [ ] 60+ tests passing
- [ ] Visual regression baseline established
- [ ] Real browser testing works

### Overall Success
- [ ] 80%+ code coverage for critical paths
- [ ] New SDK version: tests catch breaking changes
- [ ] Code changes: tests prevent regressions
- [ ] Fast feedback (< 5 seconds for unit/integration)
- [ ] Easy to add new tests
- [ ] Team confidence in deployments

---

## Notes

- Keep tests focused and fast
- Prioritize tests that catch real bugs
- Don't test framework code (Next.js, React)
- Mock external dependencies (SDK, APIs)
- Update this plan as we progress
