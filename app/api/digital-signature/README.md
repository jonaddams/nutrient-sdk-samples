# Digital Signature Sample - Nutrient DWS API

This sample demonstrates how to digitally sign PDF documents using the Nutrient DWS API integrated with Nutrient Web SDK.

## Features

- **Custom Toolbar Integration**: Adds a custom signature button to the Web SDK toolbar
- **Token-Based Authentication**: Securely authenticates with DWS API using JWT tokens
- **Digital Signing**: Uses `instance.signDocument()` to sign documents via DWS API
- **Certificate Trust**: Configures Web SDK to trust Nutrient signing certificates
- **Status Feedback**: Visual feedback during the signing process

## File Structure

```
app/api/digital-signature/
├── page.tsx                          # Main page component
├── viewer.tsx                        # Viewer component with signing logic
├── api/
│   ├── token/
│   │   └── route.ts                  # API endpoint for JWT token generation
│   └── certificates/
│       └── route.ts                  # API endpoint for CA certificates
└── README.md                         # This file
```

## How It Works

1. **Custom Toolbar**: The viewer creates a custom toolbar item with a signature icon using the `toolbarItems` configuration
2. **Certificate Fetching**: On mount, the component fetches CA certificates from the DWS API
3. **Token Generation**: When the signature button is clicked, a JWT token is requested from `/api/digital-signature/api/token`
4. **Document Signing**: The `instance.signDocument()` method is called with the JWT token and signing configuration
5. **Certificate Trust**: The `trustedCAsCallback` configuration ensures the signed document is properly validated

## API Endpoints

### POST `/api/digital-signature/api/token`

Generates a JWT token from the DWS Processor API for digital signature authentication.

**Request Body:**
```json
{
  "origin": "https://your-app.com"
}
```

**DWS API Request:**
The endpoint calls `https://api.nutrient.io/tokens` with:
```json
{
  "allowedOperations": ["digital_signatures_api"],
  "expirationTime": 3600
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### GET `/api/digital-signature/api/certificates`

Endpoint for CA certificates for signature validation.

**Note:** The specific DWS API endpoint for retrieving CA certificates is not publicly documented. For production use, you may need to:
1. Contact Nutrient support for the correct certificates endpoint
2. Use a Document Engine instance which provides certificate endpoints
3. Hardcode Nutrient CA certificates if provided by support

The signing functionality works without certificates, but signature validation may require additional configuration.

**Response:**
```json
{
  "ca_certificates": []
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

1. Navigate to `/api/digital-signature`
2. Click the signature button in the toolbar (icon with crossing lines and a dot)
3. Wait for the signing process to complete
4. The document will be digitally signed using DWS API

## Key Implementation Details

### Custom Toolbar Button

```typescript
{
  type: "custom",
  id: "digital-signature-button",
  title: "Sign Document",
  icon: `<svg>...</svg>`,
  onPress: () => handleSignDocument(),
}
```

### Signing Configuration

```typescript
await instance.signDocument(
  {
    signingData: {
      signatureType: "cades",
    },
  },
  {
    jwt: token,
  },
);
```

### Certificate Trust

```typescript
trustedCAsCallback: async () => {
  if (certificates?.ca_certificates) {
    return certificates.ca_certificates.map((cert) =>
      decodeBase64String(cert)
    );
  }
  return [];
}
```

## References

- [Nutrient DWS API Documentation](https://www.nutrient.io/api/)
- [Digital Signatures API](https://www.nutrient.io/api/signing-api/)
- [Custom Toolbar Guide](https://www.nutrient.io/guides/web/user-interface/main-toolbar/create-a-new-tool/)
- [signDocument API Reference](https://www.nutrient.io/api/web/classes/NutrientViewer.Instance.html#signdocument)
- [Digital Signatures Guide](https://www.nutrient.io/guides/web/signatures/digital-signatures/)

## Security Notes

- Document content remains private; only the hash is sent to DWS API
- JWT tokens are short-lived (1 hour) and can be restricted by origin and operation
- Signatures are legally binding and validate in Adobe products
- The system is SOC 2-compliant

## Known Limitations

- **Certificate Validation**: Without proper CA certificates configured, you may see validation warnings in the console
- **Signature Validation Status**: The signature validation badge will appear after signing, but may show as invalid without CA certificate trust configured
- For production use with full signature validation, contact Nutrient support to obtain the correct CA certificates endpoint or certificate files
