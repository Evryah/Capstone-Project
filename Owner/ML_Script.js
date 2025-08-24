// Determine API base URL dynamically
const API_BASE_URL = window.location.origin.includes("ngrok")
    ? window.location.origin
    : "http://localhost:3000";
    
// Function to display toast notifications
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


let blockedDates = new Set();
$("#listing-form").submit(function (event) {
    event.preventDefault();  // Prevent form submission

    let category = $("#category").val();
    let title = $("#title").val();
    let description = $("#description").val();
    let pricePerHectare = $("#price-per-hectare").val();
    let percentageRiceGrains = $("#percentage-rice-grains").val();
    let errorMessage = "";

    const files = $("#imageInput")[0].files;

    if (!machineId) {
        // Validation for create mode
        if (!category) {
            errorMessage += "Please select a category.\n";
        }
        if (!title) {
            errorMessage += "Please enter a title for your item.\n";
        }
        if (!description) {
            errorMessage += "Please provide a description for your item.\n";
        }
        if (!pricePerHectare || isNaN(pricePerHectare) || pricePerHectare <= 0) {
            errorMessage += "Please enter a valid price per hectare.\n";
        }
        if (files.length < 2) {
            errorMessage += "Please upload at least 2 images.\n";
        }
    } else {
        // In edit mode, check for existing or uploaded images
        const existingImages = $(`.preview-img`).filter(function() {
            return this.src !== '';
        }).length;
        if (existingImages === 0 && files.length < 2) {
            errorMessage += "Please upload at least 2 images or retain existing images.\n";
        }
    }

    if (percentageRiceGrains && (isNaN(percentageRiceGrains) || percentageRiceGrains < 0)) {
        errorMessage += "Please enter a valid percentage for rice grains (or leave it blank).\n";
    }

    if (errorMessage) {
        alert(errorMessage);
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        alert("You must be logged in to list a machine.");
        window.location.href = 'login.html';
        return;
    }

    // Prepare form data for submission
    const formData = new FormData();
    formData.append("category", category || null);
    formData.append("title", title || null);
    formData.append("description", description || null);
    formData.append("minRentalDays", $("#min-rental-days").val() || null);
    formData.append("quantity", $("#quantity").val() || null);
    formData.append("price_per_hectare", Math.floor(pricePerHectare) || null);

    if (percentageRiceGrains) {
        formData.append("percentage_rice_grains", Math.floor(percentageRiceGrains) || null);
    } else {
        formData.append("percentage_rice_grains", null);
    }

    for (let i = 0; i < files.length && i < 5; i++) {
        formData.append(`image${i + 1}`, files[i]);
    }

    formData.append("blockedDates", JSON.stringify(Array.from(blockedDates)) || null);

    const ajaxUrl = machineId     ? `${API_BASE_URL}/updateMachine/${machineId}` : `${API_BASE_URL}/addMachine`;
    const ajaxType = machineId ? "PUT" : "POST";  // Use PUT for update, POST for create

    $.ajax({
        url: ajaxUrl,
        type: ajaxType,
        headers: { 'Authorization': `Bearer ${token}` },
        data: formData,
        processData: false,
        contentType: false,
        success: function (response) {
            // Redirect to "My Machines" page after success
            window.location.href = 'My_Machine.html';
        },
        error: function (xhr, status, error) {
            console.error('Error Status:', status);
            console.error('Error:', error);
            console.error('Response Text:', xhr.responseText);
            alert("Failed to publish/update listing. Please try again.");
        }
    });
});


// Function to load machine data from server
function loadMachineData(machineId) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert("You must be logged in to edit a machine.");
        window.location.href = '/login.html';
        return;
    }

    $.ajax({
        url: `${API_BASE_URL}/machines/${machineId}`,
        type: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
        success: function (response) {
            console.log('API response:', response);  // Add logging for debugging

            // Ensure the response contains necessary fields
            if (response) {
                $("#category").val(response.category || '');
                $("#title").val(response.title || '');
                $("#description").val(response.description || '');
                $("#min-rental-days").val(response.min_rental_days || 1);
                $("#quantity").val(response.quantity || 1);

                // Set prices without decimal places
                $("#price-per-hectare").val(Math.floor(response.price_per_hectare || 0));
                $("#percentage-rice-grains").val(Math.floor(response.percentage_rice_grains || 0));

                // Update the calendar with blocked dates from the server
                if (response.blockedDates) {
                    const formattedDates = response.blockedDates.map(date => new Date(date).toISOString().split('T')[0]);
                    updateCalendar(formattedDates);
                }

                // Set image previews if images exist
                if (response.images && response.images.length > 0) {
                    response.images.forEach((image, index) => {
                        if (image) {
                            // Sanitize and construct the correct path
                            const sanitizedImage = image
                                .replace(/^\/?uploads\/machine_images\//, '')
                                .replace(/^\/?uploads\//, '');
                            const imagePath = `/uploads/machine_images/${sanitizedImage}`;

                            $(`#preview${index + 1}`).attr('src', imagePath).show();
                            $(`#preview${index + 1}`).closest('.upload-box').addClass('has-image');
                        }
                    });
                }
            } else {
                console.error("No data returned from the server.");
            }
        },
        error: function (xhr, status, error) {
            console.error('Error fetching machine data:', xhr.responseText);
            alert("Failed to load machine data. Please try again.");
        }
    });
}


// Function to get the machineId from the URL (query parameter version)
function getMachineIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');  // Extract the 'id' query parameter
}

// Call this function on page load or when the URL contains a machineId
const machineId = getMachineIdFromURL();
console.log('Extracted machineId:', machineId);  // Log the machineId to check if it's correct
if (machineId) {
    loadMachineData(machineId);
} else {
    console.error('machineId not found in the URL');
}

    

     // Function to display the uploaded image previews
     function updateImagePreviews() {
        const files = document.getElementById('imageInput').files;
        
        for (let i = 0; i < 5; i++) {
            const preview = document.getElementById(`preview${i + 1}`);
            const file = files[i];

            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.src = e.target.result;
                    preview.style.display = 'block';
                    preview.closest('.upload-box').classList.add('has-image');
                };
                reader.readAsDataURL(file);
            } else {
                preview.src = '';
                preview.style.display = 'none';
                preview.closest('.upload-box').classList.remove('has-image');
            }
        }
    }

    // Event listener for image input change
    document.getElementById('imageInput').addEventListener('change', updateImagePreviews);
    // Function to remove the selected image preview
function removeImage(imageIndex) {
    const preview = document.getElementById(`preview${imageIndex}`);
    preview.src = '';  // Clear the image preview
    preview.style.display = 'none';  // Hide the image preview
    preview.closest('.upload-box').classList.remove('has-image');  // Remove the class that indicates an image is present

    // Reset the input field if the first image is removed
    if (imageIndex === 1) {
        document.getElementById('imageInput').value = '';  // Clear the file input
    }
}

    // Initialize calendar components
    const calendarContainer = document.querySelector('.calendar-container');
    const calendarHeader = calendarContainer.querySelector('.calendar-header h3');
    const calendarGrid = calendarContainer.querySelector('.calendar-grid');
    const today = new Date();
    let currentMonth = today.getMonth();
    let currentYear = today.getFullYear();

    // Function to update the calendar with blocked dates
    function updateCalendar(initialBlockedDates = []) {
        blockedDates = new Set(initialBlockedDates.map(dateStr => new Date(dateStr).toISOString().split('T')[0]));
        renderCalendar(currentMonth, currentYear);
    }

    // Function to render the calendar
    function renderCalendar(month, year) {
        calendarGrid.innerHTML = '';

        // Weekdays
        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        weekdays.forEach(day => {
            const weekdayElement = document.createElement('div');
            weekdayElement.classList.add('weekday');
            weekdayElement.textContent = day;
            calendarGrid.appendChild(weekdayElement);
        });

        const firstDay = new Date(year, month).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const options = { year: 'numeric', month: 'long' };
        calendarHeader.textContent = new Date(year, month).toLocaleDateString('en-US', options);

        // Empty cells before the first day of the month
        for (let i = 0; i < firstDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.classList.add('calendar-day', 'empty');
            calendarGrid.appendChild(emptyCell);
        }

        // Calendar days
        for (let day = 1; day <= daysInMonth; day++) {
            const dayCell = document.createElement('div');
            const date = new Date(Date.UTC(year, month, day)); // Use UTC to avoid timezone issues
            dayCell.classList.add('calendar-day');
            dayCell.textContent = day;

            const dateString = date.toISOString().split('T')[0];

            if (blockedDates.has(dateString)) {
                dayCell.classList.add('blocked');
            }

            dayCell.addEventListener('click', () => {
                toggleBlockDate(dateString, dayCell);
            });

            calendarGrid.appendChild(dayCell);
        }
    }

    // Function to toggle block dates
    function toggleBlockDate(dateString, dayCell) {
        if (blockedDates.has(dateString)) {
            blockedDates.delete(dateString);
            dayCell.classList.remove('blocked');
        } else {
            blockedDates.add(dateString);
            dayCell.classList.add('blocked');
        }
    }

    // Calendar navigation buttons
    const prevButton = document.createElement('button');
    prevButton.classList.add('arrow-button');
    prevButton.innerHTML = '&#8592;';
    prevButton.addEventListener('click', (event) => {
        event.preventDefault();  // Prevent form submission
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
    nextButton.addEventListener('click', (event) => {
        event.preventDefault();  // Prevent form submission
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

    renderCalendar(currentMonth, currentYear);  // Initial render of the current month


    document.addEventListener('DOMContentLoaded', function () {
        const userProfileLink = document.getElementById('user-profile-link');
        const userId = localStorage.getItem('userId'); // Ensure 'userId' is stored during login
    
        if (userProfileLink && userId) {
            userProfileLink.href = `OwnerViewProfile.html?id=${encodeURIComponent(userId)}`;
        }
    });
    
    $('.menu-icon').on('click', function() {
        $('#nav-links').toggleClass('active'); // Toggle the "active" class
    });
    $(document).ready(function () {
        $(document).ready(function () {
            // Display the first name of the user
            const firstName = localStorage.getItem('firstName');
            if (firstName) {
                $('#user-name').text(firstName);
            } else {
                // If no user is logged in, redirect to the login page
                window.location.href = '/login.html';
            }
        
                    // Logout button functionality with toast notification
            $('#logout, #mobile-logout').on('click', function (event) {
                event.preventDefault();
                localStorage.clear(); // Clear all stored data
                showToast('Goodbye! Come back anytime.', 3000); // Display toast notification

                // Redirect to login page after showing toast
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 3000);
            });
        });
        
    });
    