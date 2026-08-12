/* ================================================
   FIREBASE-CONFIG.JS — Firebase Cloud Synchronization
   ================================================
   Connected to project: ky-niem-chung-minh
   Allows real-time photo & timeline sync across all devices!
   ================================================ */

var FIREBASE_CONFIG = {
    apiKey: "AIzaSyCbe4a-F7Lz_vAJmERrJxSPyIEXq4CUjkE",
    authDomain: "ky-niem-chung-minh.firebaseapp.com",
    projectId: "ky-niem-chung-minh",
    storageBucket: "ky-niem-chung-minh.firebasestorage.app",
    messagingSenderId: "1082453541897",
    appId: "1:1082453541897:web:b024907c8a6b7f253e64d8",
    measurementId: "G-3BDKZ4N5VG"
};

var firebaseApp = null;
var dbFirestore = null;
var storageRef = null;
var isFirebaseActive = false;

function initFirebaseCloud() {
    return new Promise(function (resolve) {
        if (typeof firebase === 'undefined') {
            console.warn('[Firebase] SDK not loaded. Using local storage mode.');
            resolve(false);
            return;
        }

        try {
            if (!firebase.apps.length) {
                firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
            } else {
                firebaseApp = firebase.app();
            }

            dbFirestore = firebase.firestore();
            storageRef  = firebase.storage().ref();
            isFirebaseActive = true;
            console.info('[Firebase] Connected successfully to ky-niem-chung-minh!');
            resolve(true);
        } catch (err) {
            console.warn('[Firebase] Initialization error:', err.message);
            isFirebaseActive = false;
            resolve(false);
        }
    });
}
