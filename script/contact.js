const form = document.getElementById('contact-form');
    if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault();
            const recaptchaResponse = grecaptcha.getResponse();
            if (recaptchaResponse.length === 0) {
                alert('Please complete the reCAPTCHA verification.');
                return;
            }
            // Since it's static, just show success message
            alert('Thank you for your message! (This is a static site, so no data is sent.)');
            form.reset();
            grecaptcha.reset();
        });
    }
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('contact-form');
    if (form) {
        form.addEventListener('submit', async function(event) {
            event.preventDefault();
            const recaptchaResponse = grecaptcha.getResponse();
            if (recaptchaResponse.length === 0) {
                alert('Please complete the reCAPTCHA verification.');
                return;
            }

            // Get form data
            const formData = new FormData(form);
            const data = {
                name: formData.get('name'),
                email: formData.get('email'),
                message: formData.get('message')
            };

            try {
                // Send to server
                const response = await fetch('http://localhost:3001/api/contact', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    // Reset form
                    form.reset();
                    grecaptcha.reset();
                    // Show success message
                    alert('Thank you for your message! We will get back to you soon.');
                } else {
                    throw new Error('Failed to send message');
                }
            } catch (error) {
                console.error('Error sending contact form:', error);
                alert('Sorry, there was an error sending your message. Please try again later.');
            }
        });
    }
});
