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
import com.getcapacitor.Bridge;
import android.os.Bundle;
import android.util.Log;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "9jaTalk";
    private static final int PERMISSION_REQUEST_CODE = 1001;
    private PermissionRequest pendingPermissionRequest;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Request permissions immediately on startup
        requestMediaPermissions();

        // Override WebChromeClient AFTER super.onCreate so we wrap Capacitor's client
        getBridge().getWebView().post(() -> {
            WebView webView = getBridge().getWebView();

            // Get Capacitor's existing WebChromeClient to wrap it
            final WebChromeClient existingClient = new WebChromeClient();

            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    Log.d(TAG, "onPermissionRequest called for: " +
                        java.util.Arrays.toString(request.getResources()));

                    runOnUiThread(() -> {
                        // Always grant the request if Android permissions are granted
                        if (hasMediaPermissions()) {
                            Log.d(TAG, "Granting WebView permission request");
                            request.grant(request.getResources());
                        } else {
                            pendingPermissionRequest = request;
                            requestMediaPermissions();
                        }
                    });
                }

                @Override
                public boolean onShowFileChooser(WebView webView2,
                    android.webkit.ValueCallback<android.net.Uri[]> filePathCallback,
                    FileChooserParams fileChooserParams) {
                    return existingClient.onShowFileChooser(webView2, filePathCallback, fileChooserParams);
                }
            });
        });
    }

    private boolean hasMediaPermissions() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                == PackageManager.PERMISSION_GRANTED
            && ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                == PackageManager.PERMISSION_GRANTED;
    }

    private void requestMediaPermissions() {
        String[] permissions = {
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.CAMERA,
            Manifest.permission.MODIFY_AUDIO_SETTINGS
        };

        boolean needsRequest = false;
        for (String p : permissions) {
            if (ContextCompat.checkSelfPermission(this, p) != PackageManager.PERMISSION_GRANTED) {
                needsRequest = true;
                break;
            }
        }

        if (needsRequest) {
            ActivityCompat.requestPermissions(this, permissions, PERMISSION_REQUEST_CODE);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQUEST_CODE) {
            boolean allGranted = true;
            for (int result : grantResults) {
                if (result != PackageManager.PERMISSION_GRANTED) {
                    allGranted = false;
                    break;
                }
            }
            Log.d(TAG, "Permission result: allGranted=" + allGranted);
            if (pendingPermissionRequest != null) {
                if (allGranted) {
                    pendingPermissionRequest.grant(pendingPermissionRequest.getResources());
                } else {
                    pendingPermissionRequest.deny();
                }
                pendingPermissionRequest = null;
            }
        }
    }
}
