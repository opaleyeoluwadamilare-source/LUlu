# Replace Logo Files - EXACT STEPS

## ⚠️ IMPORTANT: I Cannot Create Image Files
I can only work with code/text files. You need to physically replace these image files yourself.

## Files You Need to Replace

### 1. Create `og-image.png` (MOST IMPORTANT)
**Location**: `C:\Users\OPAkg\Downloads\code (4)\public\og-image.png`

**Specifications**:
- Size: **1200 pixels wide × 630 pixels tall**
- Format: PNG
- Content: Your cloud with crown logo, centered on a clean background
- File size: Keep under 1MB for fast loading

**How to create it**:
1. Open your cloud with crown logo image
2. Resize/crop it to exactly 1200×630 pixels
3. Center the logo on the canvas
4. Save as `og-image.png` in the `public` folder

### 2. Replace `apple-icon.png`
**Location**: `C:\Users\OPAkg\Downloads\code (4)\public\apple-icon.png`

**Specifications**:
- Size: **180×180 pixels** (or 512×512 for better quality)
- Format: PNG
- Content: Your cloud with crown logo
- Background: Can be transparent or solid color

**How to replace it**:
1. Delete the existing `apple-icon.png` file
2. Create a new 180×180 (or 512×512) version of your logo
3. Save it as `apple-icon.png` in the `public` folder

### 3. Replace `icon.svg`
**Location**: `C:\Users\OPAkg\Downloads\code (4)\public\icon.svg`

**Specifications**:
- Format: SVG (vector)
- Content: Your cloud with crown logo as SVG
- Size: Scalable (no fixed dimensions)

**How to replace it**:
1. Delete the existing `icon.svg` file
2. Export your logo as SVG format
3. Save it as `icon.svg` in the `public` folder

## Quick Steps Summary

1. **Get your cloud with crown logo** ready in these formats:
   - PNG: 1200×630 (for og-image.png)
   - PNG: 180×180 or 512×512 (for apple-icon.png)
   - SVG (for icon.svg)

2. **Navigate to**: `C:\Users\OPAkg\Downloads\code (4)\public\`

3. **Replace the files**:
   - Create new `og-image.png` (1200×630)
   - Replace `apple-icon.png` (180×180)
   - Replace `icon.svg` (SVG format)

4. **After replacing**:
   - Restart your Next.js dev server
   - Deploy to production
   - Use Facebook Debugger to clear cache

## Tools You Can Use

- **Image Editor**: Photoshop, GIMP, Canva, Figma
- **Online Resizer**: https://www.iloveimg.com/resize-image
- **SVG Converter**: https://convertio.co/png-svg/ or use Figma/Illustrator

## Verification

After replacing files, verify they exist:
```powershell
# Run this in PowerShell from your project root
Get-ChildItem -Path "public" -Filter "og-image.png","apple-icon.png","icon.svg"
```

You should see all three files listed.

