# Step-by-Step Guide: Replace Logo Files

## Overview
You need to replace 3 image files in your `public` folder with your new cloud with crown logo. This will update the logo that appears when sharing links on iMessage, WhatsApp, and in browser tabs.

---

## Prerequisites
- Your cloud with crown logo image file (the one you want to use)
- An image editor (Photoshop, GIMP, Canva, Figma, or online tools)
- Access to the `public` folder

---

## STEP 1: Prepare Your Logo Files

### 1.1 Get Your Cloud with Crown Logo Ready
- Make sure you have the cloud with crown logo image file
- It can be in any format (PNG, JPG, SVG, etc.) - we'll convert it

### 1.2 Open Your Image Editor
You can use:
- **Online**: Canva.com, Photopea.com, or iloveimg.com
- **Desktop**: Photoshop, GIMP, Figma
- **Simple**: Windows Paint (for basic resizing)

---

## STEP 2: Create og-image.png (MOST IMPORTANT)

### 2.1 Open Your Logo in Image Editor
- Open your cloud with crown logo image

### 2.2 Resize to 1200×630 pixels
**In Canva:**
1. Create a new design
2. Set custom size: 1200 width × 630 height (pixels)
3. Upload your logo
4. Center it on the canvas
5. Export as PNG

**In Photoshop/GIMP:**
1. File → New → Set dimensions: 1200 × 630 pixels
2. Import your logo
3. Center it
4. Export/Save as PNG

**Online (iloveimg.com):**
1. Go to https://www.iloveimg.com/resize-image
2. Upload your logo
3. Set width: 1200, height: 630
4. Download the resized image

### 2.3 Save the File
1. Navigate to: `C:\Users\OPAkg\Downloads\code (4)\public\`
2. Save the file as: `og-image.png`
3. **Important**: Make sure it's exactly named `og-image.png` (not `og-image (1).png` or anything else)

### 2.4 Verify
- Check that the file exists at: `C:\Users\OPAkg\Downloads\code (4)\public\og-image.png`
- File size should be reasonable (under 1MB is ideal)

---

## STEP 3: Replace apple-icon.png

### 3.1 Resize Your Logo to 180×180 pixels
**In Canva:**
1. Create new design: 180 × 180 pixels
2. Upload your logo
3. Center it
4. Export as PNG

**In Photoshop/GIMP:**
1. File → New → 180 × 180 pixels
2. Import your logo
3. Center it
4. Export as PNG

**Online:**
1. Go to https://www.iloveimg.com/resize-image
2. Upload your logo
3. Set width: 180, height: 180
4. Download

### 3.2 Delete the Old File
1. Navigate to: `C:\Users\OPAkg\Downloads\code (4)\public\`
2. Find `apple-icon.png`
3. Right-click → Delete (or press Delete key)
4. Confirm deletion

### 3.3 Save the New File
1. Save your 180×180 logo as: `apple-icon.png`
2. Make sure it's in: `C:\Users\OPAkg\Downloads\code (4)\public\`
3. **Important**: Exact name must be `apple-icon.png`

---

## STEP 4: Replace icon.svg

### 4.1 Convert Your Logo to SVG Format

**Option A: If you have the logo as SVG already**
- Just copy it to the public folder

**Option B: Convert from PNG/JPG to SVG**
1. Go to https://convertio.co/png-svg/ or https://cloudconvert.com/png-to-svg
2. Upload your logo
3. Convert to SVG
4. Download the SVG file

**Option C: Create SVG manually (if you have design skills)**
- Use Figma, Illustrator, or Inkscape
- Export as SVG

### 4.2 Delete the Old File
1. Navigate to: `C:\Users\OPAkg\Downloads\code (4)\public\`
2. Find `icon.svg`
3. Right-click → Delete
4. Confirm deletion

### 4.3 Save the New File
1. Save your SVG logo as: `icon.svg`
2. Make sure it's in: `C:\Users\OPAkg\Downloads\code (4)\public\`
3. **Important**: Exact name must be `icon.svg`

---

## STEP 5: Verify All Files Are in Place

### 5.1 Run the Verification Script
1. Open PowerShell in your project folder
2. Run this command:
   ```powershell
   powershell -ExecutionPolicy Bypass -File check-logo-files.ps1
   ```

### 5.2 Check Manually
Navigate to: `C:\Users\OPAkg\Downloads\code (4)\public\`

You should see these 3 files:
- ✅ `og-image.png` (should be around 100-500 KB)
- ✅ `apple-icon.png` (should be around 2-10 KB)
- ✅ `icon.svg` (should be around 1-5 KB)

### 5.3 Verify File Names
**CRITICAL**: File names must be EXACTLY:
- `og-image.png` (not `og-image (1).png` or `og_image.png`)
- `apple-icon.png` (not `apple-icon (1).png`)
- `icon.svg` (not `icon (1).svg`)

---

## STEP 6: Restart Your Development Server

### 6.1 Stop the Server
- In your terminal, press `Ctrl + C` to stop the Next.js server

### 6.2 Start the Server Again
```bash
npm run dev
```
or
```bash
next dev
```

### 6.3 Test Locally
1. Open: `http://localhost:3000/og-image.png`
   - You should see your new cloud with crown logo
2. Open: `http://localhost:3000/apple-icon.png`
   - You should see your new logo
3. Open: `http://localhost:3000/icon.svg`
   - You should see your new logo

---

## STEP 7: Deploy to Production

### 7.1 Commit Your Changes
```bash
git add public/og-image.png public/apple-icon.png public/icon.svg
git commit -m "Replace logo files with new cloud with crown logo"
git push
```

### 7.2 Wait for Deployment
- Wait for your deployment to complete (Vercel, Netlify, etc.)
- Usually takes 1-3 minutes

### 7.3 Verify on Production
1. Go to: `https://bedelulu.com/og-image.png`
   - Should show your new logo
2. Go to: `https://bedelulu.com/apple-icon.png`
   - Should show your new logo

---

## STEP 8: Clear Social Media Cache

### 8.1 Clear Facebook/Meta Cache (This helps with iMessage too)
1. Go to: https://developers.facebook.com/tools/debug/
2. Enter your URL: `https://bedelulu.com`
3. Click **"Scrape Again"** button
4. Wait for it to complete
5. You should see your new `og-image.png` in the preview

### 8.2 Clear Twitter Cache
1. Go to: https://cards-dev.twitter.com/validator
2. Enter your URL: `https://bedelulu.com`
3. Click **"Preview card"**
4. This refreshes Twitter's cache

### 8.3 Clear LinkedIn Cache
1. Go to: https://www.linkedin.com/post-inspector/
2. Enter your URL: `https://bedelulu.com`
3. Click **"Inspect"**

---

## STEP 9: Test on iMessage/WhatsApp

### 9.1 Wait 10-15 Minutes
- Social platforms cache images aggressively
- Wait at least 10-15 minutes after clearing cache

### 9.2 Test on iMessage
1. Open iMessage on your iPhone
2. Send the link `https://bedelulu.com` to yourself
3. Check if the preview shows your new cloud with crown logo
4. If it still shows old logo, wait another 10-15 minutes

### 9.3 Test on WhatsApp
1. Open WhatsApp
2. Send the link `https://bedelulu.com` to yourself
3. Check the preview
4. If old logo appears, wait a few more minutes

---

## Troubleshooting

### Problem: Still seeing old logo after 30 minutes
**Solution:**
1. Double-check file names are exact (no spaces, correct spelling)
2. Verify files are in the correct folder: `public/`
3. Clear browser cache (Ctrl+Shift+Delete)
4. Use Facebook Debugger again
5. Try a different device/browser

### Problem: Files not showing on localhost
**Solution:**
1. Make sure Next.js server is running
2. Restart the server
3. Clear browser cache
4. Try incognito/private mode

### Problem: Wrong image dimensions
**Solution:**
- `og-image.png` must be 1200×630
- `apple-icon.png` should be 180×180 (or 512×512)
- Use the verification script to check dimensions

### Problem: File names have extra characters
**Solution:**
- Windows sometimes adds `(1)` or ` - Copy` to file names
- Make sure exact names are:
  - `og-image.png` (not `og-image (1).png`)
  - `apple-icon.png` (not `apple-icon - Copy.png`)
  - `icon.svg` (not `icon (1).svg`)

---

## Quick Checklist

Before testing, make sure:
- [ ] `og-image.png` exists (1200×630px)
- [ ] `apple-icon.png` exists (180×180px)
- [ ] `icon.svg` exists (SVG format)
- [ ] All files are in `public/` folder
- [ ] File names are exact (no extra characters)
- [ ] Development server restarted
- [ ] Changes deployed to production
- [ ] Facebook Debugger used to clear cache
- [ ] Waited 10-15 minutes

---

## Summary

**The 3 files you need:**
1. `og-image.png` - 1200×630px (MOST IMPORTANT for iMessage/WhatsApp)
2. `apple-icon.png` - 180×180px (for iOS/iMessage)
3. `icon.svg` - SVG format (for browser tabs)

**Where to put them:**
`C:\Users\OPAkg\Downloads\code (4)\public\`

**After replacing:**
1. Restart dev server
2. Deploy to production
3. Clear cache using Facebook Debugger
4. Wait 10-15 minutes
5. Test on iMessage/WhatsApp

That's it! Once you complete these steps, your new cloud with crown logo will appear everywhere.

