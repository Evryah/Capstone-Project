// Determine API base URL dynamically
const API_BASE_URL = window.location.origin.includes("ngrok")
    ? window.location.origin
    : "http://localhost:3000";

// Function to display toast notifications
function showToast(message, duration = 3000, callback = null) {
    const toast = document.getElementById('toast');
    if (!toast) {
        console.error('Toast element not found!');
        return;
    }

    toast.textContent = message;
    toast.className = 'toast show';

    // Remove the toast after the specified duration
    setTimeout(() => {
        toast.className = toast.className.replace('show', '');
        if (callback) {
            callback(); // Execute callback after toast disappears
        }
    }, duration);
}

// Toggle navigation menu for mobile view
const menuIcon = document.querySelector('.menu-icon');
const navLinks = document.querySelector('#nav-links');

menuIcon.addEventListener('click', () => {
    navLinks.classList.toggle('active');
});

document.addEventListener('DOMContentLoaded', function () {
    const userProfileLink = document.getElementById('user-profile-link');
    const userId = localStorage.getItem('userId'); // Ensure 'userId' is stored during login

    if (userProfileLink && userId) {
        userProfileLink.href = `ViewProfile.html?id=${encodeURIComponent(userId)}`;
    }
});

// Logout functionality with toast notification
document.querySelectorAll('#logout, #mobile-logout').forEach((button) => {
    button.addEventListener('click', function (event) {
        event.preventDefault();
        localStorage.clear(); // Clear all local storage data

        // Show the toast notification and redirect after it disappears
        showToast('Goodbye! Come back anytime.', 3000, () => {
            window.location.href = '/login.html'; // Redirect to login page
        });
    });
});


// Display a simple notification count and user name
const userNameElement = document.getElementById('user-name');
const notificationCountElement = document.querySelector('.notification-count');

const firstName = localStorage.getItem('firstName'); 
if (firstName) {
    $('#user-name').text(firstName);
} else {
    // If no user is logged in, redirect to the login page
    window.location.href = '/login.html';
}

// Load user profile data on page load
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('userType'); // Retrieve userType from localStorage
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    try {
           const response = await fetch(`${API_BASE_URL}/userDetails`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user details');
        }

        const data = await response.json();
        console.log('Fetched User Data:', data); // Debugging: Log fetched data

        // Helper function to set element value if it exists
        function setElementValue(id, value) {
            const element = document.getElementById(id);
            if (element) {
                element.value = value || '';
            } else {
                console.warn(`Element with ID "${id}" not found.`);
            }
        }

        // Populate fields with user data
        setElementValue('firstName', data.firstName);
        setElementValue('lastName', data.lastName);
        setElementValue('phoneNumber', data.phoneNumber);
        setElementValue('barangay', data.barangay);
        setElementValue('address', data.address);
        setElementValue('username', data.userName);

        // Set selected option for ID Type dropdown if it exists
        const idTypeDropdown = document.getElementById('idType');
        if (idTypeDropdown && data.idType) {
            idTypeDropdown.value = data.idType;
            console.log('Set ID Type to:', idTypeDropdown.value);
            if (idTypeDropdown.value !== data.idType) {
                console.warn('ID Type value does not match any dropdown options');
            }
        }

    // Display ID Document Image and name if available
const idDocumentImage = document.getElementById('idDocumentImage');
const idDocumentName = document.getElementById('idDocumentName'); // Element to show file name

if (idDocumentImage && data.idDocument) {
    // Set the image source
    idDocumentImage.src = `${API_BASE_URL}${data.idDocument}`;
    idDocumentImage.style.display = 'block';

    // Extract and display the file name from the URL
    const fileName = data.idDocument.split('/').pop(); // Get the last part of the URL as the file name
    if (idDocumentName) {
        idDocumentName.textContent = fileName; // Display the file name
    } else {
        console.warn('ID document name element not found.');
    }
} else if (!idDocumentImage) {
    console.warn('ID document image element not found.');
}

    } catch (error) {
        console.error('Error:', error);
        alert('Failed to load user data. Please try again.');
    }
});

// Function to display custom toast notification
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000); // Hide after 3 seconds
}

// Update Profile button functionality
document.querySelector('.update-button').addEventListener('click', async () => {
    // Retrieve input values
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    const barangay = document.getElementById('barangay').value.trim();
    const address = document.getElementById('address').value.trim();
    const newPassword = document.getElementById('password').value.trim(); // New password input
    const confirmPassword = document.getElementById('confirmPassword').value.trim();

    // Validate required fields
    if (!phoneNumber || !barangay || !address) {
        alert('Please fill in all required fields.');
        return;
    }

    // Validate password if a new one is provided
    if (newPassword) {
        if (newPassword !== confirmPassword) {
            alert('Passwords do not match.');
            return;
        }
    }

    // Retrieve token and user information from localStorage
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId'); // Ensure userId is stored during login/session initialization
    let userType = localStorage.getItem('userType');

    // Hardcode userType to renter if missing or invalid
    if (!userType || userType !== 'owner') {
        console.warn('Invalid or missing userType. Defaulting to "owner".');
        userType = 'owner';
        localStorage.setItem('userType', userType); // Store the correct userType
    }

    if (!token) {
        alert('You are not logged in. Please log in again.');
        window.location.href = '/login.html';
        return;
    }

    // Prepare the payload for the API request
    const updatedData = {
        userId,
        phoneNumber,
        barangay,
        address,
        userType, 
        newPassword: newPassword || null, // Send newPassword if provided
    };

    try {
        // Make the API call to update the profile
        const response = await fetch(`${API_BASE_URL}/updateProfile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`, // Pass token in the Authorization header
            },
            body: JSON.stringify(updatedData),
        });

        if (!response.ok) {
            const errorResponse = await response.json();
            throw new Error(errorResponse.message || 'Failed to update profile');
        }

        // Display success notification
        Toastify({
            text: "Profile updated successfully!",
            duration: 3000,
            close: true,
            gravity: "top",
            position: "center",
            backgroundColor: "#4CAF50",
            className: "toast-success",
        }).showToast();

        window.location.reload();
    } catch (error) {
        console.error('Error updating profile:', error);
        alert(error.message || 'Failed to update profile. Please try again.');
    }
});

document.addEventListener('DOMContentLoaded', function () {
    const passwordField = document.getElementById('password');
    const confirmPasswordField = document.getElementById('confirmPassword');
    const confirmPasswordContainer = document.getElementById('confirm-password-container');
    const passwordError = document.getElementById('password-error');
    const togglePasswordIcons = document.querySelectorAll('.toggle-password');

    // Show Confirm Password field if New Password has input
    passwordField.addEventListener('input', () => {
        if (passwordField.value.length > 0) {
            confirmPasswordContainer.style.display = 'block';
        } else {
            confirmPasswordContainer.style.display = 'none';
            passwordError.style.display = 'none';
            confirmPasswordField.value = ''; // Clear confirm password field when hiding it
        }
    });

    // Password match validation
    confirmPasswordField.addEventListener('input', () => {
        if (passwordField.value !== confirmPasswordField.value) {
            passwordError.style.display = 'block';
        } else {
            passwordError.style.display = 'none';
        }
    });

    // Toggle visibility for both password fields
    togglePasswordIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            const isPasswordVisible = passwordField.type === 'password';
            const newType = isPasswordVisible ? 'text' : 'password';

            passwordField.type = newType;
            confirmPasswordField.type = newType;
            togglePasswordIcons.forEach(i => {
                i.classList.toggle('fa-eye-slash', isPasswordVisible);
                i.classList.toggle('fa-eye', !isPasswordVisible);
            });
        });
    });
});
