# Document Loading Methods Demo

A comprehensive demonstration of all supported document loading methods in Nutrient Web SDK.

## Overview

This demo showcases the four primary methods for loading PDF documents into the Nutrient Web SDK viewer:

1. **URL** - Loading from file paths or remote URLs
2. **ArrayBuffer** - Loading from binary data in memory
3. **Blob** - Loading from File/Blob objects
4. **Base64** - Loading from base64-encoded strings

## Features

- ✅ Interactive switching between all 4 loading methods
- ✅ File upload support with method selection
- ✅ Live code examples for each method
- ✅ Comprehensive inline documentation
- ✅ Proper memory management (Object URL cleanup)
- ✅ Full TypeScript type safety
- ✅ Accessibility features (ARIA labels, semantic HTML)
- ✅ Responsive design with dark mode support
- ✅ Production-ready code examples

## Use Cases

### URL Loading
- **Best for:** Remote documents, CDN-hosted files, large documents
- **Benefits:** Progressive loading, streaming support, bandwidth optimization
- **Example:** `document: "/documents/example.pdf"`

### ArrayBuffer Loading
- **Best for:** API responses, encrypted content, custom processing
- **Benefits:** Complete data control, works with any binary source
- **Example:** `document: arrayBuffer`

### Blob Loading
- **Best for:** File uploads, drag-and-drop, IndexedDB storage
- **Benefits:** Native browser file handling, efficient memory usage
- **Example:** `document: URL.createObjectURL(blob)`
- **Note:** Must convert Blobs to Object URLs

### Base64 Loading
- **Best for:** JSON-embedded documents, email attachments, legacy APIs
- **Benefits:** Simple data transfer, easy embedding
- **Example:** `document: base64ToArrayBuffer(base64String)`
- **Note:** Must decode to ArrayBuffer first

## Technical Implementation

### Code Quality
- Zero `any` types (full TypeScript type safety)
- Proper React hooks with correct dependencies
- Memory leak prevention (Object URL revocation)
- Comprehensive error handling
- Console logging for debugging

### Architecture
- Clear separation of concerns
- Utility functions for data conversion
- useCallback for stable function references
- Proper cleanup on component unmount

### Documentation
- JSDoc comments on all functions
- Inline explanations of complex logic
- Production-ready code examples
- Links to official Nutrient documentation

## Files

- `viewer.tsx` - Main component with loading logic (700+ lines, fully documented)
- `page.tsx` - Route entry point with dynamic loading
- `styles.css` - Professional styling with dark mode support
- `README.md` - This file

## Testing

All loading methods have been tested with:
- Default document (usenix-example-paper.pdf)
- Uploaded PDF files
- Method switching with both default and uploaded documents
- Error scenarios

## Deployment Ready

✅ Biome checks pass  
✅ TypeScript compilation succeeds  
✅ No linting errors  
✅ No accessibility warnings  
✅ Production-grade code quality  

## Documentation References

- [Load from URL](https://www.nutrient.io/guides/web/open-a-document/from-remote-url/)
- [Load from ArrayBuffer](https://www.nutrient.io/guides/web/open-a-document/from-arraybuffer/)
- [Load from Blob](https://www.nutrient.io/guides/web/open-a-document/from-blob/)
- [Load from Base64](https://www.nutrient.io/guides/web/open-a-document/from-base64-data/)
- [API Reference](https://www.nutrient.io/api/web/functions/NutrientViewer.load.html)
