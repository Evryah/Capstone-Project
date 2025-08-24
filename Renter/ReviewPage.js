// Determine API base URL dynamically
const API_BASE_URL = window.location.origin.includes("ngrok")
    ? window.location.origin
    : "http://localhost:3000";

// Display a simple notification count and user name
const userNameElement = document.getElementById('user-name');
const notificationCountElement = document.querySelector('.notification-count');

// Display the first name of the user
const firstName = localStorage.getItem('firstName'); 
if (firstName) {
    $('#user-name').text(firstName);
} else {
    window.location.href = '/login.html';
}


document.addEventListener('DOMContentLoaded', function () {
    const userProfileLink = document.getElementById('user-profile-link');
    const userId = localStorage.getItem('userId'); // Ensure 'userId' is stored during login

    if (userProfileLink && userId) {
        userProfileLink.href = `ViewProfile.html?id=${encodeURIComponent(userId)}`;
    }
});


// Toggle navigation menu for mobile view
const menuIcon = document.querySelector('.menu-icon');
const navLinks = document.querySelector('#nav-links');

if (menuIcon) {
    menuIcon.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
}

// Handle logout for both desktop and mobile views
function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('firstName');
    alert('You have been logged out.');
    window.location.href = '/login.html';
}

const logoutButton = document.getElementById('logout');
const mobileLogoutButton = document.getElementById('mobile-logout');

if (logoutButton) logoutButton.addEventListener('click', handleLogout);
if (mobileLogoutButton) mobileLogoutButton.addEventListener('click', handleLogout);


// Fetch and display machine details based on bookingId
document.addEventListener('DOMContentLoaded', async function () {
    function getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }
    
    const bookingId = getQueryParam('bookingId');
    const viewMode = getQueryParam('view');  // Get the view query param to determine mode

    // Declare the star rating elements first before using them
    const machineOperatorPerformanceRatingStars = document.querySelectorAll('.stars[data-label="machine-operator-performance"] .fa-star');
    const ownerServiceRatingStars = document.querySelectorAll('.stars[data-label="owner-service"] .fa-star');

  if (viewMode) {
    // Fetch and display the existing review
    try {
       const response = await fetch(`${API_BASE_URL}/reviewDetails/${bookingId}`);
        if (!response.ok) throw new Error('Failed to fetch review details');
        const reviewDetails = await response.json();
        
        // Display the review details (e.g., ratings, comment, etc.)
        document.getElementById('machine-name').textContent = reviewDetails.equipmentName;
        document.getElementById('machine-operator-performance-comment').style.display = 'block'; // Show the comment box
        document.getElementById('machine-operator-performance-comment-box').value = reviewDetails.comment; // Set the comment text

       // Set the stars based on the review ratings
highlightStars(reviewDetails.machineOperatorPerformanceRating, machineOperatorPerformanceRatingStars, true);
highlightStars(reviewDetails.ownerServiceRating, ownerServiceRatingStars, true);
        
       // Display review images (if available)
const photoPreviewContainer = document.getElementById('photo-preview-container');
photoPreviewContainer.innerHTML = '';  // Clear container before adding new images

// Check if reviewImages array exists and has images
if (reviewDetails.reviewImages && reviewDetails.reviewImages.length > 0) {
    reviewDetails.reviewImages.forEach((imagePath, index) => {
        const imageElement = document.createElement('img');
        imageElement.src = `${API_BASE_URL}${imagePath}`;
        imageElement.alt = `Review Image ${index + 1}`;
        imageElement.classList.add('thumbnail');
        photoPreviewContainer.appendChild(imageElement);
    });

    // Call lightbox event listener after images are added
    const previewImages = document.querySelectorAll('.thumbnail');
    previewImages.forEach(img => {
        img.addEventListener('click', function () {
            lightbox.style.display = 'flex';
            lightboxImage.src = this.src;
        });
    });
}

// Log review details for debugging
console.log('Review Details:', reviewDetails);


        // Disable form fields since we are in view mode
        disableReviewForm();

        // Show the Edit button
        document.getElementById('edit-button').style.display = 'inline-block';

    } catch (error) {
        console.error('Error fetching review details:', error);
        alert('Failed to load review details. Please try again later.');
    }
}

// Function to disable form fields for view-only mode
function disableReviewForm() {
    document.querySelectorAll('.stars .fa-star').forEach(star => star.style.pointerEvents = 'none');

    const commentBox = document.getElementById('machine-operator-performance-comment-box');
    if (commentBox) {
        commentBox.disabled = true;
    }

    const submitButton = document.getElementById('submit-button');
    if (submitButton) {
        submitButton.style.display = 'none';  // Hide the submit button
    }
}


// Function to enable form fields for edit mode
function enableReviewForm() {
    document.querySelectorAll('.stars .fa-star').forEach(star => star.style.pointerEvents = 'auto');

    const commentBox = document.getElementById('machine-operator-performance-comment-box');
    if (commentBox) {
        commentBox.disabled = false;  // Enable the comment box if it exists
    }

    const submitButton = document.getElementById('submit-button');
    if (submitButton) {
        submitButton.style.display = 'inline-block';  // Show the submit button if it exists
    }
}


// Handle Edit button click
document.getElementById('edit-button').addEventListener('click', () => {
    enableReviewForm();  // Enable the form fields
    document.getElementById('edit-button').style.display = 'none';  // Hide the edit button
});
    
if (bookingId) {
    try {
        const response = await fetch(`${API_BASE_URL}/bookingDetails/${bookingId}`);
        if (!response.ok) throw new Error('Failed to fetch booking details');
        const bookingDetails = await response.json();

        document.getElementById('machine-name').textContent = bookingDetails.equipmentName;
        if (bookingDetails.machineImage) {
            const imageElement = document.getElementById('machine-image');
            
            // Sanitize and construct the image path
            const sanitizedImage = bookingDetails.machineImage
                .replace(/^\/?uploads\/machine_images\//, '')
                .replace(/^\/?uploads\//, '');
            const imagePath = `/uploads/machine_images/${sanitizedImage}`;

            imageElement.src = imagePath; // Set the correct path
            imageElement.alt = bookingDetails.equipmentName;
            imageElement.style.display = 'block';
        }   
    } catch (error) {
        console.error('Error fetching machine details:', error);
        alert('Failed to load machine details. Please try again later.');
    }
}

document.getElementById('cancel-button').addEventListener('click', () => {
    window.location.href = 'Renter_Reservation.html';
});


    const ratings = {
        1: 'Terrible',
        2: 'Poor',
        3: 'Fair',
        4: 'Good',
        5: 'Amazing'
    };

    function handleRating(stars, labelId, commentBoxId = null, addPhotoButtonId = null) {
        const starElements = stars.querySelectorAll('.fa-star');
        const label = document.getElementById(labelId);
        const commentBox = commentBoxId ? document.getElementById(commentBoxId) : null;
        const addPhotoButton = addPhotoButtonId ? document.getElementById(addPhotoButtonId) : null;
    
        starElements.forEach(star => {
            star.addEventListener('click', () => {
                const selectedValue = star.dataset.value;
                resetStars(starElements);  // Reset other stars
                highlightStars(selectedValue, starElements, true);  // Highlight selected stars
    
                label.textContent = ratings[selectedValue];  // Display label text (e.g., Amazing)
    
                if (commentBox) {
                    commentBox.style.display = 'block';
                }
                if (addPhotoButton) {
                    addPhotoButton.style.display = 'inline-block';
                }
    
                // Check if value is 4 or 5 to highlight Amazing
                if (selectedValue >= 4) {
                    label.classList.add('highlight');
                } else {
                    label.classList.remove('highlight');
                }
    
                // Explicitly set the selected value on the stars element's dataset
                stars.dataset.selectedValue = selectedValue;
            });
        });
    }
    
    function resetStars(starElements) {
        starElements.forEach(star => {
            star.classList.remove('selected');  // Only reset stars in this rating category
            star.style.color = '#ccc';  // Reset color
        });
    }
    
    function highlightStars(value, starElements, select = false) {
        starElements.forEach(star => {
            if (star.dataset.value <= value) {
                star.style.color = 'gold';  // Highlight stars up to the clicked one
                if (select) {
                    star.classList.add('selected');  // Mark the star as selected
                }
            }
        });
    }
    

    document.querySelectorAll('.stars').forEach(stars => {
        const labelId = `${stars.dataset.label}-label`;

        if (stars.dataset.label === 'machine-operator-performance') {
            handleRating(stars, labelId, 'machine-operator-performance-comment', 'add-photo-button');
        } else {
            handleRating(stars, labelId);
        }
    });

    const addPhotoButton = document.getElementById('add-photo-button');
    const photoInput = document.getElementById('photo-input');
    const photoPreviewContainer = document.getElementById('photo-preview-container');
    let uploadedImages = [];

    addPhotoButton.addEventListener('click', () => {
        if (uploadedImages.length < 3) {
            photoInput.click();
        } else {
            alert('You can only upload up to 3 images.');
        }
    });

    photoInput.addEventListener('change', function () {
        const files = Array.from(this.files);
        const remainingSlots = 3 - uploadedImages.length;

        if (files.length > remainingSlots) {
            alert(`You can only upload ${remainingSlots} more image(s).`);
            return;
        }

        files.forEach(file => {
            if (uploadedImages.length < 3) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    const imageContainer = document.createElement('div');
                    imageContainer.classList.add('thumbnail-container');

                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.classList.add('thumbnail');

                    const removeButton = document.createElement('button');
                    removeButton.textContent = 'X';
                    removeButton.classList.add('remove-button');

                    removeButton.addEventListener('click', () => {
                        photoPreviewContainer.removeChild(imageContainer);
                        uploadedImages = uploadedImages.filter(image => image !== file);
                    });

                    imageContainer.appendChild(img);
                    imageContainer.appendChild(removeButton);
                    photoPreviewContainer.appendChild(imageContainer);
                    uploadedImages.push(file);

                    // Add lightbox event to new thumbnail
                    addLightboxToThumbnails();
                };

                reader.readAsDataURL(file);
            }
        });
    });


    // Loop through selected files and display the preview
    Array.from(photoInput.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = document.createElement('img');
            img.src = e.target.result;  // Set the image source to the file data
            img.classList.add('thumbnail');
            photoPreviewContainer.appendChild(img);

            // Attach click event to show image in lightbox
            img.addEventListener('click', function () {
                lightbox.style.display = 'flex';
                lightboxImage.src = img.src;  // Display the clicked image in the lightbox
            });
        };
        reader.readAsDataURL(file);  // Convert the file to a data URL for preview
    });


    const submitButton = document.getElementById('submit-button');

  // Update the function to check the correct comment box ID
function updateSubmitButtonState() {
    const machineOperatorPerformanceRating = document.querySelector('.stars[data-label="machine-operator-performance"] .selected')?.dataset.value;
    const ownerServiceRating = document.querySelector('.stars[data-label="owner-service"] .selected')?.dataset.value;
    const comment = document.getElementById('machine-operator-performance-comment-box').value.trim();
    
    if (machineOperatorPerformanceRating && ownerServiceRating && comment.length > 0) {
        submitButton.disabled = false;
        submitButton.classList.add('active');
    } else {
        submitButton.disabled = true;
        submitButton.classList.remove('active');
    }
}

// Add event listeners for checking the submit button state
machineOperatorPerformanceRatingStars.forEach(star => star.addEventListener('click', updateSubmitButtonState));
ownerServiceRatingStars.forEach(star => star.addEventListener('click', updateSubmitButtonState));
document.getElementById('machine-operator-performance-comment-box').addEventListener('input', updateSubmitButtonState);

// Ensure the submit button's initial state is updated correctly
updateSubmitButtonState();


    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightbox-image');
    const closeLightbox = document.getElementById('close-lightbox');

    // Handle lightbox close
    closeLightbox.addEventListener('click', function () {
        lightbox.style.display = 'none';
    });

    // Close lightbox when clicking outside the image
    lightbox.addEventListener('click', function (event) {
        if (event.target !== lightboxImage) {
            lightbox.style.display = 'none';
        }
    });

    // Function to preview image in lightbox
    function openLightbox(imgSrc) {
        lightboxImage.src = imgSrc;
        lightbox.style.display = 'flex';
    }

    // Add click event listeners to thumbnails for lightbox
    function addLightboxToThumbnails() {
        const thumbnails = document.querySelectorAll('.thumbnail');
        thumbnails.forEach(img => {
            img.addEventListener('click', function () {
                openLightbox(this.src);
            });
        });
    }

// Form submission logic
async function submitReview(event) {
    event.preventDefault();

    const bookingId = getQueryParam('bookingId');
    const machineOperatorPerformanceRating = document.querySelector('.stars[data-label="machine-operator-performance"]')?.dataset.selectedValue;
    const ownerServiceRating = document.querySelector('.stars[data-label="owner-service"]')?.dataset.selectedValue;
    const comment = document.getElementById('machine-operator-performance-comment-box').value;
    
    // Ensure existing ratings are used
    if (!machineOperatorPerformanceRating || !ownerServiceRating) {
        alert("Please provide ratings for all categories.");
        return;
    }
    
    const formData = new FormData();
    formData.append('bookingId', bookingId);
    formData.append('machineOperatorPerformanceRating', machineOperatorPerformanceRating);
    formData.append('ownerServiceRating', ownerServiceRating);
    formData.append('comment', comment);

    // Handle images if any
    if (uploadedImages && uploadedImages.length > 0) {
        uploadedImages.forEach((file, index) => {
            console.log(`Appending image ${index + 1}:`, file.name); // Debug log for each image
            formData.append(`reviewImage${index + 1}`, file);  // Append image files to the formData
        });
    }

    // Debug: Log form data entries
    for (let [key, value] of formData.entries()) {
        console.log(`FormData entry: ${key} = ${value}`);
    }

    try {
        const response = await fetch(`${API_BASE_URL}/submitReview`, {
            method: 'POST', // This handles both create and update
            body: formData,
        });

        if (response.ok) {
            const result = await response.json();
            alert(result.message); // Use server response for alert
            window.location.href = 'Renter_Reservation.html';
        } else {
            const errorMsg = await response.text();
            console.error('Response error:', errorMsg);
            alert('Failed to submit the review. Server response: ' + errorMsg);
        }
    } catch (error) {
        console.error('Error submitting review:', error);
        alert('An error occurred while updating the review. Please check your network connection and try again.');
    }
}

// Add event listener for the submit button
submitButton.addEventListener('click', submitReview);
});

