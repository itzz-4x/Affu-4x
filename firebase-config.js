<!-- Ye teen CDN links apne index.html ke <head> me daal de -->
<script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-auth.js"></script>
<script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js"></script>

<!-- Ab ye script file (firebase-config.js) include kar -->
<script>
  // ✅ Tera Firebase config
  const firebaseConfig = {
    apiKey: "AIzaSyB64KBoank1xHvTkzz4hDPG4Iz8YdGx-Vc",
    authDomain: "princess-4x.firebaseapp.com",
    projectId: "princess-4x",
    storageBucket: "princess-4x.firebasestorage.app",
    messagingSenderId: "796593115129",
    appId: "1:796593115129:web:41ee6606da34b871553728",
    measurementId: "G-2Y3VGK1CN5"
  };

  // ✅ Initialize Firebase
  firebase.initializeApp(firebaseConfig);

  // ✅ Initialize Firestore and Auth
  const db = firebase.firestore();
  const auth = firebase.auth();

  console.log("✅ Firebase Connected Successfully");
</script>
