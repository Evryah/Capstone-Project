document.addEventListener("DOMContentLoaded", function() {
    const steps = document.querySelectorAll(".form-step");
    const nextBtn = document.getElementById("nextBtn");
    const prevBtn = document.getElementById("prevBtn");
    const submitBtn = document.getElementById("submit");
    const passwordInput = document.getElementById("Npassword");
    const confirmPasswordInput = document.getElementById("Cpassword");
    const passwordStrengthMessage = document.getElementById('passwordStrengthMessage');
    const passwordMatchMessage = document.getElementById('passwordMatchMessage');
    const passwordStrengthBar = document.getElementById('passwordStrengthBar');
    const strengthBarIndicator = document.createElement('div');
    passwordStrengthBar.appendChild(strengthBarIndicator);
    const referredByContainer = document.getElementById('referredByContainer');

    // Prevent form submission with Enter key, except on submit button
    document.getElementById('registrationForm').addEventListener('keypress', function(event) {
        if (event.key === 'Enter' && event.target.type !== 'submit') {
            event.preventDefault();
        }
    });

    let currentStep = 0;

    function showStep(step) {
        steps.forEach((formStep, index) => {
            formStep.classList.toggle("form-step-active", index === step);
        });
    }

    function validateStep(step) {
        let isValid = true;
        const inputs = steps[step].querySelectorAll('input[required], select[required]');
        const errorMessages = {
            FirstName: 'First Name is required',
            LastName: 'Last Name is required',
            PhoneNumber: 'Phone number must be numeric and exactly 11 digits.',
            Address: 'Address is required',
            registrationType: 'Registration type is required',
            ReferredBy: 'Referred by is required',
            UserName: 'Username is required',
            Npassword: 'Password is required',
            Cpassword: 'Confirm Password is required',
            idType: 'ID Type is required',
            idDocument: 'ID Document is required'
        };
    
        inputs.forEach(input => {
            const errorElement = document.getElementById(`${input.id}Error`);
            
            // Check if the input has a value, or if it's a file input that has no selected file
            if (!input.value || (input.type === 'file' && input.files.length === 0)) {
                input.classList.add('invalid'); 
                errorElement.textContent = errorMessages[input.id] || 'This field is required';
                isValid = false;
            } else {
                input.classList.remove('invalid'); 
                errorElement.textContent = '';
            }
    
            // Additional validation for specific fields
            if (input.id === 'PhoneNumber') {
                const phoneNumber = input.value;
                const phoneNumberPattern = /^\d{11}$/;
                if (!phoneNumberPattern.test(phoneNumber)) {
                    input.classList.add('invalid');
                    errorElement.textContent = errorMessages[input.id];
                    isValid = false;
                } else {
                    input.classList.remove('invalid');
                    errorElement.textContent = '';
                }
            }
        });
    
        return isValid;
    }
    
    function checkPasswordStrength(password) {
        const minLength = 8;
        let strength = 0;
    
        // Clear strength message and bar if the password is empty
        if (!password) {
            passwordStrengthMessage.textContent = ''; 
            strengthBarIndicator.style.width = '0%';   
            strengthBarIndicator.className = '';       
            return false;
        }
    
        // Calculate strength based on length
        if (password.length >= minLength) {
            strength = Math.min((password.length / minLength) * 100, 100);
        }
    
        strengthBarIndicator.style.width = strength + '%';
    
        if (strength < 50) {
            strengthBarIndicator.className = 'strength-weak';
            passwordStrengthMessage.textContent = 'Password strength: Weak';
            passwordStrengthMessage.style.color = 'red';
            return false;
        } else if (strength < 100) {
            strengthBarIndicator.className = 'strength-medium';
            passwordStrengthMessage.textContent = 'Password strength: Medium';
            passwordStrengthMessage.style.color = 'orange';
            return true;
        } else {
            strengthBarIndicator.className = 'strength-strong';
            passwordStrengthMessage.textContent = 'Password strength: Strong';
            passwordStrengthMessage.style.color = 'green';
            return true;
        }
    }
    

    function checkPasswordMatch() {
        if (passwordInput.value === confirmPasswordInput.value) {
            passwordMatchMessage.textContent = '';
            return true;
        } else {
            passwordMatchMessage.textContent = 'Passwords do not match';
            passwordMatchMessage.style.color = 'red';
            return false;
        }
    }

    passwordInput.addEventListener('input', function() {
        checkPasswordStrength(passwordInput.value);
        checkPasswordMatch();
    });

    confirmPasswordInput.addEventListener('input', checkPasswordMatch);

    // Remove the 'invalid' class when input changes to valid
    document.querySelectorAll('input[required], select[required]').forEach(input => {
        input.addEventListener('input', () => {
            if (input.value || (input.type === 'file' && input.files.length > 0)) {
                input.classList.remove('invalid');
                const errorElement = document.getElementById(`${input.id}Error`);
                if (errorElement) {
                    errorElement.textContent = '';
                }
            }
        });
    });

    // Toggle password visibility with eye icons
    document.querySelectorAll('.eye-icon').forEach(icon => {
        icon.addEventListener('click', function() {
            const target = document.getElementById(this.getAttribute('data-target'));
            if (target.type === 'password') {
                target.type = 'text';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            } else {
                target.type = 'password';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            }
        });
    });

  // Event listeners to handle form step validation
nextBtn.addEventListener("click", function() {
    if (validateStep(currentStep)) {
        currentStep++;
        showStep(currentStep);
    }
});

prevBtn.addEventListener("click", function() {
    currentStep--;
    showStep(currentStep);
});

submitBtn.addEventListener('click', function(event) {
    if (!validateStep(currentStep)) {
        event.preventDefault(); 
    }
});

    document.querySelectorAll('input[name="registrationType"]').forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'Owner') {
                referredByContainer.style.display = 'block';
            } else {
                referredByContainer.style.display = 'none';
            }
        });
    });

    function registerUser(event) {
        event.preventDefault(); 
        
        const form = document.getElementById('registrationForm');
        const formData = new FormData(form);
    
        // Map ID Type to the expected backend format
        const idTypeMap = {
            governmentIssued: 'Government-Issued ID',
            barangayResidence: 'Barangay Residence ID',
            cruzianID: 'Cruzian ID'
        };
    
        const rawIdType = formData.get('idType'); 
        const mappedIdType = idTypeMap[rawIdType] || rawIdType; 
    
        // Update the ID Type in the formData to the mapped value
        formData.set('idType', mappedIdType);
    
        // Check password strength and match before submission
        if (!checkPasswordStrength(passwordInput.value)) {
            displayInlineError('Password is too weak.');
            return;
        }
        if (!checkPasswordMatch()) {
            displayInlineError('Passwords do not match.');
            return;
        }
    
        // Determine API base URL dynamically
        const API_BASE_URL = window.location.origin.includes("ngrok")
            ? window.location.origin // Use Ngrok public URL
            : "http://localhost:3000"; // Fallback to localhost
    
        // Perform the fetch request
        fetch(`${API_BASE_URL}/register`, { // Dynamic base URL
            method: 'POST',
            body: formData,
        })
        .then(response => {
            if (!response.ok) throw new Error('Registration failed.');
            return response.json();
        })
        .then(data => {
            displayInlineError(data.message === 'Registration successful' ? 'Registration successful!' : 'Please try again.');
            if (data.redirectPage) {
                window.location.href = data.redirectPage;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            displayInlineError('An error occurred during registration.');
        });
    }
    
    function displayInlineError(message) {
        const errorElement = document.getElementById('error');
        errorElement.textContent = message;
        errorElement.style.color = 'red';
    }
    
    // Attach event listener to the submit button
    submitBtn.addEventListener('click', registerUser);
    
    // Show the first form step
    showStep(currentStep);    
});
