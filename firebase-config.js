const firebaseConfig = {
    apiKey: "AIzaSyDg3bgUlfIzxBPCjUM5PVTkaO-jaXmUhDI",
    authDomain: "niti-ai-2ba5d.firebaseapp.com",
    projectId: "niti-ai-2ba5d",
    storageBucket: "niti-ai-2ba5d.firebasestorage.app",
    messagingSenderId: "620811813898",
    appId: "1:620811813898:web:2defe24fefa8796e97cbf3"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
window.nitiAuth = firebase.auth();
