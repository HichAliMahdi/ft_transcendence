import { AuthService } from '../game/AuthService';

export class RegisterPage {
    private container: HTMLElement | null = null;

    public render(): HTMLElement {
        this.container = document.createElement('div');
        this.container.className = 'container mx-auto p-8 max-w-md fade-in';

        const title = document.createElement('h1');
        title.textContent = 'Register';
        title.className = 'text-4xl font-bold text-white text-center mb-8 gradient-text';

        const form = document.createElement('form');
        form.className = 'glass-effect p-8 rounded-2xl';

        const usernameLabel = document.createElement('label');
        usernameLabel.textContent = 'Username';
        usernameLabel.className = 'block text-white mb-2 font-semibold';

        const usernameInput = document.createElement('input');
        usernameInput.type = 'text';
        usernameInput.required = true;
        usernameInput.className = 'w-full px-4 py-3 rounded-lg bg-game-dark text-white border-2 border-gray-600 focus:border-accent-pink focus:outline-none mb-4';

        const emailLabel = document.createElement('label');
        emailLabel.textContent = 'Email';
        emailLabel.className = 'block text-white mb-2 font-semibold';

        const emailInput = document.createElement('input');
        emailInput.type = 'email';
        emailInput.required = true;
        emailInput.className = 'w-full px-4 py-3 rounded-lg bg-game-dark text-white border-2 border-gray-600 focus:border-accent-pink focus:outline-none mb-4';

        const displayNameLabel = document.createElement('label');
        displayNameLabel.textContent = 'Display Name';
        displayNameLabel.className = 'block text-white mb-2 font-semibold';

        const displayNameInput = document.createElement('input');
        displayNameInput.type = 'text';
        displayNameInput.required = true;
        displayNameInput.className = 'w-full px-4 py-3 rounded-lg bg-game-dark text-white border-2 border-gray-600 focus:border-accent-pink focus:outline-none mb-4';

        const passwordLabel = document.createElement('label');
        passwordLabel.textContent = 'Password';
        passwordLabel.className = 'block text-white mb-2 font-semibold';

        const passwordInput = document.createElement('input');
        passwordInput.type = 'password';
        passwordInput.required = true;
        passwordInput.className = 'w-full px-4 py-3 rounded-lg bg-game-dark text-white border-2 border-gray-600 focus:border-accent-pink focus:outline-none mb-6';

        const errorMsg = document.createElement('p');
        errorMsg.className = 'text-red-500 text-sm mb-4 hidden';

        const submitButton = document.createElement('button');
        submitButton.type = 'submit';
        submitButton.textContent = 'Register';
        submitButton.className = 'btn-primary w-full text-lg py-3';

        const loginLink = document.createElement('p');
        loginLink.className = 'text-white text-center mt-4';
        const loginText = document.createTextNode('Already have an account? ');
        const loginAnchor = document.createElement('a');
        loginAnchor.href = '/login';
        loginAnchor.setAttribute('data-link', '');
        loginAnchor.className = 'text-accent-pink font-semibold';
        loginAnchor.textContent = 'Login';
        loginLink.appendChild(loginText);
        loginLink.appendChild(loginAnchor);

        form.onsubmit = async (e) => {
            e.preventDefault();
            errorMsg.classList.add('hidden');
            submitButton.disabled = true;
            submitButton.textContent = 'Registering...';

            const pwd = passwordInput.value;
            const hasUpper = /[A-Z]/.test(pwd);
            const hasNumber = /\d/.test(pwd);
            const hasSpecial = /[!@#$%^&*(),.?":{}|<>\\\/\[\];'`~_\-+=]/.test(pwd);
            if (pwd.length < 8 || !hasUpper || !hasNumber || !hasSpecial) {
                errorMsg.textContent = 'Password must be at least 8 characters and include one uppercase letter, one number and one special character';
                errorMsg.classList.remove('hidden');
                submitButton.disabled = false;
                submitButton.textContent = 'Register';
                return;
            }

            try {
                await AuthService.register(
                    usernameInput.value,
                    emailInput.value,
                    passwordInput.value,
                    displayNameInput.value
                );
                window.location.hash = '#/dashboard';
            } catch (error: any) {
                errorMsg.textContent = error.message;
                errorMsg.classList.remove('hidden');
                submitButton.disabled = false;
                submitButton.textContent = 'Register';
            }
        };

        form.appendChild(usernameLabel);
        form.appendChild(usernameInput);
        form.appendChild(emailLabel);
        form.appendChild(emailInput);
        form.appendChild(displayNameLabel);
        form.appendChild(displayNameInput);
        form.appendChild(passwordLabel);
        form.appendChild(passwordInput);
        form.appendChild(errorMsg);
        form.appendChild(submitButton);
        form.appendChild(loginLink);

        this.container.appendChild(title);
        this.container.appendChild(form);

        return this.container;
    }
}
