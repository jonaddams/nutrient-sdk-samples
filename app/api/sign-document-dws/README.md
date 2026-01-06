# DWS Document Signing Sample

This sample demonstrates server-side PDF document signing using the Nutrient DWS Processor API. Unlike the Web SDK signing approach, this method uploads the entire document to the DWS API for processing.

## Key Differences from Web SDK Signing

| Feature | This Sample (DWS API) | Web SDK Digital Signature |
|---------|----------------------|---------------------------|
| **Method** | POST entire document to `/sign` endpoint | `instance.signDocument()` in browser |
| **Document Transfer** | Full PDF uploaded to server | Only document hash sent |
| **Processing** | Server-side signature application | Client-side signing coordination |
| **Use Case** | Backend document workflows | Interactive in-viewer signing |

## Features

- **File Upload**: Select and upload PDF documents from your local system
- **Signature Types**: Choose between visible and invisible signatures
- **Server-Side Processing**: Complete document signing handled by DWS Processor API
- **Signed Document Display**: View the signed PDF in the Web SDK viewer
- **Download**: Save the signed document with digital signature

## File Structure

```
app/api/sign-document-dws/
├── page.tsx                    # Main page with upload UI
├── viewer.tsx                  # Viewer component for signed documents
├── api/
│   └── sign/
│       └── route.ts           # API endpoint for document signing
└── README.md                  # This file
```

## How It Works

1. **Upload Document**: User selects a PDF file from their local system
2. **Configure Signature**: Choose between visible or invisible signature
3. **API Request**: File is sent to `/api/sign-document-dws/api/sign` via FormData
4. **DWS Processing**: Backend calls `POST https://api.nutrient.io/sign` with:
   - File as FormData attachment
   - Signature configuration JSON with CAdES b-lt settings
5. **Receive Signed PDF**: DWS API returns the signed document as a PDF buffer
6. **Display**: Signed document is displayed in the Web SDK viewer
7. **Download**: User can download the signed PDF

## API Endpoint

### POST `/api/sign-document-dws/api/sign`

Signs a PDF document using the DWS Processor API.

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `file`: PDF file to sign
  - `signatureType`: "visible" or "invisible"

**DWS API Call:**
```
POST https://api.nutrient.io/sign
Authorization: Bearer {API_KEY}
Content-Type: multipart/form-data

FormData:
- file: PDF document
- data: JSON configuration
  {
    "signatureType": "cades",
    "cadesLevel": "b-lt",
    "position": { "pageIndex": 0, "rect": [x, y, width, height] }  // for visible
    "position": { "pageIndex": 0 }  // for invisible
    "appearance": { ... }  // for visible signatures
  }
```

**Response:**
- Content-Type: `application/pdf`
- Body: Signed PDF document buffer

## Signature Configuration

### Invisible Signature
```json
{
  "signatureType": "cades",
  "cadesLevel": "b-lt",
  "position": {
    "pageIndex": 0
  }
}
```

### Visible Signature
```json
{
  "signatureType": "cades",
  "cadesLevel": "b-lt",
  "position": {
    "pageIndex": 0,
    "rect": [50, 50, 200, 100]
  },
  "appearance": {
    "mode": "signatureAndDescription",
    "showWatermark": true,
    "showSignDate": true,
    "showDateTimezone": false
  }
}
```

## Configuration

Ensure the following environment variables are set in `.env.local`:

```env
NUTRIENT_API_KEY=your_dws_api_key
NUTRIENT_API_BASE_URL=https://api.nutrient.io/
NEXT_PUBLIC_NUTRIENT_LICENSE_KEY=your_web_sdk_license_key
```

## Usage

1. Navigate to `/api/sign-document-dws`
2. Click "Select PDF Document" and choose a file
3. Select signature type (invisible or visible)
4. Click "Sign Document via DWS API"
5. View the signed document in the viewer
6. Download the signed PDF if needed

## Technical Details

### Signature Type: CAdES

The implementation uses CAdES (CMS Advanced Electronic Signatures) with b-lt level:
- **CAdES**: Cryptographic Message Syntax standard for digital signatures
- **b-lt (baseline long-term)**: Includes timestamp and enables long-term validation

### PDF Coordinates

For visible signatures, the `rect` array specifies:
- `[0]` x: Distance from left edge (PDF points, 1 point = 1/72 inch)
- `[1]` y: Distance from top edge
- `[2]` width: Width of signature box
- `[3]` height: Height of signature box

## References

- [Nutrient DWS Processor API](https://www.nutrient.io/api/processor-api/)
- [Digital Signatures API](https://www.nutrient.io/api/signing-api/)
- [Sign Endpoint Documentation](https://www.nutrient.io/api/documentation/tools-and-api/)

## Comparison: When to Use Each Approach

### Use DWS API Document Signing (This Sample) When:
- Processing documents in backend workflows
- Batch signing multiple documents
- No user interaction required during signing
- Need to programmatically control signature placement
- Building automated document pipelines

### Use Web SDK Digital Signature When:
- Users need to sign documents interactively
- Minimizing data transfer (only hash sent, not full PDF)
- Real-time signing in the browser
- Users should see and interact with the document before signing
- Building collaborative signing workflows
