const API_BASE = '/api';
import { AuthService } from '../game/AuthService';

export class Setup2FAPage {
    private container: HTMLElement | null = null;

    public render(): HTMLElement {
        let usr = AuthService.getUser();
        let twofa_enabled = 0;
        if (usr && usr.twofa_enabled == 1) twofa_enabled = 1;

        this.container = document.createElement('div');
        this.container.className = 'container mx-auto p-8 max-w-md fade-in';

        const title = document.createElement('h1');
        title.textContent = 'Enable 2FA';
        if (twofa_enabled) title.textContent = 'Disable 2FA';
        title.className = 'text-4xl font-bold text-white text-center mb-8 gradient-text';
        this.container.appendChild(title);

        const info = document.createElement('p');
        info.textContent = 'Scan this QR code with your authenticator app, then enter the code to confirm.';
        info.className = 'text-white mb-6 hidden';
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
        if (twofa_enabled) submitButton.textContent = 'Disable 2FA';
        this.container.appendChild(submitButton);
        // Step 1: Fetch QR code
        if (twofa_enabled) {
            const regenerateButton = document.createElement('button');
            regenerateButton.className = 'btn-primary w-full text-lg py-3 mt-4';
            regenerateButton.textContent = 'Regenerate backup codes';
            this.container.appendChild(regenerateButton);
            regenerateButton.onclick = async () => {
                errorMsg.classList.add('hidden');
                regenerateButton.disabled = true;
                submitButton.disabled = true;
                regenerateButton.textContent = 'Regenerate backup codes...';

                try {
                    const token = localStorage.getItem('auth_token');
                    const res = await fetch(`${API_BASE}/auth/2fa/backup/regenerate`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    const data = await res.json();
                    if (!res.ok) throw data;

                    const codes = data.backupCodes as string[] ?? [];
                    if (codes.length > 0) {
                        // Container
                        const codesContainer = document.createElement('div');
                        codesContainer.className = 'bg-game-dark p-4 rounded-lg mt-6';
                        // Title
                        const title = document.createElement('h2');
                        title.textContent = 'Your Backup Codes';
                        title.className = 'text-xl text-white mb-3 font-bold';
                        codesContainer.appendChild(title);
                        // Info text
                        const info = document.createElement('p');
                        info.textContent = 'Save these codes somewhere safe. Each code can be used once.';
                        info.className = 'text-gray-300 text-sm mb-4';
                        codesContainer.appendChild(info);
                        // List
                        const list = document.createElement('ul');
                        list.className = 'grid grid-cols-2 gap-2';
                        codes.forEach(code => {
                            const item = document.createElement('li');
                            item.textContent = code;
                            item.className = 'bg-black text-white px-3 py-2 rounded text-center font-mono';
                            list.appendChild(item);
                        });
                        codesContainer.appendChild(list);
                        // Append to your page
                        this.container?.appendChild(codesContainer);
                        const copyBtn = document.createElement('button');
                        copyBtn.textContent = 'Copy Codes';
                        copyBtn.className = 'btn-primary mt-4 w-full';
                        copyBtn.onclick = () => {
                            navigator.clipboard.writeText(codes.join('\n'));
                            copyBtn.textContent = 'Copied!';
                        };
                        codesContainer.appendChild(copyBtn);
                        const downloadBtn = document.createElement('button');
                        downloadBtn.textContent = 'Download Codes';
                        downloadBtn.className = 'btn-secondary mt-2 w-full';
                        downloadBtn.onclick = () => {
                            const blob = new Blob([codes.join('\n')], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'backup-codes.txt';
                            a.click();

                            URL.revokeObjectURL(url);
                        };
                        codesContainer.appendChild(downloadBtn);
                        regenerateButton.remove();
                    }

                } catch (err: any) {
                    errorMsg.textContent = err.message || 'Failed to regenerate backup codes';
                    errorMsg.classList.remove('hidden');
                    regenerateButton.disabled = false;
                }
                submitButton.disabled = false;
            };
            submitButton.onclick = async () => {
                errorMsg.classList.add('hidden');
                submitButton.disabled = true;
                submitButton.textContent = 'Disable 2FA...';

                try {
                    const token = localStorage.getItem('auth_token');
                    const res = await fetch(`${API_BASE}/auth/2fa/disable`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    const data = await res.json();
                    if (!res.ok) throw data;
                    if (usr) {
                        usr.twofa_enabled = 0;
                        localStorage.setItem('user_data', JSON.stringify(usr));
                    }
                    alert('2FA disabled successfully!');
                    history.replaceState(null, '', '/profile');
                    window.dispatchEvent(new PopStateEvent('popstate'));

                } catch (err: any) {
                    errorMsg.textContent = err.message || 'Failed to disabled 2FA';
                    errorMsg.classList.remove('hidden');
                    submitButton.disabled = false;
                }
            };
        } else {
            submitButton.onclick = async () => {
                errorMsg.classList.add('hidden');
                submitButton.disabled = true;
                submitButton.textContent = 'Generating QR code...';

                try {
                    const token = localStorage.getItem('auth_token');
                    const res = await fetch(`${API_BASE}/auth/2fa/setup`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    const data = await res.json();
                    if (!res.ok) throw data;

                    info.classList.remove('hidden');
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
                            const verifyRes = await fetch(`${API_BASE}/auth/2fa/verify`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({ code })
                            });
                            const verifyData = await verifyRes.json();
                            if (!verifyRes.ok) throw verifyData;
                            if (usr) {
                                usr.twofa_enabled = 1;
                                localStorage.setItem('user_data', JSON.stringify(usr));
                            }
                            qrImg.remove();
                            codeInput.remove();
                            submitButton.remove();
                            info.textContent = verifyData.message as string;
                            const codes = verifyData.backupCodes as string[] ?? [];
                            if (codes.length > 0) {
                                // Container
                                const codesContainer = document.createElement('div');
                                codesContainer.className = 'bg-game-dark p-4 rounded-lg mt-6';
                                // Title
                                const title = document.createElement('h2');
                                title.textContent = 'Your Backup Codes';
                                title.className = 'text-xl text-white mb-3 font-bold';
                                codesContainer.appendChild(title);
                                // Info text
                                const info = document.createElement('p');
                                info.textContent = 'Save these codes somewhere safe. Each code can be used once.';
                                info.className = 'text-gray-300 text-sm mb-4';
                                codesContainer.appendChild(info);
                                // List
                                const list = document.createElement('ul');
                                list.className = 'grid grid-cols-2 gap-2';
                                codes.forEach(code => {
                                    const item = document.createElement('li');
                                    item.textContent = code;
                                    item.className = 'bg-black text-white px-3 py-2 rounded text-center font-mono';
                                    list.appendChild(item);
                                });
                                codesContainer.appendChild(list);
                                // Append to your page
                                this.container?.appendChild(codesContainer);
                                const copyBtn = document.createElement('button');
                                copyBtn.textContent = 'Copy Codes';
                                copyBtn.className = 'btn-primary mt-4 w-full';
                                copyBtn.onclick = () => {
                                    navigator.clipboard.writeText(codes.join('\n'));
                                    copyBtn.textContent = 'Copied!';
                                };
                                codesContainer.appendChild(copyBtn);
                                const downloadBtn = document.createElement('button');
                                downloadBtn.textContent = 'Download Codes';
                                downloadBtn.className = 'btn-secondary mt-2 w-full';
                                downloadBtn.onclick = () => {
                                    const blob = new Blob([codes.join('\n')], { type: 'text/plain' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = 'backup-codes.txt';
                                    a.click();

                                    URL.revokeObjectURL(url);
                                };
                                codesContainer.appendChild(downloadBtn);
                            }
                            // Optionally redirect to profile or dashboard
                            //history.replaceState(null, '', '/profile');
                            //window.dispatchEvent(new PopStateEvent('popstate'));
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
        }

        return this.container;
    }

    public cleanup(): void {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
    }
}

