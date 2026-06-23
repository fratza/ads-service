# Security Headers

## Overview

This scaffolding includes comprehensive HTTP security headers implemented out-of-the-box to protect against common web vulnerabilities. These headers comply with penetration test requirements (NCA-3.5) and follow OWASP best practices.

## Implemented Headers

### 1. Strict-Transport-Security (HSTS) ✅

**Value:** `max-age=31536000; includeSubDomains`

**Purpose:** Forces browsers to use HTTPS for 1 year, including all subdomains.

**Impact:** ✅ No functional issues

---

### 2. X-Content-Type-Options ✅

**Value:** `nosniff`

**Purpose:** Prevents browsers from MIME-sniffing responses away from declared content-type.

**Impact:** ✅ No functional issues

---

### 3. X-Frame-Options ✅

**Value:** `SAMEORIGIN`

**Purpose:** Prevents clickjacking by only allowing the site to frame itself.

**Impact:** ✅ No functional issues

---

### 4. Content-Security-Policy (CSP) ⚠️

**Default Policy:**
```
default-src 'self'; 
script-src 'self' 'unsafe-inline' 'unsafe-eval' [WHITELISTED_SCRIPTS]; 
style-src 'self' 'unsafe-inline' [WHITELISTED_STYLES]; 
img-src 'self' data: [WHITELISTED_IMAGES]; 
font-src 'self' data: [WHITELISTED_FONTS]; 
connect-src 'self' [WHITELISTED_CONNECTIONS]; 
frame-ancestors 'self'; 
base-uri 'self'; 
form-action 'self'
```

**Purpose:** Restricts sources for scripts, styles, images, and other resources.

**Default Whitelisted Domains:**
- ✅ Scripts: FontAwesome Kit
- ✅ Styles: Google Fonts + FontAwesome
- ✅ Images: All HTTPS sources
- ✅ Fonts: Google Fonts + FontAwesome CDN
- ✅ API connections: FontAwesome CDN

**Impact:** ⚠️ Test thoroughly before production

**Customization:** Edit `src/server/config/security.config.ts` to add/remove whitelisted domains.

---

### 5. Permissions-Policy ✅

**Value:**
```
geolocation=(), 
microphone=(), 
camera=(), 
payment=(), 
usb=()
```

**Purpose:** Disables browser features not needed by the application.

**Impact:** ✅ No functional issues (features not used)

---

### 6. Referrer-Policy ✅

**Value:** `strict-origin-when-cross-origin`

**Purpose:** Controls how much referrer information is sent with requests.

**Behavior:**
- Same origin → Full URL
- Cross origin (HTTPS) → Origin only
- Cross origin (HTTP downgrade) → No referrer

**Impact:** ✅ No functional issues

---

## Configuration

### Whitelisting Domains

To whitelist additional domains for your application, edit `src/server/config/security.config.ts`:

```typescript
// Add your CDN domain
export const SCRIPT_SOURCES = [
    'https://kit.fontawesome.com',
    'https://cdn.yourapp.com',  // Add your domain here
];

// Add Supabase for API connections
export const CONNECT_SOURCES = [
    'https://ka-f.fontawesome.com',
    'https://ka-p.fontawesome.com',
    'https://*.supabase.co',      // Add Supabase
    'wss://*.supabase.co',        // WebSocket support
];
```

### Common CDN Examples

**Supabase:**
```typescript
export const IMAGE_SOURCES = ['https://*.supabase.co'];
export const CONNECT_SOURCES = [
    'https://*.supabase.co',
    'wss://*.supabase.co',
];
```

**Image CDNs:**
```typescript
export const IMAGE_SOURCES = [
    'https://*.cloudinary.com',
    'https://*.imgix.net',
    'https://images.unsplash.com',
];
```

**Analytics:**
```typescript
export const SCRIPT_SOURCES = [
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
];
export const CONNECT_SOURCES = [
    'https://www.google-analytics.com',
];
```

---

## Implementation Location

**Files:**
- `src/server/middleware/security.middleware.ts` - Security headers middleware
- `src/server/config/security.config.ts` - Whitelisted domains configuration
- `src/server.ts` - Middleware registration

**Applied:** All responses via Express middleware

---

## Testing Checklist

### Before Deployment

- [ ] Test that application loads correctly with CSP enabled
- [ ] Verify external resources load (fonts, images, CDNs)
- [ ] Check browser console for CSP violations
- [ ] Test API connections work properly
- [ ] Verify HTTPS redirection works with HSTS

### Production Hardening

- [ ] Remove `unsafe-eval` from CSP (production build only)
- [ ] Consider nonce-based CSP for inline scripts
- [ ] Review and tighten `img-src` policy (remove `https:` wildcard)
- [ ] Add CSP reporting endpoint
- [ ] Review CSP violations in production logs

---

## Verification

### Check Headers in Browser

1. Open DevTools → Network tab
2. Reload page
3. Click any request
4. View Response Headers
5. Verify all security headers are present

### Check Headers via curl

```bash
curl -I https://your-domain.com
```

Expected output:
```
HTTP/2 200
strict-transport-security: max-age=31536000; includeSubDomains
x-content-type-options: nosniff
x-frame-options: SAMEORIGIN
content-security-policy: default-src 'self'; ...
permissions-policy: geolocation=(), ...
referrer-policy: strict-origin-when-cross-origin
```

---

## CSP Violation Monitoring

To monitor CSP violations in production, add reporting to `security.middleware.ts`:

```typescript
const csp = [
    // ... existing directives
    "report-uri /api/csp-report",
    "report-to csp-endpoint"
].join('; ');
```

Then create an endpoint to log violations:

```typescript
app.post('/api/csp-report', express.json({ type: 'application/csp-report' }), (req, res) => {
    console.warn('CSP Violation:', req.body);
    res.status(204).end();
});
```

---

## Additional Security Improvements

### 1. Disable X-Powered-By

Already implemented in `src/server.ts`:

```typescript
app.disable('x-powered-by');
```

### 2. Rate Limiting

Consider adding rate limiting for API routes:

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 3. Helmet.js (Optional)

For additional security headers, consider using [Helmet.js](https://helmetjs.github.io/):

```bash
npm install helmet
```

```typescript
import helmet from 'helmet';
app.use(helmet());
```

---

## References

- [MDN: HTTP Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)
- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [securityheaders.com](https://securityheaders.com/) - Test your headers
- [Content Security Policy Reference](https://content-security-policy.com/)

---

**Compliance:** NCA-3.5 Penetration Test Findings  
**Last Updated:** 2026-06-02
