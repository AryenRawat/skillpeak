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
// Initialize variables
const auth = firebase.auth();
const database = firebase.database();

// Set up our register function
function register() {
  // Get all our input fields
  const username = document.getElementById('username').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  // Validate input fields
  if (!validateEmail(email)) {
    alert('Invalid email format. Please enter a valid email address.');
    return;
  }
  if (!validatePassword(password)) {
    alert('Password must be at least 6 characters long.');
    return;
  }
  if (!validateField(username)) {
    alert('Username cannot be empty.');
    return;
  }
  if (!validateUsername(username)) {
    alert('Username must be between 3 and 15 characters long and contain no special characters.');
    return;
  }

  // Move on with Auth
  auth.createUserWithEmailAndPassword(email, password)
    .then(function () {
      // Declare user variable
      const user = auth.currentUser;

      // Add this user to Firebase Database
      const databaseRef = database.ref();

      // Create User data
      const userData = {
        username: username,
        email: email,
        last_login: Date.now()
      };

      // Push to Firebase Database
      databaseRef.child('users/' + user.uid).set(userData)
        .then(() => {
          alert('User registered successfully!');
        })
        .catch(error => {
          alert('Error saving user data: ' + error.message);
        });
    })
    .catch(function (error) {
      // Firebase will use this to alert of its errors
      const errorCode = error.code;
      let errorMessage;
      switch (errorCode) {
        case 'auth/email-already-in-use':
          errorMessage = 'The email address is already in use by another account.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'The email address is badly formatted.';
          break;
        case 'auth/weak-password':
          errorMessage = 'The password is too weak. It should be at least 6 characters long.';
          break;
        default:
          errorMessage = 'An error occurred: ' + error.message;
      }
      alert(errorMessage);
    });
}

// Set up our login function
// Set up our login function
// Set up our login function
function login() {
  // Get all our input fields
  const username = document.getElementById('username').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  // Validate input fields
  if (!validateEmail(email) || !validatePassword(password) || !validateField(username) || !validateUsername(username)) {
    alert('Invalid credentials. Please check your input.');
    return;
  }

  // Authenticate the user
  auth.signInWithEmailAndPassword(email, password)
    .then(function() {
      // Update the user's last login timestamp
      const databaseRef = database.ref();
      const userData = {
        last_login: Date.now()
      };

      databaseRef.child('users/' + auth.currentUser.uid).update(userData)
        .then(() => {
          alert('Logged in successfully!');
          fetchUserNameAndRedirect(); // Fetch username and redirect
        })
        .catch(error => {
          alert('Error updating user data: ' + error.message);
        });
    })
    .catch(function() {
      alert('Invalid credentials. Please check your input.');
    });
}


// Validate Functions
function validateEmail(email) {
  const expression = /^[^@]+@\w+(\.\w+)+\w$/;
  return expression.test(email);
}

function validatePassword(password) {
  return password.length >= 6;
}

function validateField(field) {
  return field && field.length > 0;
}

function validateUsername(username) {
  // Username must be between 3 and 15 characters and contain only letters, numbers, or underscores
  const expression = /^[a-zA-Z0-9_]{3,15}$/;
  return expression.test(username);
}

function fetchUserNameAndRedirect() {
  const user = auth.currentUser;
  if (user) {
    const databaseRef = database.ref('users/' + user.uid);
    databaseRef.once('value')
      .then((snapshot) => {
        const userData = snapshot.val();
        const username = userData.username;

        // Store the username in local storage
        localStorage.setItem('username', username);

        // Redirect to the main page (home.html)
        window.location.href = 'home.html';
      })
      .catch((error) => {
        alert('Error fetching user data: ' + error.message);
      });
  }
}
