// js/auth.js
import { auth } from './firebaseConfig.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js";

// Login function
export function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
}

// Signup function
export function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
}
