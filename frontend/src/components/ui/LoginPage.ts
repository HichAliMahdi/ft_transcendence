import { AuthService } from "../game/AuthService";

export class LoginPage {
    private container: HTMLElement | null = null;
    // private tempToken: string | null = null; // For 2FA stage

    public render(): HTMLElement {
        this.container = document.createElement('div');
        this.container.className = 'container mx-auto p-8 max-w-md fade-in';

        // Title
        const title = document.createElement('h1');
        title.textContent = 'Login';
        title.className = 'text-4xl font-bold text-white text-center mb-8 gradient-text';

        // Form
        const form = document.createElement('form');
        form.className = 'glass-effect p-8 rounded-2xl';

        // Username
        const usernameLabel = document.createElement('label');
        usernameLabel.textContent = 'Username';
        usernameLabel.className = 'block text-white mb-2 font-semibold';
        const usernameInput = document.createElement('input');
        usernameInput.type = 'text';
        usernameInput.required = true;
        usernameInput.placeholder = 'Enter your username';
        usernameInput.className = 'w-full px-4 py-3 rounded-lg bg-game-dark text-white border-2 border-gray-600 focus:border-accent-pink focus:outline-none mb-4';

        // Password
        const passwordLabel = document.createElement('label');
        passwordLabel.textContent = 'Password';
        passwordLabel.className = 'block text-white mb-2 font-semibold';
        const passwordInput = document.createElement('input');
        passwordInput.type = 'password';
        passwordInput.required = true;
        passwordInput.placeholder = 'Enter your password';
        passwordInput.className = 'w-full px-4 py-3 rounded-lg bg-game-dark text-white border-2 border-gray-600 focus:border-accent-pink focus:outline-none mb-6';

        // 2FA Input (hidden initially)
        const twofaLabel = document.createElement('label');
        twofaLabel.textContent = '2FA Code';
        twofaLabel.className = 'block text-white mb-2 font-semibold hidden';
        const twofaInput = document.createElement('input');
        twofaInput.type = 'text';
        twofaInput.placeholder = 'Enter your 2FA code';
        twofaInput.className = 'w-full px-4 py-3 rounded-lg bg-game-dark text-white border-2 border-gray-600 focus:border-accent-pink focus:outline-none mb-4 hidden';

        // Error message
        const errorMsg = document.createElement('p');
        errorMsg.className = 'text-red-500 text-sm mb-4 hidden';

        // Submit Button
        const submitButton = document.createElement('button');
        submitButton.type = 'submit';
        submitButton.textContent = 'Login';
        submitButton.className = 'btn-primary w-full text-lg py-3';

        const guestButton = document.createElement('button');
        guestButton.type = 'submit';
        guestButton.textContent = 'Play as guest';
        guestButton.className = 'btn-primary w-full text-lg py-3 mt-4';
        guestButton.onclick = async (e) => {
            e.preventDefault();
            errorMsg.classList.add('hidden');
            guestButton.disabled = true;
            try {
                await AuthService.guest();
                // Navigate to app root via router (no full reload)
                history.replaceState(null, '', '/');
                window.dispatchEvent(new PopStateEvent('popstate'));
            } catch (error: any) {
                errorMsg.textContent = AuthService.extractErrorMessage(error);
                errorMsg.classList.remove('hidden');
                submitButton.disabled = false;
                submitButton.textContent = 'Register';
            }
        }
        // Register Link
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

        // Form Submission
        form.onsubmit = async (e) => {
            e.preventDefault();
            errorMsg.classList.add('hidden');
            submitButton.disabled = true;

            try {
                if (!twofaInput.classList.contains('hidden')) {
                    // Stage 2: submit 2FA code
                    submitButton.textContent = 'Verifying 2FA...';
                    const res = await AuthService.submit2FA(twofaInput.value);
                    if (res.user) AuthService.setCurrentUser(res.user);

                } else {
                    // Stage 1: submit username + password
                    submitButton.textContent = 'Logging in...';
                    const res = await AuthService.login(usernameInput.value, passwordInput.value);

                    if (res.requires2FA) {
                        // Show 2FA input
                        twofaLabel.classList.remove('hidden');
                        twofaInput.classList.remove('hidden');
                        // this.tempToken = res.tempToken || null;
                        submitButton.textContent = 'Verify 2FA';
                        submitButton.disabled = false;
                        return;
                    }

                    // Successful login
                    // if (res.token) localStorage.setItem('token', res.token);
                    AuthService.setCurrentUser(res.user);
                }

                // Navigate
                const redirectUrl = sessionStorage.getItem('redirectAfterLogin') || '/';
                sessionStorage.removeItem('redirectAfterLogin');
                history.replaceState(null, '', redirectUrl);
                window.dispatchEvent(new PopStateEvent('popstate'));

            } catch (error: any) {
                errorMsg.textContent = AuthService.extractErrorMessage(error);
                errorMsg.classList.remove('hidden');
                submitButton.disabled = false;
                submitButton.textContent = twofaInput.classList.contains('hidden') ? 'Login' : 'Verify 2FA';
            }
        };

        // Append all elements
        form.appendChild(usernameLabel);
        form.appendChild(usernameInput);
        form.appendChild(passwordLabel);
        form.appendChild(passwordInput);
        form.appendChild(twofaLabel);
        form.appendChild(twofaInput);
        form.appendChild(errorMsg);
        form.appendChild(submitButton);
        form.appendChild(registerLink);
        form.appendChild(guestButton);

        this.container.appendChild(title);
        this.container.appendChild(form);

        return this.container;
    }

    public cleanup(): void {
        if (this.container) {
            this.container.remove();
            this.container = null;
            // this.tempToken = null;
        }
    }
}
