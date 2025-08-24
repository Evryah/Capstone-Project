// Determine API base URL dynamically
const API_BASE_URL = window.location.origin.includes("ngrok")
    ? window.location.origin
    : "http://localhost:3000";

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = "toast show";
    setTimeout(function () {
        toast.className = toast.className.replace("show", "");
    }, 3000); // Hide after 3 seconds
}
document.addEventListener("DOMContentLoaded", function () {
    const urlParams = new URLSearchParams(window.location.search);
    const bookingId = urlParams.get('bookingId');
    const cancelButton = document.getElementById('cancel-button');
    const modal = document.getElementById('cancelModal');
    const closeModalBtn = document.getElementById('closeModal');
    const confirmCancelBtn = document.getElementById('confirmCancel');
    const statusElement = document.getElementById('status'); // Corrected ID for status
    const sendRequestButton = document.getElementById('confirm-button');  // The Send Request button
    const reviewButton = document.getElementById('review-button');  // The Review button

    // Function to format date in the "Month Day, Year" format
    function formatDate(dateString) {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

   
 // Fetch and display booking details if bookingId is present (View Mode)
 function fetchBookingDetailsById(bookingId) {
    const token = localStorage.getItem('token'); // Properly retrieve the token here

    if (!token) {
        // If no token, redirect to login or alert the user
        alert('Your session has expired. Please log in again.');
        window.location.href = '/login.html'; // Redirect to login page
        return;
    }

    fetch(`${API_BASE_URL}/bookingDetails/${bookingId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,  // Token required
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Booking not found. Please check the booking ID.');
            }
            return response.text().then(errorMessage => {
                throw new Error(`Error fetching booking details: ${errorMessage}`);
            });
        }
        return response.json();
    })
    .then(bookingData => {
            // Combine firstName and lastName to form the owner's full name
            const ownerFullName = `${bookingData.ownerFirstName} ${bookingData.ownerLastName}`;
            
            // Display booking details
            document.getElementById('created-date').textContent = formatDate(bookingData.createdAt);
            document.getElementById('start-date').textContent = formatDate(bookingData.startDate);
            document.getElementById('end-date').textContent = formatDate(bookingData.endDate);
            document.getElementById('machine-title').textContent = bookingData.equipmentName;
            
            // Combine and display owner's full name, phone, and address
            document.getElementById('owner-name').textContent = ownerFullName;
            document.getElementById('owner-phone').textContent = bookingData.ownerPhone;
            document.getElementById('owner-address').textContent = bookingData.ownerAddress;
            
            document.getElementById('machine-category').textContent = bookingData.category;
            document.getElementById('booking-id').textContent = `#${bookingData.bookingId}`;
            
         // Calculate and display the number of days
         const start = new Date(bookingData.startDate);
         const end = new Date(bookingData.endDate);
         const numDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
         document.getElementById('num-days').textContent = numDays;


         // Determine current date and compare with booking dates
         const today = new Date();
         if (today > end) {
             // If today is after the end date, set status to "Completed"
             bookingData.status = 'Completed';
         } else if (today >= start && today <= end && bookingData.status === 'Accepted') {
             // If within the start and end date, set status to "Ongoing"
             bookingData.status = 'Ongoing';
         }

         // Update the booking status element safely
         if (statusElement && bookingData.status) {
             statusElement.textContent = bookingData.status;
             statusElement.classList.remove('pending', 'accepted', 'rejected', 'completed', 'ongoing');
             
             const validStatusClass = bookingData.status.toLowerCase() || 'pending';  // Default to 'pending' if status is empty
             statusElement.classList.add(validStatusClass);
         }

         const startDate = new Date(bookingData.startDate);
 
     // Set a grace period of 48 hours (2 days) before the start date
const gracePeriodHours = 48;
const graceDate = new Date(startDate);
graceDate.setHours(graceDate.getHours() - gracePeriodHours);

// Update button visibility based on booking status and dates
if (bookingData.status === "Accepted" && today < graceDate) {
    // Show only the Cancel button if within the grace period before start date
    cancelButton.style.display = 'block';
    sendRequestButton.style.display = 'none';
} else if (bookingData.status === "Pending" && today < startDate) {
    // Show both Cancel and Send Request buttons if status is Pending and start date not reached
    cancelButton.style.display = 'block';
    sendRequestButton.style.display = 'none';
} else {
    // Hide both buttons if start date has been reached or grace period has passed
    cancelButton.style.display = 'none';
    sendRequestButton.style.display = 'none';
}

// Display the appropriate review button based on review existence and booking status
if (bookingData.status === "Completed") {
    if (bookingData.reviewExists) {
        // Show View Review button if a review exists
        reviewButton.textContent = "View Review";
        reviewButton.style.display = 'block';
        reviewButton.addEventListener('click', function () {
            window.location.href = `ReviewPage.html?bookingId=${bookingId}&view=1`;
        });
    } else {
        // Show Leave a Review button if no review exists
        reviewButton.textContent = "Leave a Review";
        reviewButton.style.display = 'block';
        reviewButton.addEventListener('click', function () {
            window.location.href = `ReviewPage.html?bookingId=${bookingId}`;
        });
    }
} else {
    reviewButton.style.display = 'none';
}

     })
     .catch(error => {
         console.error(error.message);
         alert(`Failed to fetch booking details: ${error.message}`);
     });
 }

 // Main logic based on mode
 if (bookingId) {
     // View Mode: Fetch details based on bookingId
     fetchBookingDetailsById(bookingId);
 }



   // Fetch and manage booking data from sessionStorage (Booking Mode)
function fetchBookingDetailsFromSession() {
    const bookingData = JSON.parse(sessionStorage.getItem('bookingData'));
    if (bookingData) {
        document.getElementById('created-date').textContent = formatDate(bookingData.createdAt);
        document.getElementById('start-date').textContent = formatDate(bookingData.startDate);
        document.getElementById('end-date').textContent = formatDate(bookingData.endDate);
        document.getElementById('machine-title').textContent = bookingData.machineTitle || "Unknown";

      // Safely combine `barangay` with `address` and handle empty/undefined cases
      const ownerFullAddress = `${bookingData.ownerBarangay ? bookingData.ownerBarangay + ', ' : ''}${bookingData.ownerAddress ? bookingData.ownerAddress : ''}`.trim();

        document.getElementById('owner-name').textContent = bookingData.ownerName || "Unknown";
        document.getElementById('owner-phone').textContent = bookingData.ownerPhone || "Unknown";
        document.getElementById('owner-address').textContent = ownerFullAddress || "Address not available";

        document.getElementById('machine-category').textContent = bookingData.machineCategory || "Unknown";
        document.getElementById('booking-id').textContent = `#${bookingData.bookingId || 'N/A'}`;

        // Calculate and display the number of days
        const start = new Date(bookingData.startDate);
        const end = new Date(bookingData.endDate);
        const numDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        document.getElementById('num-days').textContent = numDays > 0 ? numDays : "N/A";

        // Hide the status element in Booking Mode
        if (statusElement) {
            statusElement.style.display = 'none';
        }
    }
}

    // Main logic based on mode
    if (bookingId) {
        // View Mode: Fetch details based on bookingId
        fetchBookingDetailsById(bookingId);
    } else {
        // Booking Mode: Load details from session storage
        fetchBookingDetailsFromSession();
    }

    // Function to validate booking data before sending the request
    function validateBookingData(bookingData) {
        if (!bookingData.machineId) {
            alert('Machine ID is missing.');
            return false;
        }
        if (!bookingData.startDate || !bookingData.endDate) {
            alert('Start and End dates are required.');
            return false;
        }

        const start = new Date(bookingData.startDate);
        const end = new Date(bookingData.endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            alert('Invalid date format.');
            return false;
        }
        if (start >= end) {
            alert('Start date must be before the end date.');
            return false;
        }

        return true;
    }


// Send booking request to the backend
function sendBookingRequest(bookingData) {
    const token = localStorage.getItem('token');

    if (!token) {
        console.error('No token found, user is not logged in');
        return;
    }

    // Convert dates to YYYY-MM-DD format for the backend
    const formattedStartDate = new Date(bookingData.startDate).toLocaleDateString('en-CA');
    const formattedEndDate = new Date(bookingData.endDate).toLocaleDateString('en-CA');

    fetch(`${API_BASE_URL}/createBooking`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            userId: parseInt(bookingData.userId),
            machineId: parseInt(bookingData.machineId),
            startDate: formattedStartDate,
            endDate: formattedEndDate,
            status: 'Pending',
            category: bookingData.machineCategory
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to create booking');
        }
        return response.json();
    })
    .then(data => {
        showToast('Reservation successfully made');  // Show toast notification

        // Delay the redirection to allow the toast to show
        setTimeout(() => {
            sessionStorage.removeItem('bookingData');
            window.location.href = 'machine_list.html';  // Redirect after 3 seconds
        }, 3000);  // Delay the redirect for 3 seconds
    })
    .catch(error => {
        console.error('Error creating booking:', error);
        alert('Error creating booking, please try again.');
    });
}


    // Confirm button action (only relevant in Booking Mode)
    const confirmButton = document.getElementById('confirm-button');
    confirmButton.addEventListener('click', function () {
        const bookingData = JSON.parse(sessionStorage.getItem('bookingData'));
        if (bookingData) {
            sendBookingRequest(bookingData);
        } else {
            alert('No booking data found.');
        }
    });

  // Open the modal when the Cancel button is clicked
  cancelButton.addEventListener('click', function () {
    modal.style.display = 'block';
});

// Close the modal when the close button (x) is clicked
closeModalBtn.onclick = function () {
    modal.style.display = 'none';
};

// Close the modal when the user clicks outside of the modal content
window.onclick = function (event) {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};

// Close the modal when the No button is clicked
document.getElementById('closeModalBtn').onclick = function () {
    modal.style.display = 'none';
};

confirmCancelBtn.onclick = function () {
    fetch(`${API_BASE_URL}/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(errorMessage => {
                throw new Error(`Failed to cancel booking: ${errorMessage}`);
            });
        }
        showToast('Reservation successfully canceled');  // Show toast notification

        // Delay the redirection to allow the toast to show
        setTimeout(() => {
            window.location.href = 'Renter_Reservation.html';  // Redirect after 3 seconds
        }, 2000);  // Delay the redirect for 3 seconds
    })
    .catch(error => {
        console.error('Error canceling booking:', error);
        alert(`Error canceling booking: ${error.message}`);
    });
    
    modal.style.display = 'none'; // Close the modal after confirming
};
 // Toggle mobile menu
 document.querySelector('.menu-icon').addEventListener('click', function () {
    document.getElementById('nav-links').classList.toggle('active');
});
   // Logout with Toast Notification
document.getElementById('logout').addEventListener('click', function (event) {
    event.preventDefault();
    localStorage.clear(); // Clear local storage
    showToast('Goodbye! Come back anytime.', 3000); // Display toast notification

    // Redirect after showing toast
    setTimeout(() => {
        window.location.href = '/login.html'; // Redirect to login page
    }, 3000); // Match toast display duration
});

document.getElementById('mobile-logout').addEventListener('click', function (event) {
    event.preventDefault();
    localStorage.clear();
    showToast('Goodbye! Come back anytime.', 3000);

    setTimeout(() => {
        window.location.href = '/login.html';
    }, 3000);
});

document.addEventListener('DOMContentLoaded', function () {
    const menuIcon = document.querySelector('.menu-icon');
    const navLinks = document.getElementById('nav-links');

    menuIcon.addEventListener('click', function () {
        navLinks.classList.toggle('active');
    });
});

    document.addEventListener('DOMContentLoaded', function () {
        const userProfileLink = document.getElementById('user-profile-link');
        const userId = localStorage.getItem('userId'); // Ensure 'userId' is stored during login
    
        if (userProfileLink && userId) {
            userProfileLink.href = `ViewProfile.html?id=${encodeURIComponent(userId)}`;
        }
    });

    
    
  // Fetch user details
function fetchUserDetails() {
    const token = localStorage.getItem('token');

    if (!token) {
        console.error('No token found, user is not logged in');
        return;
    }

    fetch(`${API_BASE_URL}/userDetails`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        // Display the user's details including the barangay
        document.getElementById('user-name').textContent = data.firstName;
        document.getElementById('renter-name').textContent = `${data.firstName} ${data.lastName}`;
        document.getElementById('renter-phone').textContent = data.phoneNumber;

        // Combine barangay and address for the renter's full address
        const renterFullAddress = `${data.barangay ? data.barangay + ', ' : ''}${data.address || ''}`.trim();
        document.getElementById('renter-address').textContent = renterFullAddress || 'Address not available';
    })
    .catch(error => console.error('Error fetching user details:', error));
}

// Fetch user details on page load
fetchUserDetails();
});
