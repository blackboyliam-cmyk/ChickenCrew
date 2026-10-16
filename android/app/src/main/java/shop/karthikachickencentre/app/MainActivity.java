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
 * Opens UPI / payment-app deep links outside the WebView so Razorpay can show
 * UPI the same way it does in Chrome. Also strips the "; wv" WebView marker
 * that some gateways use to hide UPI Intent.
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        String ua = settings.getUserAgentString();
        if (ua != null && ua.contains("; wv")) {
            settings.setUserAgentString(ua.replace("; wv", ""));
        }

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
