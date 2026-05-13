# Firebase Phone Auth Setup Checklist

1. **Enable Phone Authentication**
   - Go to Firebase Console → Authentication → Sign-in method → Enable Phone.

2. **Register Android App**
   - Add your app's package name (e.g., com.yourcompany.9jatalk) in Firebase Console → Project settings → General.
   - Download and add the `google-services.json` to your Android app folder if not already present.

3. **Add SHA-1 and SHA-256**
   - For debug: `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`
   - Add both SHA-1 and SHA-256 fingerprints in Firebase Console → Project settings → General.

4. **Check .env.local**
   - Ensure all VITE_FIREBASE_* values match your Firebase project settings.
   - No placeholder values (e.g., YOUR_API_KEY) should remain.

5. **Recaptcha for Android**
   - No extra setup for invisible Recaptcha, but ensure your app is registered and authorized in Firebase.
   - If using a custom domain, set it in Firebase Auth settings.

6. **Test on Real Device**
   - Make sure the device has internet access.
   - If you see 'Failed to fetch' or 'auth/app-not-authorized', double-check package name and SHA-1.

7. **Check Firebase Console Logs**
   - Go to Authentication → Usage or Logs for error details.

---

If you follow all steps and still see errors, check for typos in config, network issues, or contact Firebase support.
