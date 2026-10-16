package shop.karthikachickencentre.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

/**
 * Opens UPI / payment-app deep links outside the WebView. Also uses a Chrome-like
 * user agent so payment gateways don't treat the shell as a locked-down WebView.
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView webView = getBridge().getWebView();
        webView.post(this::configureWebView);
    }

    @Override
    public void onStart() {
        super.onStart();
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.post(this::configureWebView);
        }
    }

    private void configureWebView() {
        WebView webView = getBridge().getWebView();
        if (webView == null) return;

        WebSettings settings = webView.getSettings();
        // Razorpay hides UPI when it detects "; wv" (Android WebView).
        settings.setUserAgentString(
            "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36"
        );
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setDomStorageEnabled(true);

        webView.setWebViewClient(new BridgeWebViewClient(getBridge()) {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (uri == null) {
                    return super.shouldOverrideUrlLoading(view, request);
                }
                String url = uri.toString();
                String scheme = uri.getScheme() != null ? uri.getScheme().toLowerCase() : "";

                if (isExternalPaymentUrl(scheme, url)) {
                    return openExternal(url);
                }
                return super.shouldOverrideUrlLoading(view, request);
            }
        });
    }

    private boolean isExternalPaymentUrl(String scheme, String url) {
        if (scheme.equals("http") || scheme.equals("https") || scheme.equals("about") || scheme.equals("data")) {
            return false;
        }
        return scheme.equals("upi")
            || scheme.equals("phonepe")
            || scheme.equals("tez")
            || scheme.equals("gpay")
            || scheme.equals("paytmmp")
            || scheme.equals("bhim")
            || scheme.equals("amazonpay")
            || scheme.equals("credpay")
            || scheme.equals("intent")
            || url.startsWith("intent://");
    }

    private boolean openExternal(String url) {
        try {
            Intent intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME);
            if (intent.resolveActivity(getPackageManager()) != null) {
                startActivity(intent);
                return true;
            }
            Intent view = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            view.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(view);
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }
}
