// Determine API base URL dynamically
const API_BASE_URL = window.location.origin.includes("ngrok")
    ? window.location.origin
    : "http://localhost:3000";

function showToast(message, duration = 3000) {
    const toast = document.getElementById("toast");
    if (!toast) {
        console.error("Toast element not found!");
        return;
    }
    toast.textContent = message;
    toast.classList.add("show");

    // Remove the toast after the specified duration
    setTimeout(() => {
        toast.classList.remove("show");
    }, duration);
}

// Toggle navigation menu for mobile view
const menuIcon = document.querySelector('.menu-icon');
const navLinks = document.querySelector('#nav-links');

menuIcon.addEventListener('click', () => {
    navLinks.classList.toggle('active');
});

// Logout functionality with toast notification
document.getElementById('logout').addEventListener('click', function(event) {
    event.preventDefault();
    localStorage.clear(); // Clear all local storage
    showToast('Goodbye! Come back anytime.', 3000); // Show logout toast

    // Redirect to login page after showing the toast
    setTimeout(() => {
        window.location.href = '/login.html';
    }, 3000);
});

document.getElementById('mobile-logout').addEventListener('click', function(event) {
    event.preventDefault();
    localStorage.clear();
    showToast('Goodbye! Come back anytime.', 3000); // Show logout toast

    setTimeout(() => {
        window.location.href = '/login.html';
    }, 3000);
});

// Display the first name of the user
const userNameElement = document.getElementById('user-name');
const firstName = localStorage.getItem('firstName');
if (firstName) {
    $('#user-name').text(firstName);
} else {
    // If no user is logged in, redirect to the login page
    window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', function () {
    const userProfileLink = document.getElementById('user-profile-link');
    let userId = localStorage.getItem('userId'); // Check if userId is stored in localStorage

    // If userId is not found in localStorage, check the URL as a fallback
    if (!userId) {
        userId = getUserIdFromUrl();
    }

    console.log('User ID for profile display:', userId); // Debugging output

    if (userProfileLink && userId) {
        userProfileLink.href = `ViewProfile.html?id=${encodeURIComponent(userId)}`;
        displayUserProfile(userId); // Display the profile using the obtained userId
    } else {
        document.querySelector('.profile-container').innerHTML = '<p>User ID not found. Please log in again.</p>';
        console.error('User ID not found. Profile cannot be displayed.');
    }
});
// Extract the user ID from the URL
function getUserIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}


function displayUserProfile(userId) {
   fetch(`${API_BASE_URL}/users/${userId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch user data');
            }
            return response.json();
        })
        .then(data => {
            console.log('Fetched User Data:', data); // Debugging log

            const container = document.querySelector('.profile-container');

            if (!data || typeof data !== 'object') {
                console.error('Invalid data structure:', data);
                container.innerHTML = '<p>Unexpected data format. Please try again later.</p>';
                return;
            }

            let rating = 0;
            let formattedRating = 'No ratings available';
            let userType;

            // Debug: Check data properties
            console.log('ownerServiceRating:', data.ownerServiceRating);
            console.log('renterRating:', data.renterRating);

            if (data.ownerServiceRating !== undefined && data.ownerServiceRating !== null) {
                userType = 'Owner';
                rating = parseFloat(data.ownerServiceRating);
                document.getElementById('listings-tab').innerText = 'Machines';
                document.getElementById('listings-tab').style.display = ''; // Ensure the tab is visible
            } else if (data.renterRating !== undefined && data.renterRating !== null) {
                userType = 'Renter';
                rating = parseFloat(data.renterRating);
                document.getElementById('listings-tab').style.display = 'none'; // Hide "User's Listings" tab
            } else {
                userType = null;
                console.warn('User type could not be determined');
                container.innerHTML = '<p>Profile details could not be identified. Please contact support.</p>';
                return;
            }

            formattedRating = isNaN(rating) || rating <= 0 ? 'No ratings available' : rating.toFixed(1);

            container.innerHTML = `
                <div class="profile-card">
                    <h2>${data.firstName || 'First Name'} ${data.lastName || 'Last Name'}</h2>
                    <p><i class="fa fa-map-marker"></i> ${data.address || 'Address not provided'}</p>
                    <p><i class="fa fa-phone"></i> ${data.phoneNumber || 'Phone number not available'}</p>
                    <div class="rating">
                        ${renderStars(rating)} ${formattedRating}/5
                    </div>
                </div>
            `;

            if (userType === 'Owner') {
                displayOwnerMachines(userId);
                displayOwnerReviews(userId);
            } else if (userType === 'Renter') {
                displayRenterReviews(userId); // Load renter reviews
            }
        })
        .catch(error => {
            console.error('Error fetching user data:', error);
            document.querySelector('.profile-container').innerHTML = '<p>Unable to load user data. Please try again later.</p>';
        });
}


// Helper function to render star ratings
function renderStars(rating) {
    let starsHTML = '';
    for (let i = 1; i <= 5; i++) {
        starsHTML += i <= Math.round(rating) ? '<i class="fa fa-star"></i>' : '<i class="fa fa-star-o"></i>';
    }
    return starsHTML;
}

function formatPrice(price) {
    return `₱${parseFloat(price).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function displayOwnerMachines(ownerId) {
    fetch(`${API_BASE_URL}/machines/owner/${ownerId}/listings`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch machines data');
            }
            return response.json();
        })
        .then(machines => {
            const machineCardContainer = document.getElementById('machine-card-container');
            if (!machineCardContainer) {
                console.error('Element with ID "machine-card-container" not found.');
                return;
            }

            machineCardContainer.innerHTML = ''; // Clear previous content

            if (machines.length === 0) {
                machineCardContainer.innerHTML = '<p>No machines available for this owner.</p>';
                return;
            }

            machines.forEach(machine => {
                // Sanitize and construct the image path
                const sanitizedImage = machine.image
                    ? `/uploads/machine_images/${machine.image.replace(/^\/?uploads\/machine_images\//, '').replace(/^\/?uploads\//, '')}`
                    : '/assets/default-machine-image.jpg';

                // Format the price
                const formattedPrice = machine.price_per_hectare
                    ? formatPrice(machine.price_per_hectare)
                    : 'N/A';

                // Create a machine card
                const machineCard = document.createElement('div');
                machineCard.classList.add('machine-card');

                // Create the card link
                const cardLink = document.createElement('a');
                cardLink.href = `machine_detail.html?id=${machine.id}`;
                cardLink.classList.add('card-link');

                // Populate the card's inner HTML
                cardLink.innerHTML = `
                    <img src="${sanitizedImage}" alt="${machine.title || 'Machine'}">
                    <div class="rating">${generateRatingStars(machine.averageRating || 0)}</div>
                    <div class="price">${formattedPrice}</div>
                    <div class="name">${machine.title || 'Unnamed Machine'}</div>
                `;

                // Append the link to the card and the card to the container
                machineCard.appendChild(cardLink);
                machineCardContainer.appendChild(machineCard);
            });
        })
        .catch(error => {
            console.error('Error fetching owner machines:', error);
            const machineCardContainer = document.getElementById('machine-card-container');
            if (machineCardContainer) {
                machineCardContainer.innerHTML = '<p>Error loading machines. Please try again later.</p>';
            }
        });
}



// Helper function to render star ratings
function generateRatingStars(rating) {
    const fullStar = '<i class="fa fa-star"></i>';
    const emptyStar = '<i class="fa fa-star-o"></i>';
    let starsHTML = '';
    for (let i = 1; i <= 5; i++) {
        starsHTML += i <= rating ? fullStar : emptyStar;
    }
    return starsHTML;
}

// Ensure this variable is declared globally if accessed by multiple functions.
let userId;

// Event listeners for the tab headers
document.addEventListener('DOMContentLoaded', () => {
    userId = getUserIdFromUrl();
    
    if (userId) {
        displayUserProfile(userId); // Use the correct function name
    } else {
        document.querySelector('.profile-container').innerHTML = '<p>No user ID found in the URL.</p>';
    }

    // Event listener for the "Machines" or "Listings" tab
    document.getElementById('listings-tab').addEventListener('click', () => {
        // Check if the tab should display "Machines" for owners
        if (document.getElementById('listings-tab').innerText === 'Machines') {
            switchTab('machines');
            displayOwnerMachines(userId); // Load the owner's machines
        } else {
            switchTab('listings'); // Default behavior for other users
        }
    });

 // Event listener for the "User Reviews" tab
document.getElementById('reviews-tab').addEventListener('click', () => {
    switchTab('reviews');
    
    // Check if the profile is for an owner or renter and load appropriate reviews
    if (document.getElementById('listings-tab').style.display === 'none') {
        // This means the "User's Listings" tab is hidden, indicating a renter's profile
        displayRenterReviews(userId); // Load renter reviews
    } else {
        // Default to loading owner reviews
        displayOwnerReviews(userId);
    }
});
});



function switchTab(tab) {
    document.querySelectorAll('.tab-title').forEach(title => {
        if (title) {
            title.classList.remove('active');
        }
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        if (content) {
            content.classList.remove('active');
        }
    });

    if (tab === 'machines') {
        const machinesTab = document.getElementById('listings-tab'); // Updated to match HTML
        const ownerMachinesSection = document.getElementById('user-listings-section'); // Updated to match HTML
        if (machinesTab && ownerMachinesSection) {
            machinesTab.classList.add('active');
            ownerMachinesSection.classList.add('active');
        } else {
            console.error('Machines tab or section not found.');
        }
    } else if (tab === 'reviews') {
        const reviewsTab = document.getElementById('reviews-tab');
        const ownerReviewsSection = document.getElementById('user-reviews-section');
        if (reviewsTab && ownerReviewsSection) {
            reviewsTab.classList.add('active');
            ownerReviewsSection.classList.add('active');
        } else {
            console.error('Reviews tab or section not found.');
        }
    }
}



document.querySelectorAll('.filter-star').forEach(star => {
    star.addEventListener('click', () => {
        const rating = parseInt(star.getAttribute('data-rating'));
        document.querySelectorAll('.filter-star').forEach(s => s.classList.remove('active'));
        for (let i = 1; i <= rating; i++) {
            document.querySelector(`.filter-star[data-rating="${i}"]`).classList.add('active');
        }
        
        // Check if the profile is for a renter and call the appropriate function
        if (document.getElementById('listings-tab').style.display === 'none') {
            // Load filtered renter reviews
            displayRenterReviews(userId, rating);
        } else {
            // Load filtered owner reviews
            displayOwnerReviews(userId, rating);
        }
    });
});



// Function to fetch and display owner reviews with optional rating filter
function displayOwnerReviews(ownerId, filterRating = 0) {
    fetch(`${API_BASE_URL}/reviews/owner/${ownerId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch owner reviews');
            }
            return response.json();
        })
        .then(reviews => {
            const reviewContainer = document.getElementById('review-container');
            reviewContainer.innerHTML = ''; // Clear previous content

            if (filterRating > 0) {
                reviews = reviews.filter(review => review.ratings.ownerService === filterRating);
            }

            if (reviews.length === 0) {
                reviewContainer.innerHTML = '<p>No reviews available for this owner.</p>';
                return;
            }

            reviews.forEach(review => {
                const reviewElement = document.createElement('div');
                reviewElement.classList.add('review');
                reviewElement.innerHTML = `
                    <p><strong>${review.reviewerName}</strong> (${new Date(review.createdAt).toLocaleDateString()})</p>
                    <p><strong>Owner Service:</strong> ${generateRatingStars(review.ratings.ownerService)}</p>
                    ${review.comment ? `<p>${review.comment}</p>` : ''}
                `;
                reviewContainer.appendChild(reviewElement);
            });
        })
        .catch(error => {
            console.error('Error fetching owner reviews:', error);
            document.getElementById('review-container').innerHTML = '<p>Error loading reviews. Please try again later.</p>';
        });
}


// Function to fetch and display renter reviews with optional rating filter
function displayRenterReviews(renterId, filterRating = 0) {
    console.log('Fetching reviews for renter ID:', renterId);
    fetch(`${API_BASE_URL}/reviews/renter/${renterId}`)
        .then(response => {
            console.log('Response status:', response.status);
            if (!response.ok) {
                throw new Error('Failed to fetch renter reviews');
            }
            return response.json();
        })
        .then(reviews => {
            console.log('Fetched renter reviews:', reviews); // Log reviews for debugging
            const reviewContainer = document.getElementById('review-container');
            reviewContainer.innerHTML = ''; // Clear previous content

            if (filterRating > 0) {
                reviews = reviews.filter(review => review.rating === filterRating);
            }

            if (reviews.length === 0) {
                reviewContainer.innerHTML = '<p>No reviews available for this renter.</p>';
                return;
            }

            reviews.forEach(review => {
                const reviewElement = document.createElement('div');
                reviewElement.classList.add('review');
                reviewElement.setAttribute('data-rating', review.rating); // Add data-rating attribute for filtering
                
                reviewElement.innerHTML = `
                    <p><strong>${review.reviewerName}</strong> (${new Date(review.review_date).toLocaleDateString()})</p>
                    <p><strong>Communication:</strong> ${generateRatingStars(review.rating)}</p>
                    ${review.comment ? `<p>${review.comment}</p>` : ''}
                `;
                
                reviewContainer.appendChild(reviewElement);
            });
        })
        .catch(error => {
            console.error('Error fetching renter reviews:', error);
            document.getElementById('review-container').innerHTML = '<p>Error loading reviews. Please try again later.</p>';
        });
}

