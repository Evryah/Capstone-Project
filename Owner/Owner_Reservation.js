
const API_BASE_URL = window.location.origin.includes("ngrok")
    ? window.location.origin
    : "http://localhost:3000";

// Toggle filters sidebar visibility when the filter button is clicked
const filterButton = document.querySelector('.filter-button');
const filtersSidebar = document.querySelector('.filters-sidebar');

filterButton.addEventListener('click', () => {
    filtersSidebar.classList.toggle('hidden');
});

function applyFilters() {
    // Apply selected equipment category filters and status filters together
    const selectedCategories = Array.from(document.querySelectorAll('.equipment-category:checked')).map(checkbox => checkbox.value);
    const selectedStatus = 'Rejected'; // Since we only want to display rejected items
    
    const rows = document.querySelectorAll(".booking-table tbody tr");
    let filterApplied = false; // Track if any filter is applied

    rows.forEach(row => {
        const equipmentCategory = row.querySelector(".equipment-category-data").textContent;
        const bookingStatus = row.querySelector(".status").textContent;

       // Check if the row matches both category and status
       if ((selectedCategories.includes(equipmentCategory) || selectedCategories.length === 0) && (!selectedStatus || bookingStatus === selectedStatus)) {
        row.style.display = "";  // Show matching rows
    } else {
        row.style.display = "none";  // Hide non-matching rows
        filterApplied = true;  // A filter has been applied
    }
});
 // Toggle the filter-active class based on filter status
 const filtersSidebar = document.querySelector('.filters-sidebar');
 if (filterApplied) {
     filtersSidebar.classList.add('filter-active');
 } else {
     filtersSidebar.classList.remove('filter-active');
 }
}

// Event listeners for status and category filters
document.querySelectorAll('.filter-category li').forEach(item => {
 item.addEventListener('click', (event) => {
     document.querySelectorAll('.filter-category li').forEach(status => status.classList.remove('active'));
     event.target.classList.add('active');
     applyFilters();
 });
});

document.querySelectorAll('.equipment-category').forEach(checkbox => {
    checkbox.addEventListener('change', applyFilters);
});

// Clear filters function
function clearFilters() {
    // Clear all equipment category checkboxes
    document.querySelectorAll('.equipment-category').forEach(checkbox => checkbox.checked = false);

    // Clear the status selection by removing the active class from the status filters
    document.querySelectorAll('.filter-category li').forEach(status => status.classList.remove('active'));

    // Show all booking rows (reset to default view)
    const rows = document.querySelectorAll(".booking-table tbody tr");
    rows.forEach(row => {
        row.style.display = "";  // Show all rows
    });

    // Fetch and display the default list of bookings without any filters
    fetchBookings();  // Assuming page=1, limit=10, and no filters applied
}

// Function to filter bookings by selected equipment categories
function filterBookingsByCategory() {
    const selectedCategories = Array.from(document.querySelectorAll('.equipment-category:checked')).map(checkbox => checkbox.value);
    const rows = document.querySelectorAll(".booking-table tbody tr");

    rows.forEach(row => {
        const equipmentCategory = row.querySelector(".equipment-category-data").textContent;
        if (selectedCategories.length === 0 || selectedCategories.includes(equipmentCategory)) {
            row.style.display = "";  // Show matching rows
        } else {
            row.style.display = "none";  // Hide non-matching rows
        }
    });
}

// Function to filter bookings by selected status
function filterBookingsByStatus() {
    const selectedStatus = document.querySelector('.filter-category li.active')?.textContent || '';  // Get the selected status
    const rows = document.querySelectorAll(".booking-table tbody tr");

    rows.forEach(row => {
        const bookingStatus = row.querySelector(".status").textContent;
        if (!selectedStatus || bookingStatus === selectedStatus) {
            row.style.display = "";  // Show matching rows
        } else {
            row.style.display = "none";  // Hide non-matching rows
        }
    });
}

// Add event listeners to the status filter buttons
document.querySelectorAll('.filter-category li').forEach(item => {
    item.addEventListener('click', (event) => {
        // Remove active class from all statuses
        document.querySelectorAll('.filter-category li').forEach(status => status.classList.remove('active'));
        
        // Add active class to the clicked status
        event.target.classList.add('active');

        // Apply the status filter
        filterBookingsByStatus();
    });
});

// Add event listeners for the buttons
document.getElementById('clear-filters').addEventListener('click', clearFilters);
document.getElementById('apply-filters').addEventListener('click', applyFilters);

// Attach event listeners to the equipment category checkboxes
document.querySelectorAll('.equipment-category').forEach(checkbox => {
    checkbox.addEventListener('change', filterBookingsByCategory);
});

// Toggle navigation menu for mobile view
const menuIcon = document.querySelector('.menu-icon');
const navLinks = document.querySelector('#nav-links');

menuIcon.addEventListener('click', () => {
    navLinks.classList.toggle('active');
});

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

/// Logout button functionality with toast notification
document.querySelectorAll('#logout, #mobile-logout').forEach((button) => {
    button.addEventListener('click', function (event) {
        event.preventDefault();
        localStorage.clear(); // Clear all stored data
        showToast('Goodbye! Come back anytime.', 3000); // Display toast notification

        // Redirect to login page after showing toast
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 3000);
    });
});

// Display the first name of the user from localStorage
const firstName = localStorage.getItem('firstName'); 
if (firstName) {
    document.getElementById('user-name').textContent = firstName;
} else {
    window.location.href = '/login.html';
}
// Fetch bookings with pagination support
function fetchBookings(page = 1, limit = 10) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please log in to view your reservations.');
        return;
    }

   fetch(`${API_BASE_URL}/ownerBookings?page=${page}&limit=${limit}`, {

        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (!data || !data.bookings || !Array.isArray(data.bookings)) {
            alert('Failed to load bookings. Please try again later.');
            return;
        }

        const bookingTbody = document.getElementById('booking-tbody');
        bookingTbody.innerHTML = ''; // Clear existing rows

        const today = new Date();

        data.bookings.forEach(booking => {
            const startDate = new Date(booking.startDate);
            const endDate = new Date(booking.endDate);

            // Update status to 'Ongoing' if the current date is within the booking period and the status is 'Accepted'
            if (booking.status === 'Accepted' && today >= startDate && today <= endDate) {
                booking.status = 'Ongoing';
            }

            // Check if the review exists
            const viewReviewButton = booking.reviewExists ? `<a href="Owner_Review.html?bookingId=${booking.bookingId}" class="view-review-button">View Review</a>` : '';

            let actionButtons = '';
            if (booking.status === 'Ongoing') {
                actionButtons = '<button class="complete" onclick="openCompleteModal(' + booking.bookingId + ')">Complete</button>';
            } else if (booking.status === 'Pending') {
                actionButtons = `
                    <button class="reject" onclick="handleBookingAction(${booking.bookingId}, 'reject')">Reject</button>
                    <button class="accept" onclick="handleBookingAction(${booking.bookingId}, 'accept')">Accept</button>
                `;
            }

            // Add the "View Review" button if applicable
            const row = `
                <tr data-booking-id="${booking.bookingId}">
                    <td data-label="Date" class="booking-date">${startDate.toLocaleDateString()}</td>
                    <td data-label="Booking ID">#${booking.bookingId}</td>
                    <td data-label="Machine Name">${booking.machineTitle}</td>
                    <td data-label="Category" class="equipment-category-data">${booking.category}</td>
                    <td data-label="Status"><span class="status ${booking.status.toLowerCase()}">${booking.status}</span></td>
                    <td data-label="Details"><a href="OBookingDetails.html?bookingId=${booking.bookingId}">View Details</a></td>
                    <td data-label="Action">${actionButtons} ${viewReviewButton}</td>
                </tr>
            `;
            bookingTbody.insertAdjacentHTML('beforeend', row);
        });

        addCompleteButtons(); // Ensure this is called after rows are rendered
        updatePaginationControls(data.currentPage, data.totalPages);
    })
    .catch(error => {
        console.error('Error fetching bookings:', error);
        alert('Failed to load bookings. Please try again later.');
    });
}


// Ensure addCompleteButtons is called after content is loaded
document.addEventListener('DOMContentLoaded', () => {
    fetchBookings(); // This call will now render rows and add buttons accordingly
});


// Update pagination controls
function updatePaginationControls(currentPage, totalPages) {
    const paginationControls = document.getElementById('pagination-controls');
    paginationControls.innerHTML = ''; // Clear existing pagination controls

    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        button.disabled = i === currentPage;
        button.addEventListener('click', () => fetchBookings(i));
        paginationControls.appendChild(button);
    }
}

// Call fetchBookings on page load to fetch the first page of bookings
document.addEventListener('DOMContentLoaded', () => {
    fetchBookings(); // Fetch the first page with default limit
});

// Function to update the status in the table
function updateBookingStatus(bookingId, newStatus) {
    const statusElement = document.querySelector(`tr[data-booking-id="${bookingId}"] .status`);
    statusElement.textContent = newStatus;
    statusElement.className = `status ${newStatus.toLowerCase()}`; // Update class for styling
}
// Function to close the accept modal
document.getElementById('closeAcceptBtn').onclick = function () {
    document.getElementById('acceptModal').style.display = 'none';
};

// Function to close the reject modal
document.getElementById('closeRejectBtn').onclick = function () {
    document.getElementById('rejectModal').style.display = 'none';
};

// Existing code for closing modals using the "x" button
document.getElementById('closeAcceptModal').onclick = function () {
    document.getElementById('acceptModal').style.display = 'none';
};
document.getElementById('closeRejectModal').onclick = function () {
    document.getElementById('rejectModal').style.display = 'none';
};
// Function to close the accept modal
document.getElementById('closeAcceptBtn').onclick = function () {
    document.getElementById('acceptModal').style.display = 'none';
};

// Function to close the reject modal
document.getElementById('closeRejectBtn').onclick = function () {
    document.getElementById('rejectModal').style.display = 'none';
};

// Existing code for closing modals using the "x" button
document.getElementById('closeAcceptModal').onclick = function () {
    document.getElementById('acceptModal').style.display = 'none';
};
document.getElementById('closeRejectModal').onclick = function () {
    document.getElementById('rejectModal').style.display = 'none';
};

// Handle booking action (accept/reject) and show modal
function handleBookingAction(bookingId, action) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please log in to manage reservations.');
        return;
    }

    if (action === 'accept') {
        openAcceptModal();
        document.getElementById('confirmAccept').onclick = function () {
            processBookingAction(bookingId, 'accept');
            acceptModal.style.display = 'none';
        };
    } else if (action === 'reject') {
        openRejectModal();
        document.getElementById('confirmReject').onclick = function () {
            processBookingAction(bookingId, 'reject');
            rejectModal.style.display = 'none';
        };
    }
}
function showToast(message, duration = 3000, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    // Log the message for debugging
    console.log('Toast message:', message);

    // Set the message and style
    toastMessage.textContent = message;
    toast.style.backgroundColor = type === 'success' ? '#036e3a' : '#e53935'; // Green for success, red for error

    // Show the toast
    toast.className = 'toast show';

    // Hide the toast after the specified duration
    setTimeout(() => {
        toast.className = toast.className.replace('show', '');
    }, duration);
}


document.addEventListener("DOMContentLoaded", function () {
    const bookingId = new URLSearchParams(window.location.search).get('bookingId');
    const statusElement = document.querySelector('.status');
    const rejectButton = document.getElementById('reject-button');
    const acceptButton = document.getElementById('accept-button');

   // Accept the booking
document.getElementById('confirmAccept').onclick = function () {
    fetch(`${API_BASE_URL}/bookings/${bookingId}/accept`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to accept booking');
        }
        return response.json();
    })
    .then(() => {
        statusElement.textContent = 'Accepted';
        statusElement.classList.remove('pending', 'rejected');
        statusElement.classList.add('accepted');
        rejectButton.style.display = 'none';
        acceptButton.style.display = 'none';
        showToast('Reservation Accepted successfully!', 3000, 'success'); // Correct message here
    })
    .catch(error => {
        console.error('Error accepting booking:', error);
        alert(`Error accepting Reservation: ${error.message}`);
    });
};

    // Reject the booking
    document.getElementById('confirmReject').onclick = function () {
        fetch(`${API_BASE_URL}/bookings/${bookingId}/reject`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to reject booking');
            }
            return response.json();
        })
        .then(() => {
            statusElement.textContent = 'Rejected';
            statusElement.classList.remove('pending', 'accepted');
            statusElement.classList.add('rejected');
            rejectButton.style.display = 'none';
            acceptButton.style.display = 'none';
            showToast('Reservation rejected successfully!');
        })
        .catch(error => {
            console.error('Error rejecting booking:', error);
            alert(`Error rejecting booking: ${error.message}`);
        });
    };
});

// Function to open the complete reservation modal
function openCompleteModal(bookingId) {
    document.getElementById('completeModal').style.display = 'block';

    // Set the click event for confirming the action
    document.getElementById('confirmComplete').onclick = function () {
        processBookingAction(bookingId, 'complete');
        document.getElementById('completeModal').style.display = 'none';
    };
}

// Close the complete modal when the 'No' button or 'x' button is clicked
document.getElementById('closeCompleteBtn').onclick = function () {
    document.getElementById('completeModal').style.display = 'none';
};
document.getElementById('closeCompleteModal').onclick = function () {
    document.getElementById('completeModal').style.display = 'none';
};

// Update function to add "Mark as Finish" buttons for ongoing reservations
function addCompleteButtons() {
    const rows = document.querySelectorAll(".booking-table tbody tr");
    rows.forEach(row => {
        const statusElement = row.querySelector('.status');
        const bookingId = row.getAttribute('data-booking-id');

        // Check if the status is "Ongoing" and if a "Mark as Finished" button is not already present
        if (statusElement && statusElement.textContent.trim() === 'Ongoing') {
            // Remove any existing "Complete" button if present
            const existingCompleteButton = row.querySelector('button.complete');
            if (existingCompleteButton) {
                existingCompleteButton.remove();
            }

            // Add the "Mark as Finished" button if not already present
            const existingMarkButton = row.querySelector('button.mark-as-finished');
            if (!existingMarkButton) {
                const markButton = document.createElement('button');
                markButton.className = 'mark-as-finished';
                markButton.textContent = 'Mark as Finished'; // Button text
                markButton.onclick = function () {
                    openCompleteModal(bookingId);
                };
                row.querySelector('[data-label="Action"]').appendChild(markButton);
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    fetchBookings(); // Fetch the first page with default limit
    addCompleteButtons(); // Ensure "Mark as Finish" buttons are added only
});



function processBookingAction(bookingId, action) {
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('Please log in to manage reservations.');
        return;
    }

    fetch(`${API_BASE_URL}/bookings/${bookingId}/${action}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to process booking action');
        }
        return response.json();
    })
    .then(() => {
        const newStatus = action === 'complete' ? 'Completed' : action.charAt(0).toUpperCase() + action.slice(1);
        updateBookingStatus(bookingId, newStatus);
        showToast(`Booking ${newStatus} successfully.`);
        fetchBookings(); // Refresh the booking list after the action
    })
    .catch(error => {
        console.error(`Error processing booking ${action}:`, error);
        showToast(`Failed to ${action} booking. Please try again.`);
    });
}


// Open Accept Modal
function openAcceptModal() {
    document.getElementById('acceptModal').style.display = 'block';
}

// Open Reject Modal
function openRejectModal() {
    document.getElementById('rejectModal').style.display = 'block';
}

// Close modals when clicking on the close button
document.getElementById('closeAcceptModal').onclick = function () {
    document.getElementById('acceptModal').style.display = 'none';
};
document.getElementById('closeRejectModal').onclick = function () {
    document.getElementById('rejectModal').style.display = 'none';
};


