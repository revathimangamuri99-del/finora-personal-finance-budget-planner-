function setMessage(element, text, kind = 'error') {
    if (!element) return;
    element.textContent = text;
    element.className = `form-message ${kind}`;
}

// Show/hide password
document.querySelectorAll('.eye-button').forEach((button) => {
    button.addEventListener('click', () => {
        const input = document.getElementById(button.dataset.target);
        if (!input) return;

        const reveal = input.type === 'password';
        input.type = reveal ? 'text' : 'password';
        button.setAttribute(
            'aria-label',
            reveal ? 'Hide password' : 'Show password'
        );
        button.textContent = reveal ? '◎' : '◉';
    });
});

// SIGNUP
const signupForm = document.getElementById('signupForm');

if (signupForm) {
    signupForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const name = document.getElementById('fullName');
        const email = document.getElementById('signupEmail');
        const password = document.getElementById('signupPassword');
        const confirm = document.getElementById('confirmPassword');
        const terms = document.getElementById('agreeTerms');
        const message = document.getElementById('signupMessage');

        if (name.value.trim().length < 2) {
            setMessage(message, 'Please enter your full name.');
            name.focus();
            return;
        }

        if (!email.value.trim() || !email.checkValidity()) {
            setMessage(message, 'Please enter a valid email address.');
            email.focus();
            return;
        }

        if (password.value.length < 8) {
            setMessage(message, 'Use a password with at least 8 characters.');
            password.focus();
            return;
        }

        if (password.value !== confirm.value) {
            setMessage(message, 'Passwords do not match. Please try again.');
            confirm.focus();
            return;
        }

        if (!terms.checked) {
            setMessage(message, 'Please tick the checkbox to continue.');
            terms.focus();
            return;
        }

        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    fullName: name.value.trim(),
                    email: email.value.trim(),
                    password: password.value
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Signup failed.');
            }

            setMessage(
                message,
                'Account created successfully! Please log in.',
                'success'
            );

            signupForm.reset();

        } catch (error) {
            setMessage(
                message,
                error.message || 'Unable to connect to server.'
            );
        }
    });
}

// LOGIN
const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const email = document.getElementById('email');
        const password = document.getElementById('password');
        const message = document.getElementById('loginMessage');

        if (!email.value.trim() || !email.checkValidity()) {
            setMessage(message, 'Please enter a valid email address.');
            email.focus();
            return;
        }

        if (password.value.length < 6) {
            setMessage(message, 'Password must contain at least 6 characters.');
            password.focus();
            return;
        }

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    email: email.value.trim(),
                    password: password.value
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed.');
            }

            setMessage(message, 'Login successful!', 'success');

            // Change this path if your dashboard has a different filename.
            window.location.href = '/index.html';

        } catch (error) {
            setMessage(
                message,
                error.message || 'Unable to connect to server.'
            );
        }
    });
}

// Forgot password
const forgot = document.getElementById('forgotPassword');

if (forgot) {
    forgot.addEventListener('click', (event) => {
        event.preventDefault();

        setMessage(
            document.getElementById('loginMessage'),
            'Password reset is not available yet.',
            'success'
        );
    });
}