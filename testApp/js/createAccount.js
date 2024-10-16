document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('createAccountForm');

    form.addEventListener('submit', function (event) {
        event.preventDefault(); // Prevent the default form submission

        // Get form field values
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // Basic validation
        if (username === '' || email === '' || password === '') {
            alert('Please fill in all fields.');
            return;
        }

        // Simple email validation
        const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
        if (!emailPattern.test(email)) {
            alert('Please enter a valid email address.');
            return;
        }

        // Check password length
        if (password.length < 6) {
            alert('Password must be at least 6 characters long.');
            return;
        }

        // Simulate account creation process
        alert(`Account created successfully for ${username}!`);
        form.reset(); // Reset form after submission
    });
});
