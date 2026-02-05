// login.js - Pure login logic with NO DOM changes

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔐 Login page loaded');
    
    // Get all elements without modifying them
    const signinButton = document.getElementById('signinbutton');
    const emailInput = document.querySelector('input[type="email"]');
    const passwordInput = document.querySelector('input[type="password"]');
    const candidateRadio = document.getElementById('candidate');
    const recruiterRadio = document.getElementById('recruiter');
    
    // Store current user type
    let currentUserType = 'candidate';
    
    // Track login state without UI changes
    let isLoggingIn = false;
    
    // Initialize user type from radio buttons
    function initUserType() {
        if (recruiterRadio && recruiterRadio.checked) {
            currentUserType = 'admin';
        } else if (candidateRadio && candidateRadio.checked) {
            currentUserType = 'candidate';
        }
    }
    
    // Validate email format
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Handle login button click
    function handleLogin(event) {
        // Prevent default form submission
        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }
        
        // Prevent multiple simultaneous logins
        if (isLoggingIn) {
            return;
        }
        
        console.log('Login initiated');
        
        // Get input values without modifying them
        const email = emailInput ? emailInput.value.trim() : '';
        const password = passwordInput ? passwordInput.value : '';
        
        // Validate inputs
        if (!email || !password) {
            console.error('Validation failed: Missing email or password');
            alert('Please enter both email and password');
            return;
        }
        
        if (!isValidEmail(email)) {
            console.error('Validation failed: Invalid email format');
            alert('Please enter a valid email address');
            return;
        }
        
        // Set login state
        isLoggingIn = true;
        
        // Prepare API request
        const apiUrl = 'http://localhost:3000/api/auth/admin-login';
        const requestBody = {
            email: email,
            password: password,
            userType: currentUserType
        };
        
        console.log('API Request:', {
            url: apiUrl,
            method: 'POST',
            body: requestBody
        });
        
        // Make API call
        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        })
        .then(response => {
            return response.json().then(data => ({
                status: response.status,
                data: data
            }));
        })
        .then(response => {
            console.log('API Response:', response);
            
            if (response.data.success) {
                // Login successful
                console.log('✅ Login successful');
                
                // Store user data in localStorage (not visible in UI)
                if (response.data.user) {
                    localStorage.setItem('user', JSON.stringify(response.data.user));
                }
                
                // Redirect based on user type
                if (currentUserType === 'admin') {
                    window.location.href = 'admin-dashboard.html';
                } else {
                    window.location.href = 'candidate-dashboard.html';
                }
                
            } else {
                // Login failed
                console.error('❌ Login failed:', response.data.error);
                alert(response.data.error || 'Login failed. Please check your credentials.');
                isLoggingIn = false;
            }
        })
        .catch(error => {
            console.error('❌ Network error:', error);
            alert('Cannot connect to server. Please check:\n1. Backend is running on http://localhost:3000\n2. You are using the correct URL');
            isLoggingIn = false;
        });
    }
    
    // Handle user type selection without modifying DOM
    function handleUserTypeSelection() {
        // Update currentUserType based on radio button state
        if (recruiterRadio && recruiterRadio.checked) {
            currentUserType = 'admin';
            console.log('User type set to: admin');
        } else if (candidateRadio && candidateRadio.checked) {
            currentUserType = 'candidate';
            console.log('User type set to: candidate');
        }
    }
    
    // Initialize event listeners
    function initEventListeners() {
        // Add click listener to signin button
        if (signinButton) {
            signinButton.addEventListener('click', handleLogin);
        }
        
        // Add change listeners to radio buttons
        if (candidateRadio) {
            candidateRadio.addEventListener('change', handleUserTypeSelection);
        }
        
        if (recruiterRadio) {
            recruiterRadio.addEventListener('change', handleUserTypeSelection);
        }
        
        // Add Enter key support on inputs
        if (emailInput) {
            emailInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    handleLogin(e);
                }
            });
        }
        
        if (passwordInput) {
            passwordInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    handleLogin(e);
                }
            });
        }
    }
    
    // Initialize the login functionality
    function init() {
        console.log('Initializing login functionality...');
        
        // Initialize user type
        initUserType();
        
        // Initialize event listeners
        initEventListeners();
        
        console.log('✅ Login functionality initialized');
        console.log('Current user type:', currentUserType);
    }
    
    // Check if required elements exist
    function checkRequiredElements() {
        const requiredElements = [
            { name: 'signinButton', element: signinButton },
            { name: 'emailInput', element: emailInput },
            { name: 'passwordInput', element: passwordInput }
        ];
        
        const missingElements = requiredElements.filter(item => !item.element);
        
        if (missingElements.length > 0) {
            console.warn('⚠️ Missing required elements:', missingElements.map(item => item.name));
            return false;
        }
        
        return true;
    }
    
    // Start initialization if all required elements exist
    if (checkRequiredElements()) {
        init();
    } else {
        console.error('❌ Cannot initialize login: Required elements missing');
    }
});