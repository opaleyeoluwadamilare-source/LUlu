# Replace Logo Files - Quick Guide

To update the logo that appears when sharing links on iMessage, WhatsApp, and browsers, you need to **replace** these existing files in the `public` folder with your new cloud with crown logo:

## Files to Replace (IMPORTANT - Do This First!)

### 1. **og-image.png** (MOST IMPORTANT for iMessage/WhatsApp)
- **Current location**: `C:\Users\OPAkg\Downloads\code (4)\public\og-image.png` (doesn't exist yet - create it)
- **OR replace**: Create this new file
- **Size**: 1200 x 630 pixels
- **Format**: PNG
- **Purpose**: This is the main image that appears in iMessage, WhatsApp, Facebook, Twitter link previews
- **Action**: Create this file with your cloud with crown logo

### 2. **apple-icon.png** (Important for iMessage/iOS)
- **Current location**: `C:\Users\OPAkg\Downloads\code (4)\public\apple-icon.png` (exists - REPLACE IT)
- **Size**: 180 x 180 pixels (or 512 x 512 for better quality)
- **Format**: PNG
- **Purpose**: iOS home screen icon and iMessage preview fallback
- **Action**: Replace the existing file with your cloud with crown logo

### 3. **icon.svg** (For browser tabs)
- **Current location**: `C:\Users\OPAkg\Downloads\code (4)\public\icon.svg` (exists - REPLACE IT)
- **Format**: SVG
- **Purpose**: Browser tab favicon
- **Action**: Replace the existing file with your cloud with crown logo as SVG

### 4. **icon-light-32x32.png** (Optional - for browser)
- **Current location**: `C:\Users\OPAkg\Downloads\code (4)\public\icon-light-32x32.png` (exists - REPLACE IT)
- **Size**: 32 x 32 pixels
- **Format**: PNG
- **Action**: Replace with your logo (light version)

### 5. **icon-dark-32x32.png** (Optional - for browser)
- **Current location**: `C:\Users\OPAkg\Downloads\code (4)\public\icon-dark-32x32.png` (exists - REPLACE IT)
- **Size**: 32 x 32 pixels
- **Format**: PNG
- **Action**: Replace with your logo (dark version)

## Quick Steps

1. **Get your cloud with crown logo** in the following formats:
   - PNG: 1200x630 (for og-image.png)
   - PNG: 180x180 or 512x512 (for apple-icon.png)
   - SVG (for icon.svg)
   - PNG: 32x32 (for icon-light and icon-dark)

2. **Replace the files** in `C:\Users\OPAkg\Downloads\code (4)\public\`:
   - Delete or replace `apple-icon.png`
   - Delete or replace `icon.svg`
   - Create new `og-image.png` (1200x630)
   - (Optional) Replace `icon-light-32x32.png` and `icon-dark-32x32.png`

3. **After replacing files**:
   - Restart your Next.js dev server
   - Clear browser cache or use incognito mode
   - Test by sharing the link on iMessage
   - iMessage may cache the old image - wait a few minutes or use a link preview tool

## Testing

After replacing the files, test the link preview:
- **iMessage**: Send the link to yourself
- **WhatsApp**: Share the link
- **Facebook Debugger**: https://developers.facebook.com/tools/debug/ (clears cache)
- **LinkedIn**: https://www.linkedin.com/post-inspector/

## Important Notes

- **og-image.png** is the most critical file for iMessage/WhatsApp link previews
- iMessage caches images - it may take a few minutes to update
- Make sure image file sizes are reasonable (under 1MB for og-image.png)
- The metadata is already configured correctly - you just need to replace the image files

