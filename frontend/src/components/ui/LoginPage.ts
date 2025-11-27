import { AuthService } from "../game/AuthService";

export class LoginPage {
    private container: HTMLElement | null = null;

    public render(): HTMLElement {
        this.container = document.createElement('div');
        this.container.className = 'container mx-auto p-8 max-w-md fade-in';

        const title = document.createElement('h1');
        title.textContent = 'Login';
        title.className = 'text-4xl font-bold text-white text-center mb-8 gradient-text';

        const form = document.createElement('form');
        form.className = 'glass-effect p-8 rounded-2xl';

        const usernameLabel = document.createElement('label');
        usernameLabel.textContent = 'Username';
        usernameLabel.className = 'block text-white mb-2 font-semibold';

        const usernameInput = document.createElement('input');
        usernameInput.type = 'text';
        usernameInput.required = true;
        usernameInput.placeholder = 'Enter your username';
        usernameInput.className = 'w-full px-4 py-3 rounded-lg bg-game-dark text-white border-2 border-gray-600 focus:border-accent-pink focus:outline-none mb-4';

        const passwordLabel = document.createElement('label');
        passwordLabel.textContent = 'Password';
        passwordLabel.className = 'block text-white mb-2 font-semibold';

        const passwordInput = document.createElement('input');
        passwordInput.type = 'password';
        passwordInput.required = true;
        passwordInput.placeholder = 'Enter your password';
        passwordInput.className = 'w-full px-4 py-3 rounded-lg bg-game-dark text-white border-2 border-gray-600 focus:border-accent-pink focus:outline-none mb-6';

        const errorMsg = document.createElement('p');
        errorMsg.className = 'text-red-500 text-sm mb-4 hidden';

        const submitButton = document.createElement('button');
        submitButton.type = 'submit';
        submitButton.textContent = 'Login';
        submitButton.className = 'btn-primary w-full text-lg py-3';

        const registerLink = document.createElement('p');
        registerLink.className = 'text-center text-gray-300 mt-4';

        const registerText = document.createTextNode("Don't have an account? ");
        const registerAnchor = document.createElement('a');
        registerAnchor.href = '/register';
        registerAnchor.setAttribute('data-link', '');
        registerAnchor.className = 'text-accent-pink hover:text-accent-purple transition-colors duration-300';
        registerAnchor.textContent = 'Register here';
        
        registerLink.appendChild(registerText);
        registerLink.appendChild(registerAnchor);

        form.onsubmit = async (e) => {
            e.preventDefault();
            errorMsg.classList.add('hidden');
            submitButton.disabled = true;
            submitButton.textContent = 'Logging in...';

            try {
                await AuthService.login(usernameInput.value, passwordInput.value);
                window.location.hash = '#/dashboard';
                const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
                if (redirectUrl) {
                    sessionStorage.removeItem('redirectAfterLogin');
                    window.location.href = redirectUrl;
                } else {
                    window.location.href = '/';
                }
            } catch (error: any) {
                errorMsg.textContent = AuthService.extractErrorMessage(error);
                errorMsg.classList.remove('hidden');
                submitButton.disabled = false;
                submitButton.textContent = 'Login';
            }
        };

        form.appendChild(usernameLabel);
        form.appendChild(usernameInput);
        form.appendChild(passwordLabel);
        form.appendChild(passwordInput);
        form.appendChild(errorMsg);
        form.appendChild(submitButton);
        form.appendChild(registerLink);

        this.container.appendChild(title);
        this.container.appendChild(form);

        return this.container;
    }

    public cleanup(): void {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
    }       
}
