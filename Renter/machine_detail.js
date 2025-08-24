// Determine API base URL dynamically
const API_BASE_URL = window.location.origin.includes("ngrok")
    ? window.location.origin
    : "http://localhost:3000";


document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const machineId = urlParams.get('id');
    console.log(`Fetching details for machine ID: ${machineId}`);
    const modal = document.createElement('div');
    modal.id = 'calendar-modal';
    modal.classList.add('modal');
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
        </div>
    `;
    document.body.appendChild(modal); // Append modal to the body
    const modalContent = modal.querySelector('.modal-content');
    const closeModal = modal.querySelector('.close');
    const floatingBtn = document.querySelector('.floating-btn');
    const desktopContainer = document.querySelector('.right-section'); // Original container for calendar
    const pricingContainer = document.querySelector('.pricing-container'); // Rental rates section

    // Calendar variables
    const calendarContainer = document.querySelector('.calendar-container');
    const calendarHeader = calendarContainer.querySelector('.calendar-header h3');
    const calendarGrid = calendarContainer.querySelector('.calendar-grid');
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset hours to ensure only date is compared
    let currentMonth = today.getMonth();
    let currentYear = today.getFullYear();
    let fullyBookedDates = [];  // Will be populated dynamically
    let startDate = null;  // Declare startDate here to ensure it's accessible in all functions
    let endDate = null;    // End date of the selected range
    let minRentalDays = 1;  // Initialize minRentalDays with a default value of 2 days
    

         // Function to move the calendar and pricing to the modal in responsive mode
    function moveCalendarAndPricingToModal() {
        modalContent.appendChild(calendarContainer); // Move calendar to modal
        modalContent.appendChild(pricingContainer); // Move rental rates to modal
        modal.style.display = 'flex'; // Show modal
        calendarContainer.style.display = 'block'; // Ensure calendar is visible
        pricingContainer.style.display = 'block'; // Ensure rental rates are visible
    }

    // Function to return the calendar and pricing to the original position
    function returnCalendarAndPricingToPage() {
        desktopContainer.appendChild(calendarContainer); // Return calendar to original container
        desktopContainer.appendChild(pricingContainer); // Return rental rates to original container
        modal.style.display = 'none'; // Hide modal
        if (window.innerWidth <= 768) {
            calendarContainer.style.display = 'none'; // Hide calendar in original place in mobile
            pricingContainer.style.display = 'none'; // Hide rental rates in original place in mobile
        }
    }

    // Open modal when floating button is clicked in responsive mode
    floatingBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (window.innerWidth <= 768) {
            moveCalendarAndPricingToModal(); // Move calendar and rental rates to modal on button click
        }
    });

    // Close modal when close button is clicked
    closeModal.addEventListener('click', function () {
        modal.style.display = 'none'; // Hide modal
    });

    // Close modal if the user clicks outside the modal content
    window.addEventListener('click', function (event) {
        if (event.target === modal) {
            modal.style.display = 'none'; // Close modal when clicking outside content
        }
    });

    // Ensure calendar and pricing return to the desktop layout when resizing back
    window.addEventListener('resize', function () {
        if (window.innerWidth > 768) {
            returnCalendarAndPricingToPage(); // Return calendar and rental rates to original container on desktop
        }
    });

    // On initial load, determine where the calendar and rental rates should be based on screen size
    if (window.innerWidth <= 768) {
        moveCalendarAndPricingToModal(); // Move calendar and rental rates to modal if in mobile view on load
    } else {
        returnCalendarAndPricingToPage(); // Keep calendar and rental rates on the page in desktop view
    }

    
    // Function to update the calendar with blocked dates
    function updateCalendar(blockedDates) {
        if (blockedDates) {
            fullyBookedDates = blockedDates.map(dateStr => {
                return new Date(dateStr).toISOString().split('T')[0]; // Store as 'YYYY-MM-DD' format
            });
        }
        renderCalendar(currentMonth, currentYear);
    }
    

    function renderCalendar(month, year) {
        // Remove previous date cells but leave the weekday headers intact
        const dayCells = calendarGrid.querySelectorAll('.calendar-day, .empty');
        dayCells.forEach(cell => cell.remove());
    
        const firstDay = new Date(year, month).getDay(); // First day of the month (0 = Sunday)
        const daysInMonth = new Date(year, month + 1, 0).getDate(); // Number of days in the current month
    
        const options = { year: 'numeric', month: 'long' };
        calendarHeader.textContent = new Date(year, month).toLocaleDateString('en-US', options);
    
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.classList.add('calendar-day', 'empty');
            calendarGrid.appendChild(emptyCell);
        }
    
        // Add the days in the current month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayCell = document.createElement('div');
            const dateStr = new Date(year, month, day).toISOString().split('T')[0]; // 'YYYY-MM-DD'
            const dateObj = new Date(year, month, day); // Create Date object and ensure it's in local time
            dayCell.classList.add('calendar-day');
            dayCell.textContent = day;
    
            // Check if the date is blocked
            if (fullyBookedDates.includes(dateStr)) {
                dayCell.classList.add('blocked');
            }
    
            // Check if the date is in the past
            if (dateObj < today) {
                dayCell.classList.add('past');
            }
    
            // Check if the date is the start date
            if (startDate && dateObj.getTime() === startDate.getTime()) {
                dayCell.classList.add('selected'); // Mark start date
            }
    
            // Check if the date is the end date
            if (endDate && dateObj.getTime() === endDate.getTime()) {
                dayCell.classList.add('selected'); // Mark end date
            }
    
            // Check if the date is in the selected range
            if (startDate && endDate && dateObj > startDate && dateObj < endDate) {
                dayCell.classList.add('range');
            }
    
            // Add click event listener to handle date selection
            dayCell.addEventListener('click', () => {
                if (!dayCell.classList.contains('blocked') && !dayCell.classList.contains('past')) {
                    handleDateSelection(dateObj); // Pass the date object for selection
                }
            });
    
            calendarGrid.appendChild(dayCell);
        }
    }

    function handleDateSelection(selectedDate) {
        // Ensure the selected date is set to local midnight to avoid timezone shifts
        selectedDate.setHours(0, 0, 0, 0);
    
        if (!(selectedDate instanceof Date) || isNaN(selectedDate.getTime())) {
            console.error('Invalid date selected:', selectedDate);
            alert('Invalid date selected. Please choose a valid date.');
            return;
        }
    
        // Define locale and options for formatting the date as 'Saturday, October 5, 2024'
        const locale = 'en-US';
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    
        const selectedDateString = selectedDate.toLocaleDateString(locale, dateOptions); // Format date
    
        if (!startDate) {
            // Set the start date
            startDate = new Date(selectedDate); // Ensure startDate is set to local midnight
            document.querySelector('#start-date').textContent = selectedDateString;
            endDate = null; // Reset end date
            document.querySelector('#end-date').textContent = 'Not selected';
        } else if (!endDate && selectedDate > startDate) {
            // Set the end date if it's after the start date
            endDate = new Date(selectedDate); // Ensure endDate is set to local midnight
    
            const daysToSelect = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)); // Calculate number of days
    
            if (daysToSelect >= minRentalDays) {
                const selectedDates = selectDateRange(startDate, endDate); // Get selected date range
    
                // Ensure all selected dates are valid (not blocked)
                if (selectedDates.every(d => !fullyBookedDates.includes(d.toISOString().split('T')[0]))) {
                    document.querySelector('#end-date').textContent = endDate.toLocaleDateString(locale, dateOptions); // Display formatted end date
                } else {
                    alert('Some selected dates are blocked. Please choose another range.');
                    resetSelection();
                }
            } else {
                alert(`Please select at least ${minRentalDays} days.`);
                resetSelection();
            }
        } else {
            // Reset if the selection is invalid
            resetSelection();
            startDate = new Date(selectedDate); // Start new selection
            document.querySelector('#start-date').textContent = selectedDateString;
        }
    
        // Re-render the calendar to update the selected dates visually
        renderCalendar(currentMonth, currentYear);
    }
        
    // Function to reset date selection
    function resetSelection() {
        startDate = null;
        endDate = null;
        document.querySelector('#start-date').textContent = 'Not selected';
        document.querySelector('#end-date').textContent = 'Not selected';
    }

    // Function to select a date range
    function selectDateRange(startDate, endDate) {
        const dateRange = [];
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            dateRange.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return dateRange;
    }

    // Function to initialize calendar setup
    function setupCalendar() {
        renderCalendar(currentMonth, currentYear); // Initial render of the current month

        const prevButton = document.createElement('button');
        prevButton.classList.add('arrow-button');
        prevButton.innerHTML = '&#8592;';
        prevButton.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            renderCalendar(currentMonth, currentYear);
        });

        const nextButton = document.createElement('button');
        nextButton.classList.add('arrow-button');
        nextButton.innerHTML = '&#8594;';
        nextButton.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            renderCalendar(currentMonth, currentYear);
        });

        const navContainer = document.createElement('div');
        navContainer.classList.add('calendar-navigation');
        navContainer.appendChild(prevButton);
        navContainer.appendChild(nextButton);
        calendarContainer.insertBefore(navContainer, calendarGrid);
    }

    // Fetch machine details from the backend
    fetch(`${API_BASE_URL}/machines/${machineId}`)
        .then(response => {
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Machine not found');
                } else {
                    throw new Error('An error occurred while fetching machine details');
                }
            }
            return response.json();
        })
        .then(machine => {
            console.log('Fetched machine:', machine);
           // Store blocked dates as ISO strings, but format for display using `toLocaleDateString()`
        if (machine.blockedDates && machine.blockedDates.length > 0) {
            fullyBookedDates = machine.blockedDates.map(dateStr => {
                return new Date(dateStr).toISOString().split('T')[0];  // Store as 'YYYY-MM-DD'
            });
            const formattedBlockedDates = machine.blockedDates.map(dateStr => {
                return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            });
            console.log('Blocked Dates for Display:', formattedBlockedDates);
        } else {
            console.log('No blocked dates found for this machine.');
        }

            // Now log and use booked dates properly
            if (machine.bookedDates && machine.bookedDates.length > 0) {
                machine.bookedDates.forEach(booking => {
                    console.log(`Start Date: ${new Date(booking.startDate).toLocaleDateString('en-US')}`);
                    console.log(`End Date: ${new Date(booking.endDate).toLocaleDateString('en-US')}`);
                });
            } else {
                console.log('No booked dates found for this machine.');
            }
            
        // Set the price per hectare with the Peso symbol and include decimals
document.getElementById('price-per-hectare').textContent = `₱${parseFloat(machine.price_per_hectare).toFixed(2)}`;


            // Set the percentage for rice grains and remove decimals
            document.getElementById('percentage-rice-grains').textContent = `${Math.floor(machine.percentage_rice_grains)}%`;

            // Set up other machine details
                const mainImage = document.getElementById('main-image');

                // Sanitize and construct the image path correctly
                const sanitizedMainImage = machine.image1
                    ? machine.image1.replace(/^\/?uploads\/machine_images\//, '').replace(/^\/?uploads\//, '')
                    : 'default-machine-image.jpg';

                    mainImage.src = `${API_BASE_URL}/uploads/machine_images/${sanitizedMainImage}`;

                // Handle image loading error
                mainImage.onerror = function () {
                    mainImage.style.display = 'none';
                    document.getElementById('image-error').textContent = 'Image not available.';
                };

            
              // Ensure `ownerBarangay` is correctly assigned from the `machine` object
        const ownerBarangay = machine.ownerBarangay || '';  // Safely assign from the fetched machine data
        const ownerAddress = machine.ownerAddress || 'Address not available';

        const ownerServiceRating = machine.ownerServiceRating || 0; // Default to 0 if no rating
        document.getElementById('owner-service-rating').innerHTML = renderStars(ownerServiceRating); // Render stars


        
        // Combine `barangay` with `address`
        const ownerFullAddress = `${ownerBarangay ? ownerBarangay + ', ' : ''}${ownerAddress}`.trim();

        // Display `ownerFullAddress`
        document.getElementById('owner-response-time').textContent = ownerFullAddress || 'Address not available'


            document.getElementById('machine-category').textContent = machine.category || 'Unknown Category';
            document.getElementById('machine-title').textContent = machine.title || 'No title available';
            document.getElementById('machine-description').innerHTML = machine.description.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;') || '';
            document.getElementById('owner-name').textContent = machine.ownerFullName || 'Unknown';
            document.getElementById('owner-response-time').textContent = ownerFullAddress || 'Address not available';
            document.getElementById('location').textContent = machine.ownerPhoneNumber || 'Unknown';
            document.getElementById('owner-full-name').textContent = machine.ownerFullName || 'this owner';

            // Set minRentalDays based on fetched data
            minRentalDays = machine.min_rental_days || minRentalDays;

          // Handle image thumbnails for the fetched machine details
const thumbnailContainer = document.getElementById('thumbnail-container');
thumbnailContainer.innerHTML = '';

if (Array.isArray(machine.images) && machine.images.length > 0) {
    machine.images.forEach(image => {
        if (image) {
            // Sanitize and construct the image path correctly
            const sanitizedImage = image
                .replace(/^\/?uploads\/machine_images\//, '')
                .replace(/^\/?uploads\//, '');
            
            // Construct the final path for the image
           const imagePath = `${API_BASE_URL}/uploads/machine_images/${sanitizedImage}`;
            
            const imgElement = document.createElement('img');
            imgElement.src = imagePath;
            imgElement.classList.add('thumbnail-image');
            imgElement.onclick = () => {
                mainImage.src = imgElement.src;
            };
            imgElement.onerror = function () {
                imgElement.remove();
            };
            thumbnailContainer.appendChild(imgElement);
        }
    });
} else {
    const noImagesMessage = document.createElement('p');
    noImagesMessage.textContent = 'No images available.';
    thumbnailContainer.appendChild(noImagesMessage);
}


            

            function renderStars(rating) {
                let starsHTML = '';
                const maxStars = 5;
                
                // Loop through each star slot (1-5)
                for (let i = 1; i <= maxStars; i++) {
                    if (i <= rating) {
                        starsHTML += '<span class="fa fa-star checked"></span>'; // Full star for rating >= i
                    } else {
                        starsHTML += '<span class="fa fa-star"></span>'; // Empty star for rating < i
                    }
                }
            
                return starsHTML;
            }
            
            
            if (Array.isArray(machine.reviews)) {
                const reviewsContainer = document.getElementById('reviews-container');
                reviewsContainer.innerHTML = ''; // Clear previous reviews
            
                machine.reviews.forEach(review => {
                    const reviewElement = document.createElement('div');
                    reviewElement.classList.add('review-card');
                    reviewElement.innerHTML = `
                        <div class="review-header">
                            <img src="path-to-profile-picture.jpg" alt="Reviewer" class="review-profile-picture">
                            <div class="review-info">
                                <strong class="reviewer-name">${review.user || 'Anonymous'}</strong>
                                <span class="review-date">${new Date(review.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <div class="review-content">
                            <div class="review-ratings">
                                <p>Machine & Operator Performance: ${renderStars(review.machineOperatorPerformanceRating || 0)} ${review.machineOperatorPerformanceRating ? `${review.machineOperatorPerformanceRating}/5` : 'N/A'}</p>
                            </div>
                            <p class="review-comment">${review.comment || 'No comments provided'}</p>
                        </div>
                        <div class="review-images">
                            ${review.reviewImage1 ? `<a href="${review.reviewImage1}" data-lightbox="review-images" data-title="Review Image 1">
                                <img src="${review.reviewImage1}" alt="Review Image 1" class="review-thumbnail" onerror="this.style.display='none'">
                            </a>` : ''}
                            ${review.reviewImage2 ? `<a href="${review.reviewImage2}" data-lightbox="review-images" data-title="Review Image 2">
                                <img src="${review.reviewImage2}" alt="Review Image 2" class="review-thumbnail" onerror="this.style.display='none'">
                            </a>` : ''}
                            ${review.reviewImage3 ? `<a href="${review.reviewImage3}" data-lightbox="review-images" data-title="Review Image 3">
                                <img src="${review.reviewImage3}" alt="Review Image 3" class="review-thumbnail" onerror="this.style.display='none'">
                            </a>` : ''}
                        </div>
                    `;
                    reviewsContainer.appendChild(reviewElement);
                });
            } else {
                document.getElementById('reviews-container').innerHTML = '<p>No reviews available for this machine.</p>';
            }
            

// Function to render full stars based on the rating
function renderStars(rating) {
    let starsHTML = '';
    const maxStars = 5;

    for (let i = 1; i <= maxStars; i++) {
        if (i <= rating) {
            starsHTML += '<span class="fa fa-star checked"></span>'; // Full star
        } else {
            starsHTML += '<span class="fa fa-star"></span>'; // Empty star
        }
    }

    return starsHTML;
}

// Fetch more listings from the same owner
fetch(`${API_BASE_URL}/machines/owner/${machine.ownerId}/listings?exclude=${machineId}`)
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => { throw new Error(text) });
        }
        return response.json();
    })
    .then(listings => {
        console.log('Fetched listings:', listings);
        const moreListingsContainer = document.getElementById('more-listings-container');
        moreListingsContainer.innerHTML = ''; // Clear previous listings

        if (listings && listings.length > 0) {
            listings.forEach(listing => {
                const machineCard = document.createElement('div');
                machineCard.classList.add('machine-card');

                const cardLink = document.createElement('a');
                cardLink.href = `machine_detail.html?id=${machine.id}`;
                cardLink.classList.add('card-link');

                // Generate stars dynamically based on average rating
                const ratingHTML = renderStars(listing.averageRating);

                                // Ensure the image path is sanitized and constructed correctly
                const sanitizedImage = listing.image
                ? listing.image.replace(/^\/?uploads\/machine_images\//, '').replace(/^\/?uploads\//, '')
                : 'default-machine-image.jpg';

                // Construct the final image path
                const imagePath = `${API_BASE_URL}/uploads/machine_images/${sanitizedImage}`;


                cardLink.innerHTML = `
                   <img src="${imagePath}" alt="${listing.title}">
                    <div class="rating">
                        ${ratingHTML}
                    </div>
                    <div class="price">₱${listing.price_per_hectare ? Math.floor(listing.price_per_hectare) : 'N/A'}</div>
                    <div class="name">${listing.title}</div>
                `;

                machineCard.appendChild(cardLink);
                moreListingsContainer.appendChild(machineCard);
            });
        } else {
            moreListingsContainer.innerHTML = '<p>No other listings available.</p>';
        }
    })
    .catch(error => {
        console.error('Error fetching more listings:', error);
        const moreListingsContainer = document.getElementById('more-listings-container');
        moreListingsContainer.innerHTML = `<p>Error loading more listings: ${error.message}</p>`;
    });

            setupCalendar();
            updateCalendar(machine.blockedDates);
        })
        .catch(error => {
            console.error('Error fetching machine details:', error);
            document.getElementById('machine-title').textContent = error.message;
        });

        function handleBookingRequest() {
            const startDate = new Date(document.getElementById('start-date').textContent);
            const endDate = new Date(document.getElementById('end-date').textContent);
        
            // Use 'en-CA' locale to ensure YYYY-MM-DD format in local time
            const formattedStartDate = new Date(startDate).toLocaleDateString('en-CA');
            const formattedEndDate = new Date(endDate).toLocaleDateString('en-CA');
        
            // Log formatted dates to check if they are correct
            console.log("Formatted Start Date:", formattedStartDate);
            console.log("Formatted End Date:", formattedEndDate);
        
            const machineTitle = document.getElementById('machine-title').textContent;
            const ownerName = document.getElementById('owner-name').textContent;
            const ownerPhone = document.getElementById('location').textContent;

       // Get ownerBarangay and ownerAddress safely from the DOM or data source
       const ownerBarangay = document.getElementById('owner-barangay') ? document.getElementById('owner-barangay').textContent : '';
       const ownerAddress = document.getElementById('owner-response-time').textContent || 'Address not available';
   
       // Combine `barangay` with `address` safely
       const ownerFullAddress = `${ownerBarangay ? ownerBarangay + ', ' : ''}${ownerAddress}`.trim();
   
       // Use the `ownerFullAddress` in the function
       console.log("Owner Full Address:", ownerFullAddress);

            const machineCategory = document.getElementById('machine-category').textContent;
            const machineId = new URLSearchParams(window.location.search).get('id');
        
            // Validation for startDate, endDate, and machineCategory
            if (!formattedStartDate || formattedStartDate === 'Not selected') {
                alert('Please select a start date.');
                return;x
            }
        
            if (!formattedEndDate || formattedEndDate === 'Not selected') {
                alert('Please select an end date.');
                return;
            }
        
            const userId = localStorage.getItem('userId');
            if (!userId) {
                alert("User ID not found. Please log in.");
                return;
            }
        
            // Capture renter's information (Replace with actual inputs if any)
            const renterFirstName = "Ping";  // Replace with actual input/variable
            const renterLastName = "Pong";  // Replace with actual input/variable
            const renterAddress = "Lorem Ipsum Generator";  // Replace with actual input/variable
            const renterPhone = "09264906925";  // Replace with actual input/variable
            const renterFullName = `${renterFirstName} ${renterLastName}`;
        
            // Generate a random Booking ID
            const bookingId = Math.floor(Math.random() * 10000);  // Generate a random 9-digit number
        
            // Add the current date when the booking is created
            const createdAt = new Date().toLocaleDateString('en-US');
        
            // Store booking data in sessionStorage, including the Booking ID and machineId
            const bookingData = {
                bookingId,
                startDate,
                endDate,
                machineTitle,
                ownerName,
                ownerPhone,
                ownerAddress: ownerFullAddress,  // Updated to include `ownerFullAddress`
                machineCategory,
                renterFullName,
                renterAddress,
                renterPhone,
                machineId,
                createdAt,
                userId
            };
        
            // Store booking data in sessionStorage
            sessionStorage.setItem('bookingData', JSON.stringify(bookingData));
        
            // Redirect to booking details page in the Renter folder
            window.location.href = `RBookingDetails.html?bookingId=${bookingId}`;

            // Ensure all instances consistently redirect to the correct path
            window.location.href = 'RBookingDetails.html';
        }
        
    // Attach the function to the "Send Request" button
    document.querySelector('.send-request').addEventListener('click', handleBookingRequest);

    // Logout functionality
    document.getElementById('logout').addEventListener('click', function () {
        localStorage.removeItem('token');
        localStorage.removeItem('firstName');
        alert("You have been logged out.");
        window.location.href = "/login.html";
    });

    function checkLoginStatus() {
        const token = localStorage.getItem('token');
        const firstName = localStorage.getItem('firstName');
    
        if (!token) {
            console.error('No token found, user is not logged in.');
            alert('Please log in to view this page.');
            window.location.href = '/login.html';  // Redirect to login page
            return;
        }
    
        if (firstName) {
            updateUIWithUserName(firstName);
        } else {
            console.error('No user information found.');
        }
    }
    
    function updateUIWithUserName(firstName) {
        const userNameSpan = document.getElementById('user-name');
        if (userNameSpan) {
            userNameSpan.textContent = firstName;
            userNameSpan.style.display = 'inline-block';
        }
    }
    

    checkLoginStatus();

    
   // Toggle the mobile menu
   const menuIcon = document.querySelector('.menu-icon');
   const navLinks = document.getElementById('nav-links');
   const mobileLogout = document.getElementById('mobile-logout');

   menuIcon.addEventListener('click', function () {
       navLinks.classList.toggle('active');
   });

   // Logout functionality for mobile
   mobileLogout.addEventListener('click', function (e) {
       e.preventDefault(); // Prevent the default link behavior
       localStorage.removeItem('token');
       localStorage.removeItem('firstName');
       alert("You have been logged out.");
       window.location.href = "/login.html"; // Redirect to login page
   });

    // Arrow navigation functionality for "More listings" section
    const leftArrow = document.getElementById('left-arrow');
    const rightArrow = document.getElementById('right-arrow');
    const listingsContainer = document.getElementById('more-listings-container');

    leftArrow.addEventListener('click', () => {
        listingsContainer.scrollLeft -= 300;
    });

    rightArrow.addEventListener('click', () => {
        listingsContainer.scrollLeft += 300;
    });
});

