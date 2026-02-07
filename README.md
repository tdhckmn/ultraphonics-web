# Ultraphonics Website

Band website hosted on Firebase with Firestore database.

## Development

```bash
# Install dependencies
npm install

# Run local dev server
npm run serve
```

Opens at http://localhost:5000

## Deployment

```bash
# Build and deploy to production
npm run deploy

# Deploy Firestore rules only
npm run deploy:rules

# Preview deployment (temporary URL)
npm run preview
```

## Project Structure

- `/admin` - Admin pages (setlist manager, show manager, etc.)
- `/assets` - Images, fonts, static files
- `/content` - JSON data files
- `/dist` - Built JavaScript bundles
- `/src` - Source JavaScript (Firebase services)

## Firebase Services

- **Hosting** - Static site hosting
- **Firestore** - Database for shows, setlists, quotes
- **Auth** - Google sign-in for admin pages
