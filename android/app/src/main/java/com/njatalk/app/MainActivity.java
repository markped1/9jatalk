package com.njatalk.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.webkit.WebSettings;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.util.Log;
import java.util.Arrays;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "9jaTalk";
    private static final int PERMISSION_REQUEST_CODE = 1001;
    private PermissionRequest pendingPermissionRequest;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Request permissions immediately
        String[] permissions = {
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.CAMERA,
            Manifest.permission.MODIFY_AUDIO_SETTINGS
        };
        ActivityCompat.requestPermissions(this, permissions, PERMISSION_REQUEST_CODE);

        // Set WebChromeClient after a short delay to ensure Bridge is ready
        getBridge().getWebView().postDelayed(() -> {
            WebView webView = getBridge().getWebView();
            WebSettings settings = webView.getSettings();
            settings.setMediaPlaybackRequiresUserGesture(false);

            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    Log.d(TAG, "Permission request: " + Arrays.toString(request.getResources()));
                    runOnUiThread(() -> {
                        // Grant ALL resources immediately - no questions asked
                        request.grant(request.getResources());
                        Log.d(TAG, "Granted all WebView permissions");
                    });
                }
            });
        }, 500);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQUEST_CODE) {
            Log.d(TAG, "Android permissions granted");
            if (pendingPermissionRequest != null) {
                pendingPermissionRequest.grant(pendingPermissionRequest.getResources());
                pendingPermissionRequest = null;
            }
        }
    }
}
