# Course links in Canvas (LTI 1.3)

A school can add FirstPass to a Canvas course as an LTI 1.3 tool. A student or
instructor clicks **FirstPass** in the course menu, Canvas proves the launch came
from that course, and FirstPass opens in a new tab.

This is the **core launch only**: OIDC login and `LtiResourceLinkRequest`. There
are no grades (AGS), no rosters (NRPS) and no Deep Linking.

**Off by default.** Unless `LTI_ENABLED` is exactly `1`, every `/api/lti/*`
path answers 404.

Code: `src/lib/lti/lti.ts` (config, allowlist, Canvas JSON),
`src/lib/lti/lti.server.ts` (requests), `src/routes/api/lti/$.ts` (route),
tests in `src/lib/lti/lti.test.ts`.

## Endpoints

| Path | Method | What it does |
| --- | --- | --- |
| `/api/lti/login` | GET, POST | OIDC third-party login initiation. Checks `iss`, `client_id`, `login_hint` and that `target_link_uri` is on this site, sets a short-lived state cookie, redirects to the platform's auth endpoint (`response_type=id_token`, `response_mode=form_post`, `scope=openid`, `prompt=none`, `lti_message_hint` passed through). |
| `/api/lti/launch` | POST | Receives the `id_token`. Checks the state cookie, verifies the signature against the platform's JWKS (RS256), `iss`, `aud`, `azp`, `exp`, `iat` (at most 10 minutes old), the nonce (once only), message type `LtiResourceLinkRequest`, version `1.3.0`, a configured `deployment_id` and a resource link id. Then redirects (303) to an allowlisted FirstPass page. |
| `/api/lti/jwks` | GET | The tool's public key set. Empty (`{"keys": []}`) when no tool key is set. Core launch does not need a tool key; Canvas only asks for a JWK URL. |
| `/api/lti/config` | GET | The Canvas developer-key JSON, built from the site's own address. |

Login and launch are rate limited per client address (30 a minute, in server
memory).

## Environment variables

Set on the Vercel project, then redeploy.

| Name | Value |
| --- | --- |
| `LTI_ENABLED` | `1` to turn course links on. Anything else, or unset, keeps every endpoint at 404. |
| `LTI_PLATFORMS` | JSON array, one entry per Canvas developer key (see below). Required for login and launch. If it is missing or invalid, those two answer 500 with a plain message, and the log line says only how many problems were found. |
| `LTI_TOOL_PRIVATE_JWK` | Optional. An RSA private JWK. `/api/lti/jwks` publishes only its public half (`n`, `e`, `kid`, `alg`, `use`). Not used to sign anything yet. |
| `LTI_TOOL_PUBLIC_JWK` | Optional. An RSA public JWK, used in place of the one derived from the private key. |
| `LTI_TARGET_PATHS` | Optional. Comma-separated pages a launch may open, e.g. `/,/practice,/pairs`. Default: `/`, `/practice`, `/pairs`, `/for-programs`. `/` means the desk only; other entries also cover their sub-paths, so `/for-programs` covers `/for-programs/course-kit` once that page exists. Any unsafe entry (another site, `..`, `/api`) makes the server ignore the whole value and use the default. |

`LTI_PLATFORMS` example for Canvas cloud (check the current URLs in Canvas's
LTI docs before you use them; Canvas moved these to `sso.canvaslms.com`):

```json
[
  {
    "issuer": "https://canvas.instructure.com",
    "client_id": "10000000000123",
    "auth_endpoint": "https://sso.canvaslms.com/api/lti/authorize_redirect",
    "jwks_uri": "https://sso.canvaslms.com/api/lti/security/jwks",
    "deployment_ids": ["123:abc..."]
  }
]
```

Beta and test Canvas instances use `https://canvas.beta.instructure.com` /
`https://canvas.test.instructure.com` and `sso.beta.canvaslms.com` /
`sso.test.canvaslms.com`. Every URL must be https. A school can have several
deployments under one key; list each `deployment_id`.

## Registering the developer key in Canvas

A Canvas admin at the school does this (Kaleb sends them the config URL):

1. Set `LTI_ENABLED=1` and redeploy, so `https://<site>/api/lti/config` answers.
   `LTI_PLATFORMS` can wait until step 4.
2. In Canvas: **Admin → Developer Keys → + Developer Key → + LTI Key**.
   Method: **Enter URL** with `https://<site>/api/lti/config` (or **Paste JSON**
   with that page's contents). The key asks for no scopes and has privacy level
   **anonymous**.
3. Save, turn the key **On**, and copy its **Client ID** (the number under Details).
4. **Admin → Settings → Apps → + App**, configuration type **By Client ID**, paste
   it. After install, open the app's settings menu → **Deployment Id** and copy it.
5. Put the Client ID and Deployment Id into `LTI_PLATFORMS` and redeploy.
6. In a course, the **FirstPass** link appears in course navigation (enable it
   under course Settings → Navigation if hidden). It opens in a new tab.

**Opens in a new tab.** The placement sets `windowTarget: "_blank"`, so Canvas
launches FirstPass as a top-level page. That is why the site's CSP and
`frame-ancestors` do not change: FirstPass is never framed inside Canvas. If an
admin edits the key to open inline, the launch will be blocked by the CSP. Keep
"open in new tab".

**Choosing the page.** By default a launch opens the desk (`/`). To open another
allowlisted page, add a custom field on the placement or the app:
`firstpass_path=/practice`. A target that is not on the allowlist, or not on this
site, is refused (400) and nothing redirects off-site.

## What FirstPass receives and keeps

With privacy level anonymous, Canvas sends an opaque user id (`sub`), course and
link context, and roles. It should not send names or emails; if it does, they
are ignored.

- **Read:** issuer, audience, `azp`, expiry, issue time, nonce, message type,
  version, deployment id, resource link id (presence only), target link and the
  `firstpass_path` custom field.
- **Not read:** `sub`, names, emails, roles, course or context ids, LIS data.
- **Not stored:** nothing from a launch goes to a database or to disk. The only
  server state is an in-memory list of used nonces (to stop replay, cleared on
  restart, about 11 minutes) and the in-memory rate-limit counter.
- **Not logged:** log lines are `lti.login` / `lti.launch` with an outcome code and
  HTTP status only. No ids, hints, tokens, names or emails.
- **Cookies:** one cookie per login, `__Secure-fplti_<state>`, HttpOnly, Secure,
  SameSite=None, path `/api/lti`, 10 minutes, holding the nonce and the platform
  issuer and client id. The launch deletes it. It is strictly necessary for the
  launch check and is not used for tracking. Before turning LTI on, update
  `/cookies` (`COOKIES_DOC` in `src/lib/seo/legal.ts`), which today says FirstPass
  sets no cookies in normal use.
- **No session.** The launch does not sign anyone in and sets no session or
  analytics hint. FirstPass opens exactly as if the student had typed the address.

## Licensing

A launch **does not grant a license**. The desk behaves as it does for any
visitor: free features are free, and program keys (`FP-ORG-…`) still unlock paid
features. A school that bought a program license hands out its key as before.

A possible later step, **not built**: map a `deployment_id` to a program license
so a course launch unlocks the program's tier. That would need its own review
(how the tier is carried to the browser without a key, and what happens when the
license ends).

## Turning it off

Unset `LTI_ENABLED` (or set it to anything but `1`) and redeploy. Every
`/api/lti/*` path returns 404 again, and the Canvas link shows an error until the
school removes the app.
