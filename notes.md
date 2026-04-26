rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read/write their own user document by email
    match /users/{userEmail} {
      allow read, write: if request.auth != null && request.auth.token.email == userEmail;
    }
    // Allow authenticated users to read banks and users collections
    match /banks/{bankId} {
      allow read: if request.auth != null;
    }
    match /users/{userDoc=**} {
      allow read: if request.auth != null;
    }
    // Allow authenticated users to read and write settings
    match /settings/{doc=**} {
      allow read, write: if request.auth != null;
    }
  }
}

