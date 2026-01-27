/**
 * Logo asset module
 *
 * Provides the logo URL that works in both PWA and portable builds.
 * Uses Vite's asset handling - will be inlined as base64 when assetsInlineLimit is set high enough.
 */

// Import logo as asset - Vite handles this based on build config
// In portable builds with high assetsInlineLimit, this becomes a data URL
// In PWA builds, this becomes a hashed file path like /assets/logo-abc123.png
import logoUrl from './logo.png';

export { logoUrl };
