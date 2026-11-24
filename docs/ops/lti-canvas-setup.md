# Course links in Canvas (LTI 1.3)

A school can add FirstPass to a Canvas course as an LTI 1.3 tool. A student or
instructor clicks **FirstPass** in the course menu, Canvas proves the launch came
from that course, and FirstPass opens in a new tab.

This is OIDC login, `LtiResourceLinkRequest` and Deep Linking 2.0 (a content
picker faculty use to add FirstPass pages to modules and assignments; see
[Add FirstPass from the content picker](#add-firstpass-from-the-content-picker)).
There are no grades (AGS) and no rosters (NRPS).

**Off by default.** Unless `LTI_ENABLED` is exactly `1`, every `/api/lti/*`
path answers 404.

Code: `src/lib/lti/lti.ts` (config, allowlist, Canvas JSON),
`src/lib/lti/lti.server.ts` (requests), `src/lib/lti/picker.ts` (the content
picker's items and pages), `src/routes/api/lti/$.ts` (route), tests in
`src/lib/lti/lti.test.ts`.

## Endpoints

| Path | Method | What it does |
| --- | --- | --- |
| `/api/lti/login` | GET, POST | OIDC third-party login initiation. Checks `iss`, `client_id`, `login_hint` and that `target_link_uri` is on this site, sets a short-lived state cookie, redirects to the platform's auth endpoint (`response_type=id_token`, `response_mode=form_post`, `scope=openid`, `prompt=none`, `lti_message_hint` passed through). |
| `/api/lti/launch` | POST | Receives the `id_token`. Checks the state cookie, verifies the signature against the platform's JWKS (RS256), `iss`, `aud`, `azp`, `exp`, `iat` (at most 10 minutes old), the nonce (once only), message type `LtiResourceLinkRequest` or `LtiDeepLinkingRequest`, version `1.3.0`, a configured `deployment_id`. A resource link launch also needs a resource link id and then redirects (303) to an allowlisted FirstPass page. A deep linking launch shows the content picker instead. |
| `/api/lti/deep-link` | POST | The content picker's form. Checks the picker token, then either lists pair pages for a search, or answers with a page that posts the signed `LtiDeepLinkingResponse` back to Canvas. |
| `/api/lti/jwks` | GET | The tool's public key set. Empty (`{"keys": []}`) when no tool key is set. The course menu link does not need a tool key; the content picker does (it signs its answer). |
| `/api/lti/config` | GET | The Canvas developer-key JSON, built from the site's own address. |

Login, launch and the picker form are rate limited per client address (30 a
minute, in server memory).

## Environment variables

Set on the Vercel project, then redeploy.

| Name | Value |
| --- | --- |
| `LTI_ENABLED` | `1` to turn course links on. Anything else, or unset, keeps every endpoint at 404. |
| `LTI_PLATFORMS` | JSON array, one entry per Canvas developer key (see below). Required for login and launch. If it is missing or invalid, those two answer 500 with a plain message, and the log line says only how many problems were found. |
| `LTI_TOOL_PRIVATE_JWK` | Needed for the content picker, optional otherwise. An RSA private JWK. `/api/lti/jwks` publishes only its public half (`n`, `e`, `kid`, `alg`, `use`). The picker signs its token and its answer to Canvas with it (RS256, with that `kid` in the header). Without it the picker answers 500 and the course menu link still works. |
| `LTI_TOOL_PUBLIC_JWK` | Optional. An RSA public JWK, used in place of the one derived from the private key. If it is set, it must be the public half of `LTI_TOOL_PRIVATE_JWK`, or the picker refuses to run (500). |
| `LTI_TARGET_PATHS` | Optional. Comma-separated pages a launch may open, e.g. `/,/practice,/pairs`. Default: `/`, `/practice`, `/pairs`, `/for-programs`, `/class`, `/pair`. `/` means the desk only; other entries also cover their sub-paths, so `/for-programs` covers `/for-programs/course-kit` and `/class` covers each `/class/<slug>` page. Any unsafe entry (another site, `..`, `/api`) makes the server ignore the whole value and use the default. The content picker offers only pages on this list. |

`/class` and `/pair` joined the default list with the content picker, so it can
offer class pages and pair pages. They are public pages, like the rest of the
list. `/drug`, `/enzyme`, the API and everything else stay off it.

A launch keeps no query string or `#` part, with two exceptions the content
picker needs, each checked against a fixed list: on `/practice` the `enzyme`,
`grade` and `class` deck filters, and on `/for-programs/course-kit` a week
anchor such as `#cyp-basics`. Anything else is dropped.

`LTI_PLATFORMS` example for Canvas cloud (check the current URLs in Canvas's
LTI docs before you use them; Canvas moved these to `sso.canvaslms.com`):

```json
[
  {
    "issuer": "https://canvas.instructure.com",
    "client_id": "10000000000123",
    "auth_endpoint": "https://sso.canvaslms.com/api/lti/authorize_redirect",
    "jwks_uri": "https://sso.canvaslms.com/api/lti/security/jwks",
    "deployment_ids": ["123:abc..."],
    "deep_link_return_hosts": ["school.instructure.com"]
  }
]
```

Beta and test Canvas instances use `https://canvas.beta.instructure.com` /
`https://canvas.test.instructure.com` and `sso.beta.canvaslms.com` /
`sso.test.canvaslms.com`. Every URL must be https. A school can have several
deployments under one key; list each `deployment_id`.

`deep_link_return_hosts` is optional and only matters for the content picker.
It lists the hosts Canvas may ask the picker to send its answer back to (the
`deep_link_return_url`). Plain host names only, no `https://`, path or `*`. If
it is left out, only the issuer's own host is allowed, which fits a
self-hosted Canvas whose issuer is the school's own address. **Canvas cloud
needs it**: the issuer is `canvas.instructure.com`, but the return address is on
the school's host (for example `school.instructure.com`, or the school's custom
Canvas domain). Any other return address is refused (400).

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
`frame-ancestors` do not change for it: the course menu link is never framed
inside Canvas. If an admin edits the key to open inline, the launch will be
blocked by the CSP. Keep "open in new tab". (The content picker is different:
Canvas frames it. See "Add FirstPass from the content picker" below.)

**Choosing the page.** By default a launch opens the desk (`/`). To open another
allowlisted page, add a custom field on the placement or the app:
`firstpass_path=/practice`. A target that is not on the allowlist, or not on this
site, is refused (400) and nothing redirects off-site.

## Add FirstPass from the content picker

Faculty can add a FirstPass page to a module or an assignment without typing
any address. The developer key JSON turns on two places for this:

- **Modules → + → External Tool → FirstPass** (Canvas calls this
  `link_selection`). Several items can be added at once if Canvas allows it.
- **Assignments → + Assignment → Submission type: External Tool → Find →
  FirstPass** (`assignment_selection`). One item.

What faculty see:

1. Canvas opens the FirstPass picker in a window.
2. The picker lists **course kit weeks** (the whole kit or one week), **practice
   sets** (all cards, or one enzyme, or one drug class), **class pages**, and a
   **Find a pair page** box: type drug names (for example `warfarin
   fluconazole`) and choose **Find**.
3. They tick what they want and choose **Add to course**, or **Cancel**.
4. Canvas adds each choice as a FirstPass link. A student who opens it goes
   through the normal launch and lands on that page in a new tab. The link
   carries the page in the `firstpass_path` custom field.

Only pages on the launch allowlist (`LTI_TARGET_PATHS`, or the default list) are
offered, and the server checks each choice again when the form comes back. If a
school narrows the list, the picker shows less.

What the server checks:

- The picker launch is verified exactly like a course menu launch (state
  cookie, signature, `iss`, `aud`, `azp`, `exp`, nonce once only, deployment id,
  version), with message type `LtiDeepLinkingRequest`.
- Canvas must accept `ltiResourceLink` items (`accept_types`), and its return
  address must be https and on one of the platform's `deep_link_return_hosts`
  (or the issuer's host). Otherwise 400.
- The picker form carries a **picker token**: signed with the tool key, valid
  for 20 minutes, tied to that launch's platform, deployment, return address and
  Canvas's `data` value, and usable once for **Add** or **Cancel** (searching
  does not use it up). A changed, expired, foreign or reused token is refused
  (401). Like the nonce list, the "used once" list lives in server memory, so it
  holds per server instance.
- The answer is a page that posts a `JWT` form field to Canvas's return address
  at once (with a **Continue** button if scripts are off). That JWT is signed
  RS256 with the tool key (its `kid` in the header), `iss` = client id, `aud` =
  the issuer, a fresh nonce, valid 5 minutes, message type
  `LtiDeepLinkingResponse`, the deployment id, Canvas's `data` echoed back, and
  one `ltiResourceLink` item per choice (title, the launch URL, and
  `firstpass_path`). Items ask to open in a new tab when Canvas offers that.
  For a module item, also tick **Load in a new tab** in Canvas if it is shown:
  a FirstPass page (outside `/api/lti/`) opened inside a Canvas frame is
  blocked by the site CSP.

What you need before it works:

- `LTI_TOOL_PRIVATE_JWK` set (the picker answers 500 without it).
- `deep_link_return_hosts` in `LTI_PLATFORMS` for Canvas cloud.
- **The site-wide CSP does not apply under `/api/lti/`.** Canvas shows the
  picker inside a frame on the school's Canvas host, and the answer is a form
  post to that host, which the site CSP (`frame-ancestors 'self'` plus the grok
  hosts, `form-action 'self' https://checkout.stripe.com`) would block. So
  `vercel.json` gives `/api/lti/*` its own header rule with HSTS and
  Permissions-Policy only, and the LTI handler sends its own CSP on every
  answer: the picker and its return page allow framing and posting only by the
  one Canvas host that launched them, and plain-text and JSON answers send
  `default-src 'none'; base-uri 'none'; form-action 'none'`. Redirects carry
  none. `scripts/check-build-headers.mjs` fails the build if the built config
  puts a CSP on an `/api/lti/` path or leaves one off any other path.
- Safari blocks the login cookie inside a frame, so the picker launch can fail
  there with "This launch expired or was not started here". Chrome and Firefox
  keep it. Fixing that needs the LTI platform storage messages, not built.

The picker shows no name, email, course or role, and stores nothing. Its log
lines are `lti.deep_link` with an outcome code and status only.

## What FirstPass receives and keeps

With privacy level anonymous, Canvas sends an opaque user id (`sub`), course and
link context, and roles. It should not send names or emails; if it does, they
are ignored.

- **Read:** issuer, audience, `azp`, expiry, issue time, nonce, message type,
  version, deployment id, resource link id (presence only), target link and the
  `firstpass_path` custom field. For the content picker also, from
  `deep_linking_settings`: the return address, `accept_types`,
  `accept_multiple`, `accept_presentation_document_targets` and `data` (passed
  back unread).
- **Not read:** `sub`, names, emails, roles, course or context ids, LIS data,
  the picker settings' title and text.
- **Not stored:** nothing from a launch goes to a database or to disk. The only
  server state is an in-memory list of used nonces (to stop replay, cleared on
  restart, about 11 minutes), an in-memory list of used picker token ids (about
  21 minutes) and the in-memory rate-limit counter. The picker token itself
  travels in the picker form, not on the server.
- **Not logged:** log lines are `lti.login` / `lti.launch` / `lti.deep_link` with
  an outcome code and HTTP status only. No ids, hints, tokens, names or emails.
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
