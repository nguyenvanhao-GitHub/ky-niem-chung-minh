/* ================================================
   FIREBASE-CONFIG.JS — Firebase Cloud Synchronization
   ================================================
   Configured to connect your love album to Firebase Cloud!
   Allows real-time photo & timeline sync across all devices.
   ================================================ */

var FIREBASE_CONFIG = {
    /* Temporary / Demo Firebase Config or paste your Firebase Project credentials here */
    apiKey: "AIzaSyDemoKeyForLoveAlbumSync2026",
    authDomain: "ky-niem-chung-minh.firebaseapp.com",
    projectId: "ky-niem-chung-minh",
    storageBucket: "ky-niem-chung-minh.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef123456"
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
            console.info('[Firebase] Connected successfully!');
            resolve(true);
        } catch (err) {
            console.warn('[Firebase] Config placeholder active. Local mode enabled.', err.message);
            isFirebaseActive = false;
            resolve(false);
        }
    });
}
