# How to Add the Cloud with Crown Logo

To update the logo that appears when sharing your app link via WhatsApp, iMessage, and other platforms, you need to add the following image files to the `public` folder:

## Required Image Files

### 1. **og-image.png** (Most Important for Social Sharing)
- **Location**: `C:\Users\OPAkg\Downloads\code (4)\public\og-image.png`
- **Size**: 1200 x 630 pixels (recommended for social media)
- **Format**: PNG with transparent background (or white background)
- **Purpose**: This is the main image that appears when sharing links on WhatsApp, iMessage, Facebook, Twitter, etc.
- **Content**: Your cloud with crown logo, centered on a clean background

### 2. **icon.svg** (Optional - for browser favicon)
- **Location**: `C:\Users\OPAkg\Downloads\code (4)\public\icon.svg`
- **Format**: SVG
- **Purpose**: Browser tab icon
- **Content**: Your cloud with crown logo as an SVG

### 3. **apple-icon.png** (Optional - for iOS home screen)
- **Location**: `C:\Users\OPAkg\Downloads\code (4)\public\apple-icon.png`
- **Size**: 180 x 180 pixels (or 512 x 512 for better quality)
- **Format**: PNG
- **Purpose**: Icon when users add your app to iOS home screen
- **Content**: Your cloud with crown logo

## Quick Setup Steps

1. **Create or get your cloud with crown logo image**
   - Make sure it's clean and high quality
   - For `og-image.png`: Use 1200x630 pixels with your logo centered

2. **Save the files to the public folder:**
   ```
   public/
   ├── og-image.png      ← Most important for social sharing
   ├── icon.svg          ← Browser favicon (optional)
   └── apple-icon.png    ← iOS icon (optional)
   ```

3. **After adding the files:**
   - The Next.js dev server will automatically detect them
   - Test by sharing your link on WhatsApp or iMessage
   - You may need to clear cache or use a link preview tool to see the new image

## Testing Your Social Share Image

After adding `og-image.png`, you can test it using:
- **WhatsApp**: Send the link to yourself or a friend
- **Facebook Debugger**: https://developers.facebook.com/tools/debug/
- **Twitter Card Validator**: https://cards-dev.twitter.com/validator
- **LinkedIn Post Inspector**: https://www.linkedin.com/post-inspector/

## Notes

- The `og-image.png` file is the most critical one for social sharing
- Make sure the image is optimized (not too large file size)
- The image should be clear and readable at small sizes
- If you only add `og-image.png`, that's enough for WhatsApp/iMessage sharing to work

