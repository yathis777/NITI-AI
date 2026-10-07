# NITI AI

## Run with Docker

Build the image from the repository root:

```sh
docker build -t niti-ai .
```

Start the web app on port 8080:

```sh
docker run --rm -p 8080:80 niti-ai
```

Open <http://localhost:8080>.

The container serves the Firebase Hosting site from `public/` with Nginx. Firebase Authentication and Firestore remain hosted services, so the app still requires network access to Firebase and a valid configuration in `public/firebase-config.js`.
