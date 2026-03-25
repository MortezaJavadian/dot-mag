# Android Build Instructions

## Build Process

### First Time Setup

1. Navigate to android directory:

   ```bash
   cd android
   ```

2. Build APK (bubblewrap will prompt to create keystore):

   ```bash
   bubblewrap build
   ```

3. When prompted for keystore creation, provide:
   - First and Last names
   - Organizational Unit
   - Organization: `Dot`
   - Country: `IR`
   - Keystore password (remember this!)
   - Key password (remember this!)

4. Extract SHA256 fingerprint:

   ```bash
   keytool -list -v -keystore android.keystore -alias dotmag_release
   ```

   Enter keystore password when prompted.
   Copy the SHA256 fingerprint (format: AA:BB:CC:DD:EE:FF:...)

5. Update `.env` file in project root:

   ```bash
   cd ..
   echo "ANDROID_SHA256_FINGERPRINT=YOUR_FINGERPRINT_HERE" >> .env
   ```

6. Deploy the app to production so Digital Asset Links verification works.

### Subsequent Builds

```bash
cd android
bubblewrap build
```

## Output Files

After build, you'll find:

- `app-release-signed.apk` - Install this on Android devices
- `app-release-bundle.aab` - Upload this to Google Play Store

## Troubleshooting

### URL Bar Appears in App

If you see a URL bar and share button when opening the app, it means TWA (Trusted Web Activity) verification is failing. This happens when the app can't verify the connection to your website.

**Solutions:**

1. **Check SHA256 fingerprint in .env**
   - Make sure the fingerprint in `.env` exactly matches your keystore
   - No extra spaces or missing colons

2. **Verify Digital Asset Links is working**

   ```bash
   curl https://dotmag.ir/.well-known/assetlinks.json
   ```

   Should return JSON with your package name and SHA256 fingerprint.

3. **Wait for Google verification**
   - Google caches Digital Asset Links verification
   - Can take 24-48 hours to update
   - Try clearing app data and reinstalling

4. **Clear app data**
   - Go to Settings > Apps > Dot
   - Clear Storage & Cache
   - Uninstall and reinstall

5. **Test locally first**
   - Update `/etc/hosts` to point dotmag.ir to localhost
   - Run `npm run dev`
   - Install APK and test
   - This helps verify the fingerprint is correct before deploying

## Configuration

The build configuration is in `twa-manifest.json`. Key settings:

- `packageId`: App identifier (ir.dotmag.twa)
- `display`: fullscreen (no URL bar when TWA works)
- `orientation`: portrait-primary (locked to portrait)
- `themeColor`: App theme color (#D73B3A)
- `backgroundColor`: Splash screen background (#000000)
- `startUrl`: Root path (/)
- `minSdkVersion`: Minimum Android version (21 = Android 5.0)

## Updating the App

To release a new version:

1. Update version in `twa-manifest.json`:

   ```json
   {
     "appVersionCode": 2,
     "appVersionName": "1.0.1"
   }
   ```

2. Build new APK:

   ```bash
   bubblewrap build
   ```

3. Test the new APK

4. Upload AAB to Google Play Store (if published there)

## Resources

- [Bubblewrap Documentation](https://github.com/GoogleChromeLabs/bubblewrap)
- [TWA Documentation](https://developer.chrome.com/docs/android/trusted-web-activity/)
- [Digital Asset Links](https://developers.google.com/digital-asset-links/v1/getting-started)
