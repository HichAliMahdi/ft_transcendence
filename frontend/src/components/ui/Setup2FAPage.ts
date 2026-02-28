export class Setup2FAPage {
    private container: HTMLElement | null = null;

    public render(): HTMLElement {
        this.container = document.createElement('div');
        this.container.className = 'container mx-auto p-8 max-w-md fade-in';

        const title = document.createElement('h1');
        title.textContent = 'Enable 2FA';
        title.className = 'text-4xl font-bold text-white text-center mb-8 gradient-text';
        this.container.appendChild(title);

        const info = document.createElement('p');
        info.textContent = 'Scan this QR code with your authenticator app, then enter the code to confirm.';
        info.className = 'text-white mb-6';
        this.container.appendChild(info);

        // QR Code container
        const qrImg = document.createElement('img');
        qrImg.className = 'mx-auto mb-6 hidden';
        this.container.appendChild(qrImg);

        // TOTP input
        const codeInput = document.createElement('input');
        codeInput.type = 'text';
        codeInput.placeholder = 'Enter code from app';
        codeInput.className = 'w-full px-4 py-3 rounded-lg bg-game-dark text-white border-2 border-gray-600 focus:border-accent-pink focus:outline-none mb-4 hidden';
        this.container.appendChild(codeInput);

        // Error message
        const errorMsg = document.createElement('p');
        errorMsg.className = 'text-red-500 text-sm mb-4 hidden';
        this.container.appendChild(errorMsg);

        // Submit button
        const submitButton = document.createElement('button');
        submitButton.className = 'btn-primary w-full text-lg py-3';
        submitButton.textContent = 'Enable 2FA';
        this.container.appendChild(submitButton);
        // Step 1: Fetch QR code
        submitButton.onclick = async () => {
            errorMsg.classList.add('hidden');
            submitButton.disabled = true;
            submitButton.textContent = 'Generating QR code...';

            try {
                const token = localStorage.getItem('token');
                const res = await fetch('/auth/2fa/setup', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = await res.json();
                if (!res.ok) throw data;

                qrImg.src = data.qrCode;
                qrImg.classList.remove('hidden');
                codeInput.classList.remove('hidden');
                submitButton.textContent = 'Verify 2FA';
                submitButton.disabled = false;

                // Change button to verification step
                submitButton.onclick = async () => {
                    errorMsg.classList.add('hidden');
                    submitButton.disabled = true;
                    submitButton.textContent = 'Verifying...';

                    try {
                        const code = codeInput.value.trim();
                        if (!code) throw { message: 'Code required' };
                        const verifyRes = await fetch('/auth/2fa/verify', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ code })
                        });
                        const verifyData = await verifyRes.json();
                        if (!verifyRes.ok) throw verifyData;

                        alert('2FA enabled successfully!');
                        // Optionally redirect to profile or dashboard
                        history.replaceState(null, '', '/profile');
                        window.dispatchEvent(new PopStateEvent('popstate'));

                    } catch (err: any) {
                        errorMsg.textContent = err.message || '2FA verification failed';
                        errorMsg.classList.remove('hidden');
                        submitButton.disabled = false;
                        submitButton.textContent = 'Verify 2FA';
                    }
                };

            } catch (err: any) {
                errorMsg.textContent = err.message || 'Failed to generate QR code';
                errorMsg.classList.remove('hidden');
                submitButton.disabled = false;
                submitButton.textContent = 'Enable 2FA';
            }
        };

        return this.container;
    }

    public cleanup(): void {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
    }
}

