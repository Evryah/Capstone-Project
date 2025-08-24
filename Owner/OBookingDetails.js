
// Determine API base URL dynamically
const API_BASE_URL = window.location.origin.includes("ngrok")
    ? window.location.origin
    : "http://localhost:3000";


function getIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

const userProfileLink = document.getElementById('user-profile-link');
const userId = localStorage.getItem('userId');
if (userProfileLink && userId) {
userProfileLink.href = `OwnerViewProfile.html?id=${encodeURIComponent(userId)}`;
console.log('Profile link updated:', userProfileLink.href);
}

document.addEventListener("DOMContentLoaded", function () {
    const urlParams = new URLSearchParams(window.location.search);
    const bookingId = urlParams.get('bookingId');
    const statusElement = document.querySelector('.status');
    const rejectButton = document.getElementById('reject-button');
    const acceptButton = document.getElementById('accept-button');

    // Get modal elements
    const acceptModal = document.getElementById("acceptModal");
    const rejectModal = document.getElementById("rejectModal");
    const closeAcceptBtn = document.getElementById('closeAccept'); // No button in Accept modal
    const closeRejectBtn = document.getElementById('closeReject'); // No button in Reject modal
    const confirmAcceptBtn = document.getElementById("confirmAccept");
    const confirmRejectBtn = document.getElementById("confirmReject");
    const menuIcon = document.querySelector('.menu-icon');
    const navLinks = document.getElementById('nav-links');
    
    // Toggle the 'active' class on the nav-links when menu icon is clicked
    menuIcon.addEventListener('click', function() {
        navLinks.classList.toggle('active');
    });

    
    // Logout functionality
    const logoutButton = document.getElementById('logout');
    if (logoutButton) {
        logoutButton.addEventListener('click', function (event) {
            event.preventDefault();
            localStorage.removeItem('token');
            window.location.href = '/login.html';
        });
    }

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
    function fetchBookingDetailsById(bookingId) {
        fetch(`${API_BASE_URL}/bookingDetails/${bookingId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Error fetching booking details');
            }
            return response.json();
        })
        .then(bookingData => {
            // Display booking details
            document.getElementById('created-date').textContent = formatDate(bookingData.createdAt);
            document.getElementById('start-date').textContent = formatDate(bookingData.startDate);
            document.getElementById('end-date').textContent = formatDate(bookingData.endDate);
            document.getElementById('machine-title').textContent = bookingData.equipmentName;
            document.getElementById('machine-category').textContent = bookingData.category;
            document.getElementById('booking-id').textContent = `#${bookingData.bookingId}`;
    
            // Display renter's information
            document.getElementById('renter-name').textContent = `${bookingData.renterFirstName} ${bookingData.renterLastName}`;
            document.getElementById('renter-phone').textContent = bookingData.renterPhone;
            const renterFullAddress = `${bookingData.renterBarangay ? bookingData.renterBarangay + ', ' : ''}${bookingData.renterAddress || ''}`.trim();
            document.getElementById('renter-address').textContent = renterFullAddress || 'Address not available';
    
            // Display owner's information
            document.getElementById('owner-name').textContent = `${bookingData.ownerFirstName} ${bookingData.ownerLastName}`;
            document.getElementById('owner-phone').textContent = bookingData.ownerPhone;
            document.getElementById('owner-address').textContent = bookingData.ownerAddress;
    
            // Calculate and display the number of days for the booking
            const start = new Date(bookingData.startDate);
            const end = new Date(bookingData.endDate);
            const numDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
            document.getElementById('num-days').textContent = numDays > 0 ? numDays : "N/A";
    
            // Update status dynamically based on conditions
            const today = new Date();
            if (bookingData.status === 'Cancelled') {
                // No additional changes needed if already Cancelled
            } else if (today > end) {
                bookingData.status = 'Completed';
            } else if (today >= start && today <= end && bookingData.status === 'Accepted') {
                bookingData.status = 'Ongoing';
            }
    
            // Update status element in the UI
            const statusElement = document.querySelector('.status');
            if (statusElement) {
                statusElement.textContent = bookingData.status;
                statusElement.className = `status ${bookingData.status.toLowerCase()}`; // Update class for styling
            }
    
            // Hide action buttons for certain statuses
            const rejectButton = document.getElementById('reject-button');
            const acceptButton = document.getElementById('accept-button');
            const actionButtons = document.getElementById('action-buttons');
    
            if (['Accepted', 'Ongoing', 'Completed', 'Cancelled'].includes(bookingData.status)) {
                if (rejectButton) rejectButton.style.display = 'none';
                if (acceptButton) acceptButton.style.display = 'none';
            }
    
            // Add "View Review" button if a review exists
            if (actionButtons && bookingData.reviewExists > 0) {
                const viewReviewButton = document.createElement('a');
                viewReviewButton.href = `Owner_Review.html?bookingId=${bookingData.bookingId}`;
                viewReviewButton.textContent = 'View Review';
                viewReviewButton.className = 'view-review-button'; // Add a class for styling
                actionButtons.appendChild(viewReviewButton);
            } else if (!actionButtons) {
                console.warn('Action container not found. "View Review" button not added.');
            }
        })
        .catch(error => {
            console.error('Failed to fetch booking details:', error);
            alert(`Failed to fetch booking details: ${error.message}`);
        });
    }
    
    
    // Fetch booking details
    if (bookingId) {
        fetchBookingDetailsById(bookingId);
    }

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
            document.getElementById('user-name').textContent = data.firstName;
            document.getElementById('renter-name').textContent = `${data.firstName} ${data.lastName}`;
            document.getElementById('renter-phone').textContent = data.phoneNumber;
            document.getElementById('renter-address').textContent = data.address;
        })
        .catch(error => console.error('Error fetching user details:', error));
    }

    // Fetch user details
    fetchUserDetails();

        // Close the accept modal when "No, Keep Pending" is clicked
        closeAcceptBtn.addEventListener('click', function () {
            acceptModal.style.display = 'none';
        });
    
        // Close the reject modal when "No, Keep Pending" is clicked
        closeRejectBtn.addEventListener('click', function () {
            rejectModal.style.display = 'none';
        });
    
        // Close modals when clicking outside of them
        window.onclick = function (event) {
            if (event.target === acceptModal) {
                acceptModal.style.display = "none";
            }
            if (event.target === rejectModal) {
                rejectModal.style.display = "none";
            }
        };
    // Open Accept Modal
    acceptButton.addEventListener('click', function () {
        acceptModal.style.display = "block";
    });

    // Open Reject Modal
    rejectButton.addEventListener('click', function () {
        rejectModal.style.display = "block";
    });

    // Close modals when clicking on the close button (x)
    closeAcceptBtn.onclick = function () {
        acceptModal.style.display = "none";
    };
    closeRejectBtn.onclick = function () {
        rejectModal.style.display = "none";
    };
    

    // Close modals when clicking outside the modal content
    window.onclick = function (event) {
        if (event.target === acceptModal) {
            acceptModal.style.display = "none";
        }
        if (event.target === rejectModal) {
            rejectModal.style.display = "none";
        }
    };
// Function to show toast notification
function showToast(message, callback) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = "toast show";

    // Show toast for 3 seconds, then execute the callback (for redirection)
    setTimeout(function () {
        toast.className = toast.className.replace("show", "");
        if (callback) {
            // Delay callback to ensure the toast is visible before redirecting
            setTimeout(callback, 1000);  // Wait an additional 1 second before redirect
        }
    }, 2000); // Show toast for 3 seconds
}

// Accept the booking with delayed redirect
confirmAcceptBtn.onclick = function () {
    console.log('Accept button clicked'); // Debugging: Log that the accept button was clicked

    fetch(`${API_BASE_URL}/bookings/${bookingId}/accept`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        console.log('Response:', response); // Debugging: Log the response

        if (!response.ok) {
            throw new Error(`Failed to accept booking`);
        }

        // Hide the modal immediately to avoid conflicts
        acceptModal.style.display = 'none';
        
        // Show the toast notification and delay redirect
        showToast('Booking successfully accepted!', () => {
            console.log('Toast shown, proceeding to redirect...'); // Debugging: Check if toast is shown

            statusElement.textContent = 'Accepted';
            statusElement.classList.remove('pending', 'rejected');
            statusElement.classList.add('accepted');
            rejectButton.style.display = 'none';
            acceptButton.style.display = 'none';

            // Redirect after toast disappears with an additional delay
            window.location.href = 'Owner_Reservation.html';
        });
    })
    .catch(error => {
        console.error('Error accepting booking:', error);
        alert(`Error accepting booking: ${error.message}`);
    });
};


// Reject the booking with delayed redirect
confirmRejectBtn.onclick = function () {
    fetch(`${API_BASE_URL}/bookings/${bookingId}/reject`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Failed to reject booking`);
        }

        // Show the toast notification and delay redirect
        showToast('Booking successfully rejected!', () => {
            rejectModal.style.display = 'none';
            statusElement.textContent = 'Rejected';
            statusElement.classList.remove('pending', 'accepted');
            statusElement.classList.add('rejected');
            rejectButton.style.display = 'none';
            acceptButton.style.display = 'none';

            // Redirect after toast disappears with an additional delay
            window.location.href = 'Owner_Reservation.html';
        });
    })
    .catch(error => {
        console.error('Error rejecting booking:', error);
        alert(`Error rejecting booking: ${error.message}`);
    });
};

});
