const API_BASE_URL = window.location.origin.includes("ngrok")
    ? window.location.origin
    : "http://localhost:3000";


// Fetch the booking ID from the URL
const urlParams = new URLSearchParams(window.location.search);
const bookingId = urlParams.get('bookingId');

// Display user info (existing functionality)
const userNameElement = document.getElementById('user-name');
const firstName = localStorage.getItem('firstName');
if (firstName) {
    userNameElement.textContent = firstName;
} else {
    window.location.href = '/login.html';
}

// Fetch and display review details for the booking
async function fetchReviewDetails(bookingId) {
    try {
       const response = await fetch(`${API_BASE_URL}/reviewDetails/${bookingId}`);
        if (!response.ok) throw new Error('Failed to fetch review details');

        const reviewData = await response.json();

        // Set the reviewer's name with "Rating" appended
        document.getElementById('reviewer-heading').textContent = reviewData.renterName 
            ? `${reviewData.renterName} Rating` 
            : "Reviewer Rating"; // Default text if name is missing

        // Display machine details
        document.getElementById('machine-name').textContent = reviewData.equipmentName;
        if (reviewData.machineImage) {
            const machineImage = document.getElementById('machine-image');

            // Sanitize and construct the correct path for the image
            const sanitizedImage = reviewData.machineImage
                .replace(/^\/?uploads\/machine_images\//, '')
                .replace(/^\/?uploads\//, '');
            const imagePath = `/uploads/machine_images/${sanitizedImage}`;

            machineImage.src = imagePath; // Set the correct path
            machineImage.style.display = 'block';
        }

      // Highlight stars for the ratings
highlightStars(reviewData.machineOperatorPerformanceRating, document.querySelector('[data-label="machine-operator-performance"]'), true);
highlightStars(reviewData.ownerServiceRating, document.querySelector('[data-label="owner-service"]'), true);

// Set the comment in the textarea
const commentBox = document.getElementById('machine-operator-performance-comment-box');
if (commentBox) {
    commentBox.value = reviewData.comment || 'No comment provided';
    commentBox.disabled = true;
    document.getElementById('machine-operator-performance-comment').style.display = 'block';
}


        // Display review images if available
        const photoPreviewContainer = document.getElementById('photo-preview-container');
        photoPreviewContainer.innerHTML = '';
        if (reviewData.reviewImages && reviewData.reviewImages.length) {
            reviewData.reviewImages.forEach(imageUrl => {
                const imageElement = document.createElement('img');
                imageElement.src = imageUrl;
                imageElement.classList.add('thumbnail');
                photoPreviewContainer.appendChild(imageElement);
            });
        }

        // Hide submit and edit buttons when displaying existing reviews
        document.getElementById('submit-button').style.display = 'none';
        document.getElementById('edit-button').style.display = 'none';

    } catch (error) {
        console.error(error.message);
        alert('Failed to load review details. Please try again later.');
    }
}



// Function to highlight stars for ratings
function highlightStars(rating, starsContainer, isReadOnly = false) {
    const stars = starsContainer.querySelectorAll('.fa-star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('selected');
            star.style.color = 'gold';
        } else {
            star.classList.remove('selected');
            star.style.color = '#ccc';
        }
        if (isReadOnly) {
            star.style.pointerEvents = 'none';
        }
    });
}

// Event listener for the "Review Renter" button to open the modal
document.getElementById('toggle-review-button').onclick = function () {
    openRenterReviewModal();
};

// Function to open the renter review modal
function openRenterReviewModal() {
    console.log('Modal open function triggered');
    document.getElementById('reviewRenterModal').style.display = 'block';
}

// Function to close the modal when the cancel or close buttons are clicked
document.getElementById('renter-review-cancel-button').onclick = function () {
    document.getElementById('reviewRenterModal').style.display = 'none';
};

document.getElementById('closeReviewRenterModal').onclick = function () {
    document.getElementById('reviewRenterModal').style.display = 'none';
};

// Ensure fetchReviewDetails or other functions do not trigger the modal on page load
document.addEventListener('DOMContentLoaded', () => {
    fetchReviewDetails(bookingId); // Fetch data but do not display the modal automatically
});


// Get all the stars in the renter review modal
const renterReviewStars = document.querySelectorAll('#renter-review-stars .fa-star');

// Create and append the rating description span to the specific modal section
const ratingDescription = document.createElement('span');
ratingDescription.id = 'rating-equivalent';
ratingDescription.style.marginLeft = '10px';
ratingDescription.style.fontWeight = 'bold';

// Append the rating description within the specific modal rating section
document.querySelector('#reviewRenterModal .rating-section').appendChild(ratingDescription);

// Array of rating descriptions
const ratingDescriptions = ['Terrible', 'Poor', 'Fair', 'Good', 'Amazing'];

// Variable to keep track of the selected rating in the modal
let renterSelectedRating = 0;

// Add event listeners for each star in the renter review modal
renterReviewStars.forEach((star, index) => {
    // Highlight stars on hover and display the equivalent text
    star.addEventListener('mouseover', () => {
        highlightRenterReviewStars(index);
        showRatingDescription(index);
    });

    // Set the selected rating on click and show the text
    star.addEventListener('click', () => {
        setRenterSelectedRating(index + 1); // Store the rating (index is 0-based, so add 1)
        showRatingDescription(index);
    });

    // Reset stars to the current selected rating and display on mouseout
    star.addEventListener('mouseout', () => {
        resetRenterReviewStars();
        showRatingDescription(renterSelectedRating - 1);
    });
});

// Function to highlight stars up to a given index for the modal
function highlightRenterReviewStars(index) {
    renterReviewStars.forEach((star, i) => {
        if (i <= index) {
            star.classList.add('selected');
            star.style.color = 'gold';
        } else {
            star.classList.remove('selected');
            star.style.color = '#ccc';
        }
    });
}

// Function to set the selected rating for the modal
function setRenterSelectedRating(rating) {
    renterSelectedRating = rating;
    highlightRenterReviewStars(rating - 1);
    console.log('Selected renter review rating:', renterSelectedRating); // Log for verification
}

// Function to reset the stars to show the current selected rating in the modal
function resetRenterReviewStars() {
    renterReviewStars.forEach((star, index) => {
        if (index < renterSelectedRating) {
            star.classList.add('selected');
            star.style.color = 'gold';
        } else {
            star.classList.remove('selected');
            star.style.color = '#ccc';
        }
    });
}

// Function to show the rating description
function showRatingDescription(index) {
    if (index >= 0 && index < ratingDescriptions.length) {
        ratingDescription.textContent = ratingDescriptions[index];
        
        // Highlight "Good" and "Amazing" in gold
        if (ratingDescriptions[index] === 'Good' || ratingDescriptions[index] === 'Amazing') {
            ratingDescription.style.color = 'gold';
        } else {
            ratingDescription.style.color = '#000'; // Default color for other ratings
        }
    } else {
        ratingDescription.textContent = ''; // Clear text if no valid rating is selected
        ratingDescription.style.color = '#000'; // Reset to default color
    }
}

// Get references to the comment box and submit button
const commentBox = document.getElementById('renter-comment-box');
const submitButton = document.getElementById('renter-review-submit-button');

// Enable the comment box for editing
commentBox.removeAttribute('readonly');

// Attempt to retrieve userId from localStorage or a data attribute in the DOM
let userId = localStorage.getItem('userId');
if (!userId) {
    const bookingElement = document.querySelector('#booking-details');
    if (bookingElement && bookingElement.dataset.userId) {
        userId = bookingElement.dataset.userId;
        localStorage.setItem('userId', userId); // Store in localStorage for future use
    }
}

// Log to verify userId and alert if missing
console.log('User ID:', userId);
if (!userId) {
    console.error('User ID is missing. Ensure it is stored in localStorage or present in the DOM.');
    alert('User ID is missing. Please check your session or data source.');
}

// Submit review event listener
// Submit review event listener
submitButton.addEventListener('click', async () => {
    const commentText = commentBox.value.trim();

    // Log to check if bookingId and userId are valid before submission
    console.log('Booking ID:', bookingId);
    console.log('User ID:', userId);

    if (!bookingId || !userId) {
        console.warn('Submission halted: Missing bookingId or userId.');
        alert('Missing booking or user information. Please ensure all required data is present.');
        return;
    }

    if (renterSelectedRating === 0) {
        console.warn('Submission halted: No rating selected.');
        alert('Please select a rating before submitting.');
        return;
    }

    // Remove the check for an empty comment to allow submission
    // Set comment to null if empty to avoid issues on the server
    const comment = commentText || null;

    try {
        const response = await fetch(`${API_BASE_URL}/reviews/renter`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}` // Ensure token is present
            },
            body: JSON.stringify({
                bookingId: bookingId,
                userId: userId, // Use userId instead of renterId
                rating: renterSelectedRating,
                comment: comment
            })
        });

        if (!response.ok) {
            const errorDetails = await response.json(); // Attempt to parse response for details
            console.error('Failed to submit review:', errorDetails);
            throw new Error(`Failed to submit review: ${errorDetails.message || 'Unknown error'}`);
        }

        alert('Review submitted successfully!');
        document.getElementById('reviewRenterModal').style.display = 'none';
        commentBox.value = '';
        renterSelectedRating = 0;
        resetRenterReviewStars();

        // Refresh the page after successful submission
        location.reload();
    } catch (error) {
        console.error('Error:', error);
        alert(`Failed to submit the review: ${error.message}`);
    }
});


async function fetchRenterRating(bookingId) {
    console.log('Fetching renter rating for booking ID:', bookingId);

    try {
        const response = await fetch(`${API_BASE_URL}/reviews/renter/booking/${bookingId}`);

        // Handle 404 - No review found for this booking ID (interpreted as first-time submission)
        if (response.status === 404) {
            console.warn('No review found for this booking. Prompting user to submit a new review.');

            // Update the UI to enable review submission
            document.getElementById('reviewer-heading').textContent = 'Submit Your Review';
            document.getElementById('renter-comment-box').value = '';
            document.getElementById('renter-comment-box').disabled = false;
            document.getElementById('renter-review-submit-button').style.display = 'block';
            document.getElementById('renter-review-stars').style.pointerEvents = 'auto';

            return; // Exit the function as no existing review was found
        }

        // Handle other non-success status codes
        if (!response.ok) {
            console.error('Failed to fetch renter review, status:', response.status);
            return; // Exit without showing alert for non-404 errors
        }

        // Parse the response as JSON
        const renterReview = await response.json();
        console.log('Fetched renter review data:', renterReview);

        // Display the existing review in read-only mode
        if (renterReview) {
            document.getElementById('reviewer-heading').textContent = `${renterReview.reviewerName} Rating`;
            highlightStars(renterReview.rating, document.querySelector('#renter-review-stars'), true);
            
            const commentBox = document.getElementById('renter-comment-box');
            commentBox.value = renterReview.comment || 'No comment provided';
            commentBox.disabled = true;

            document.getElementById('renter-review-submit-button').style.display = 'none';
        }
    } catch (error) {
        console.error('Unexpected error fetching renter review:', error);
    }
}


// Call this function on page load to fetch and display the renter's review
document.addEventListener('DOMContentLoaded', () => {
    if (bookingId) {
        fetchRenterRating(bookingId);
    } else {
        console.warn('Booking ID is not available in the URL');
    }
});

function getIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Logout functionality
function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('firstName');
    alert('You have been logged out.');
    window.location.href = '/login.html';
}

document.getElementById('logout')?.addEventListener('click', handleLogout);
document.getElementById('mobile-logout')?.addEventListener('click', handleLogout);
