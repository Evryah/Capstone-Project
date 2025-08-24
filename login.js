
// Clear localStorage when the login page loads to avoid residual session data
if (window.location.pathname === '/login.html') {
    localStorage.clear();
}

// Function to display toast notifications
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show';

    // Hide the toast after 3 seconds
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

// Centralized logout function to clear all session data
function logout() {
    localStorage.clear(); // Clear all local storage data
    alert('You have been logged out.');
    window.location.href = '/login.html'; // Redirect to login page
}

// Show the modal for Pending accounts
function showStatusModal() {
    const modal = document.getElementById('statusModal');
    modal.style.display = 'block';
}

// Close the modal
function closeModal() {
    const modal = document.getElementById('statusModal');
    modal.style.display = 'none';
}

// Close modal on clicking outside
window.onclick = function (event) {
    const modal = document.getElementById('statusModal');
    if (event.target === modal) {
        closeModal();
    }
};

document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById('loginForm');
    const passwordInput = document.getElementById('Password');
    const togglePasswordButton = document.getElementById('togglePassword');

    // Function to toggle password visibility
    togglePasswordButton.addEventListener('click', function () {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            togglePasswordButton.classList.remove('fa-eye');
            togglePasswordButton.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            togglePasswordButton.classList.remove('fa-eye-slash');
            togglePasswordButton.classList.add('fa-eye');
        }
    });

   // Function to validate inputs and initiate login
function validateAndLogin() {
    const username = document.getElementById('username');
    const password = document.getElementById('Password');
    const loginType = document.querySelector('input[name="loginType"]:checked');
    const errorElement = document.getElementById('error');

    // Reset error display
    errorElement.style.display = 'none';
    errorElement.textContent = '';

    // Check if all fields are filled
    if (!username.value.trim() || !password.value.trim() || !loginType) {
        displayInlineError('All fields are required.');
        return;
    }

    // Validate phone number format if the input is numeric
    const phoneNumberPattern = /^\d{10,11}$/; // Accepts 10-11 digit phone numbers
    if (!isNaN(username.value.trim()) && !phoneNumberPattern.test(username.value.trim())) {
        displayInlineError('Phone number must be 10-11 digits.');
        return;
    }

    // Prepare login data
    const loginData = {
        UserName: username.value.trim(),
        password: password.value.trim(),
        registrationType: loginType.value,
    };

    // Determine API base URL dynamically (supports both localhost and Ngrok)
    const API_BASE_URL = window.location.origin.includes("ngrok")
        ? window.location.origin // Use Ngrok public URL
        : "http://localhost:3000"; // Default to localhost for local testing

    // Log the login attempt for debugging (can be removed in production)
    console.log('Login Attempt:', loginData);

    // Make API request to login
    fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
    })
        .then((response) => {
            if (!response.ok) {
                if (response.status === 403) {
                    // Show modal for Pending accounts
                    showStatusModal();
                    throw new Error('Your account is pending approval.');
                } else if (response.status === 401) {
                    throw new Error('Incorrect username, password, or account type.');
                } else {
                    throw new Error('Network response was not ok: ' + response.statusText);
                }
            }
            return response.json();
        })
        .then((data) => {
            if (data.token && data.userId) {
                // Store session data in localStorage
                localStorage.setItem('token', data.token);
                localStorage.setItem('userId', data.userId);
                localStorage.setItem('firstName', data.firstName);
                localStorage.setItem('userType', data.userType); // Save userType (Admin, Owner, or Renter)

                showToast('Login Successful!');

                // Redirect after a short delay
                setTimeout(() => {
                    const redirectUrl =
                        loginType.value === 'Owner'
                            ? '/Owner/My_Machine.html'
                            : '/Renter/machine_list.html';
                    window.location.href = redirectUrl;
                }, 3000);
            } else {
                displayInlineError('Invalid username or password.');
            }
        })
        .catch((error) => {
            console.error('Login Error:', error); // Log error details
            displayInlineError(error.message);
        });
}

// Function to display inline error messages with optional toast notification
function displayInlineError(message) {
    const errorElement = document.getElementById('error');
    errorElement.textContent = message;
    errorElement.style.display = 'block';

    // Optionally show toast for errors
    showToast(message);
}


    // Function to display inline error messages with optional toast notification
    function displayInlineError(message) {
        const errorElement = document.getElementById('error');
        errorElement.textContent = message;
        errorElement.style.display = 'block';

        // Optionally show toast for errors
        showToast(message);
    }

    // Event listener to handle form submission
    loginForm.addEventListener('submit', function (event) {
        event.preventDefault();
        validateAndLogin();
    });
});
