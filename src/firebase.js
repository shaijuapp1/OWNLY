// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCDnpz4rkwsmexriprlzz6KZlCeVgthbQg",
  authDomain: "ownly-9c73d.firebaseapp.com",
  projectId: "ownly-9c73d",
  storageBucket: "ownly-9c73d.appspot.com",
  messagingSenderId: "710755739714",
  appId: "1:710755739714:web:c820a44689376cfd23e5db",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();
export const db = getFirestore(app);