const forgotPasswordForm =
    document.getElementById('forgotPasswordForm');

const emailInput = document.getElementById('email');
const message = document.getElementById('message');
const resetButton = document.getElementById('resetButton');

forgotPasswordForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    message.textContent = '';
    message.className = '';
    resetButton.disabled = true;

    try {
        const response = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                email: emailInput.value.trim()
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || 'Unable to process your request.'
            );
        }

        message.textContent =
            data.message ||
            'If the account exists, password reset instructions will be sent to your email.';

        message.className = 'success';

    } catch (error) {
        message.textContent =
            error.message || 'Unable to connect to server.';
        message.className = 'error';

    } finally {
        resetButton.disabled = false;
    }
});