# Firebase Hosting Migration Plan

Migrating ultraphonics.com from GitHub Pages to Firebase Hosting.

## Current Status

- [x] Firebase project created (`ultraphonics-web`)
- [x] Firebase Hosting configured
- [x] Firestore database set up
- [x] Firebase Auth (Google) configured
- [x] Deploy scripts in package.json
- [x] Connect custom domain in Firebase Console
- [x] Update DNS records at Hover
- [ ] Verify domain ownership (automatic after DNS)
- [ ] SSL certificate provisioned (automatic after verification)

---

## Step 1: Connect Custom Domain in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/project/ultraphonics-web/hosting/sites)
2. Click **Add custom domain**
3. Enter: `ultraphonics.com`
4. Firebase will provide verification TXT record and A records

**Firebase will provide:**
- A TXT record for verification
- Two A records (typically):
  - `151.101.1.195`
  - `151.101.65.195`

## Step 2: Update DNS at Hover

### Records to REMOVE (GitHub Pages):
| Type | Host | Value |
|------|------|-------|
| A | @ | 185.199.109.153 |
| A | @ | 185.199.111.153 |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.110.153 |
| CNAME | www | tdhckmn.github.io |

### Records to ADD (Firebase):
| Type | Host | Value |
|------|------|-------|
| TXT | @ | *(provided by Firebase for verification)* |
| A | @ | *(provided by Firebase - typically 151.101.1.195)* |
| A | @ | *(provided by Firebase - typically 151.101.65.195)* |
| CNAME | www | ultraphonics-web.web.app |

### Records to KEEP:
| Type | Host | Value | Purpose |
|------|------|-------|---------|
| MX | @ | 10 mx.hover.com.cust.hostedemail.com | Email |
| TXT | @ | google-site-verification=... | Google verification |
| TXT | @ | mailerlite-domain-verification=... | MailerLite |
| TXT | @ | v=spf1 a mx include:_spf.mlsend.com ?all | Email SPF |
| CNAME | litesrv._domainkey | litesrv._domainkey.mlsend.com | MailerLite DKIM |
| CNAME | mail | mail.hover.com.cust.hostedemail.com | Hover email |

## Step 3: Verify Domain

After DNS propagation (up to 48 hours, usually faster):
1. Firebase will automatically verify the domain
2. SSL certificate will be provisioned automatically
3. Site will be live at ultraphonics.com

## Step 4: Clean Up

- [ ] Disable GitHub Pages in repo settings (optional)
- [ ] Update any hardcoded references to tdhckmn.github.io

---

## Commands Reference

```bash
# Local development
npm run serve

# Preview deployment (creates temporary URL)
npm run preview

# Production deployment
npm run deploy

# Deploy Firestore rules only
npm run deploy:rules
```

---

## Rollback Plan

If issues occur, revert DNS at Hover:
1. Remove Firebase A records
2. Re-add GitHub Pages A records
3. Re-add CNAME www -> tdhckmn.github.io

---

## Notes

- DNS propagation can take 15 minutes to 48 hours
- Firebase provides free SSL certificates
- The `www` subdomain will redirect to the apex domain
