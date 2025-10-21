// ✅ Initialize Firebase
const app = firebase.initializeApp({
  apiKey: "AIzaSyB64KBoank1xHvTkzz4hDPG4Iz8YdGx-Vc",
  authDomain: "princess-4x.firebaseapp.com",
  projectId: "princess-4x",
  storageBucket: "princess-4x.firebasestorage.app",
  messagingSenderId: "796593115129",
  appId: "1:796593115129:web:41ee6606da34b871553728",
  measurementId: "G-2Y3VGK1CN5"
});

// ✅ Make Firestore & Auth available globally
const db = firebase.firestore();
const auth = firebase.auth();
