// js/firebaseConfig.js

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCEXR6fYVPpHi7b2FgkFo9TbrVYSJcjBTs",
  authDomain: "loginforskillpeak.firebaseapp.com",
  databaseURL: "https://loginforskillpeak-default-rtdb.firebaseio.com",
  projectId: "loginforskillpeak",
  storageBucket: "loginforskillpeak.appspot.com",
  messagingSenderId: "1088259619145",
  appId: "1:1088259619145:web:615ed781e5d66482594298"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Auth and Database
const auth = firebase.auth();
const database = firebase.database();
