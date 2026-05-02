# Community Proxy & Hub Design Patterns

This document captures the meta-patterns observed across community proxy and game hub sites. Use these patterns to find or build your own mirrors — **never share live URLs in public repos.**

## Domain Strategies

### Education Fronts
Use long academic subdomains that look like legitimate school resources. The longer the subdomain chain, the more convincing the disguise.

**Pattern:** `school.subject.learning.literature.domain.tld`

Examples of effective patterns:
- `school.agreca.com.ar` — School portal in Argentina
- `programming.writing.lecture.learning.literature.mybgarage.cl` — Longest known subdomain chain, extremely convincing
- `learningpolicy.lervs.ro` — Research institute front in Romania
- `startmyeducation.top` — Education platform front
- `byod.geeked.wtf` — BYOD (Bring Your Own Device) portal

### CDN Fronts
Host on well-known CDN platforms for resilience and speed. These domains are rarely blocked because CDNs serve legitimate content.

**Platforms:** Fastly, BunnyCDN, CloudFront, AWS S3, Cloudflare Workers

Examples:
- `*.global.ssl.fastly.net` — Fastly CDN distribution
- `*.b-cdn.net` — BunnyCDN distribution
- `s3.amazonaws.com/bucket/` — AWS S3 static hosting
- `*.pages.dev` — Cloudflare Pages
- `*.workers.dev` — Cloudflare Workers
- `*.netlify.app` — Netlify
- `*.vercel.app` — Vercel

### Geo TLDs
Country-code TLDs are less monitored by school filters than `.com` domains.

**Effective TLDs:** `.ar` (Argentina), `.ro` (Romania), `.np` (Nepal), `.lat` (Latin America), `.cl` (Chile), `.wtf` (novelty)

### Dev/REST Domains
Developer and API domains fly under the radar because they look like technical infrastructure.

**Examples:** `.dev`, `.rest`, `.oneapp.dev`, `.qzz.io`, `.rip`, `.lol`, `.best`

## Auth Patterns

### Password Gates
Some proxies use simple password strings as a lightweight access control. The password is typically a short memorable word.

**Implementation in STRATO:** Display an auth hint badge on the card and show a toast notification with the password when the user launches the site.

### No Auth (Direct Access)
Most community sites have no authentication — they rely on obscurity and domain rotation instead. This is the fastest UX.

### Alt Mirrors
Many sites maintain a primary URL and one or more backup URLs. The backup is used when the primary goes down or gets blocked.

**Implementation in STRATO:** The `alt_url` field in games.json and the `alternates` array in proxy-mirrors.json support automatic failover routing.

## Reliability Signals

### High Reliability (Green)
- Hosted on dedicated CDN (Fastly, BunnyCDN)
- Has a dedicated domain name
- Active maintainer with track record
- Has working alt mirrors

### Medium Reliability (Yellow)
- Hosted on free platforms (Weebly, Google Sites, personal domains)
- Intermittent uptime
- May lack alt mirrors
- New or unproven

### Low Reliability (Red)
- Free hosting with no guarantees
- Intermittent uptime, frequently down
- No alt mirror
- Google Sites hosted (high takedown risk)
- Known to be blocked in some regions

## UI Patterns for Hubs

### Tier Badges
- **Gold star** — Good proxy (high reliability, proven track record)
- **Purple star** — Community recommended (popular but may be intermittent)
- **LOCAL** — Standalone games that run without a proxy

### Reliability Dots
- Green dot with glow — High reliability
- Yellow dot with pulse — Medium reliability
- Red dot — Low reliability, may not always work

### Category Colors
- Proxies: Cyan accent
- Game Hubs: Purple accent
- Directories: Orange accent
- Standalone games: Default theme

### Tab Cloak Presets
Effective tab cloaks use real education-site domains with realistic page titles and favicons. The best cloaks mimic:
- Google Classroom
- Quizlet study sets
- Canvas LMS dashboard
- Clever portal
- IXL math practice
- School-specific portals (Agreca, Eclipse, etc.)

## Opsec Guidelines

1. **Never post live URLs in public repos** — Use environment variable placeholders
2. **Rotate domains regularly** — When a domain gets blocked, switch to a backup
3. **Use HTTPS everywhere** — Even for proxy sites, HTTPS prevents deep packet inspection
4. **Separate public and private config** — Public repo shows structure only, private files contain real URLs
5. **Don't link between sites** — Cross-linking helps filter vendors map the network
6. **Use about:blank cloaking** — Open proxied pages in about:blank iframes to hide the URL bar
