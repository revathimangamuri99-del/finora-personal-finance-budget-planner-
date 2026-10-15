const form = document.getElementById('profileForm');
const nameInput = document.getElementById('fullName');
const emailInput = document.getElementById('email');
const displayName = document.getElementById('displayName');
const displayEmail = document.getElementById('displayEmail');
const avatar = document.getElementById('avatar');
const message = document.getElementById('message');
const editButton = document.getElementById('editButton');
const cancelButton = document.getElementById('cancelButton');
const formActions = document.getElementById('formActions');
const logoutButton = document.getElementById('logoutButton');

let originalProfile = null;

// Profile messages
function showMessage(text, type = 'error') {
    message.textContent = text;
    message.className = `message ${type}`;
}

function showProfile(profile) {
    nameInput.value = profile.fullName || '';
    emailInput.value = profile.email || '';

    displayName.textContent = profile.fullName || 'Finora User';
    displayEmail.textContent = profile.email || '';
	loadUserPhoto(profile.email);

    // Text avatar element unte maatrame update cheyyali
    if (avatar) {
        const savedPhoto = localStorage.getItem("finoraProfilePhoto");

        if (!savedPhoto) {
            avatar.textContent = (profile.fullName || 'F')
                .trim()
                .charAt(0)
                .toUpperCase();
        }
    }
}

function setEditing(enabled) {
    nameInput.disabled = !enabled;
    emailInput.disabled = !enabled;
    formActions.hidden = !enabled;
    editButton.hidden = enabled;
}

// Load profile
async function loadProfile() {
    try {
        const response = await fetch('/api/profile', {
            credentials: 'same-origin'
        });

        const data = await response.json();

        if (response.status === 401) {
            window.location.href = '/login.html';
            return;
        }

        if (!response.ok) {
            throw new Error(data.message || 'Could not load profile.');
        }

        originalProfile = {
            fullName: data.fullName,
            email: data.email
        };

        showProfile(originalProfile);
    } catch (error) {
        showMessage(error.message || 'Unable to connect to server.');
    }
}

// Edit profile
editButton.addEventListener('click', () => {
    originalProfile = {
        fullName: nameInput.value,
        email: emailInput.value
    };

    showMessage('');
    setEditing(true);
    nameInput.focus();
});

// Cancel profile editing
cancelButton.addEventListener('click', () => {
    if (originalProfile) {
        showProfile(originalProfile);
    }

    showMessage('');
    setEditing(false);
});

// Update profile
form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    try {
        const response = await fetch('/api/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                fullName: nameInput.value.trim(),
                email: emailInput.value.trim()
            })
        });

        const data = await response.json();

        if (response.status === 401) {
            window.location.href = '/login.html';
            return;
        }

        if (!response.ok) {
            throw new Error(data.message || 'Could not update profile.');
        }

        originalProfile = {
            fullName: data.fullName,
            email: data.email
        };

        showProfile(originalProfile);
        setEditing(false);
        showMessage(data.message || 'Profile updated successfully!', 'success');

    } catch (error) {
        showMessage(error.message || 'Unable to connect to server.');
    }
});

// Logout
logoutButton.addEventListener('click', async () => {
    logoutButton.disabled = true;

    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error('Logout failed. Please try again.');
        }

        window.location.replace('/login.html');

    } catch (error) {
        showMessage(error.message || 'Unable to log out.');
        logoutButton.disabled = false;
    }
});

// Change password elements
const passwordForm = document.getElementById('passwordForm');

const currentPasswordInput = document.getElementById('currentPassword');
const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');

const currentPasswordError = document.getElementById('currentPasswordError');
const newPasswordError = document.getElementById('newPasswordError');
const confirmPasswordError = document.getElementById('confirmPasswordError');
const passwordSuccess = document.getElementById('passwordSuccess');

function clearPasswordMessages() {
    currentPasswordError.textContent = '';
    newPasswordError.textContent = '';
    confirmPasswordError.textContent = '';
    passwordSuccess.textContent = '';
}

function showPasswordError(element, text) {
    element.textContent = text;
}

passwordForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    clearPasswordMessages();

    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Validate new password
    if (newPassword.length < 8) {
        showPasswordError(
            newPasswordError,
            'New password must contain at least 8 characters.'
        );
        newPasswordInput.focus();
        return;
    }

    // Validate confirmation
    if (newPassword !== confirmPassword) {
        showPasswordError(
            confirmPasswordError,
            'New password and confirm password do not match.'
        );
        confirmPasswordInput.focus();
        return;
    }

    try {
        const response = await fetch('/api/profile/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                currentPassword,
                newPassword,
                confirmPassword
            })
        });

        const data = await response.json();

        if (response.status === 401) {
            window.location.href = '/login.html';
            return;
        }

        if (!response.ok) {
            const errorText = data.message || 'Could not change password.';
            const normalizedError = errorText.toLowerCase();

            if (normalizedError.includes('current password')) {
                showPasswordError(currentPasswordError, errorText);
                currentPasswordInput.focus();

            } else if (
                normalizedError.includes('confirm') ||
                normalizedError.includes('match')
            ) {
                showPasswordError(confirmPasswordError, errorText);
                confirmPasswordInput.focus();

            } else if (normalizedError.includes('new password')) {
                showPasswordError(newPasswordError, errorText);
                newPasswordInput.focus();

            } else {
                // Keep all password-related messages in this section.
                showPasswordError(confirmPasswordError, errorText);
            }

            return;
        }

        // Show success only after server confirms the update.
        passwordForm.reset();

        passwordSuccess.textContent =
            'Password updated successfully!';

    } catch (error) {
        showPasswordError(
            confirmPasswordError,
            'Unable to connect to server. Please try again.'
        );
    }
});

// Clear an error when the user edits that field
currentPasswordInput.addEventListener('input', () => {
    currentPasswordError.textContent = '';
});

newPasswordInput.addEventListener('input', () => {
    newPasswordError.textContent = '';
    confirmPasswordError.textContent = '';
    passwordSuccess.textContent = '';
});

confirmPasswordInput.addEventListener('input', () => {
    confirmPasswordError.textContent = '';
    passwordSuccess.textContent = '';
});

// Show / Hide password
document.querySelectorAll('.password-toggle').forEach((button) => {
    button.addEventListener('click', () => {
        const input = document.getElementById(button.dataset.target);

        if (!input) return;

        if (input.type === 'password') {
            input.type = 'text';
            button.textContent = 'Hide';
            button.setAttribute('aria-label', 'Hide password');
        } else {
            input.type = 'password';
            button.textContent = 'Show';
            button.setAttribute('aria-label', 'Show password');
        }
    });
});

const photoInput = document.getElementById("photoInput");
const profilePhoto = document.getElementById("profilePhoto");

let currentPhotoKey = null;

function loadUserPhoto(email) {
    if (!profilePhoto || !email) return;

    currentPhotoKey =
        "finoraProfilePhoto_" + email.trim().toLowerCase();

    const savedPhoto = localStorage.getItem(currentPhotoKey);

    profilePhoto.src = savedPhoto || "/profile.jpeg";
}

if (photoInput && profilePhoto) {
    photoInput.addEventListener("change", function () {
        const file = this.files[0];

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("Please select a valid image.");
            this.value = "";
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            alert("Please select an image smaller than 2 MB.");
            this.value = "";
            return;
        }

        if (!currentPhotoKey) {
            alert("Profile is still loading. Please try again.");
            this.value = "";
            return;
        }

        const reader = new FileReader();

        reader.onload = function (event) {
            try {
                localStorage.setItem(
                    currentPhotoKey,
                    event.target.result
                );

                profilePhoto.src = event.target.result;
            } catch (error) {
                alert("Photo save cheyyalekapoyam. Smaller image try cheyyi.");
            }
        };

        reader.readAsDataURL(file);
    });
}
// Initialize profile
loadProfile();