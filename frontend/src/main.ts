import { Router } from './router/Router';
import { AuthService } from './components/game/AuthService';
import './styles/main.css';
import { FriendWidget } from './components/Widgets/FriendWidget';
import { NotificationWidget } from './components/Widgets/NotificationWidget';

class App {
    private router: Router;
    private presenceSocket: WebSocket | null = null;

    private sanitizeForUi(input: string | undefined | null): string {
        if (!input) return '';
        const sanitized = String(input)
            .replace(/\b127(?:\.\d{1,3}){3}\b/g, '')
            .replace(/\blocalhost\b/gi, '')
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .trim();
        return sanitized;
    }

    private showFatalErrorOverlay(title: string, err: any): void {
        try {
            const existing = document.getElementById('fatal-error-overlay');
            if (existing) return;
            const overlay = document.createElement('div');
            overlay.id = 'fatal-error-overlay';
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100vw';
            overlay.style.height = '100vh';
            overlay.style.background = 'rgba(0,0,0,0.9)';
            overlay.style.color = '#fff';
            overlay.style.zIndex = '99999';
            overlay.style.padding = '24px';
            overlay.style.overflow = 'auto';
            const safeTitle = this.sanitizeForUi(title);
            const safeErr = this.sanitizeForUi((err && err.stack) ? err.stack : (typeof err === 'string' ? err : JSON.stringify(err, null, 2)));
            overlay.innerHTML = `<h2 style="margin-top:0;color:#ff7b7b">${safeTitle}</h2>
                <pre style="white-space:pre-wrap;font-size:13px;color:#fff;margin-top:12px;">${safeErr}</pre>
                <div style="margin-top:18px;"><button id="fatal-error-close" style="padding:8px 12px;border-radius:6px;border:none;background:#ef4444;color:#fff;cursor:pointer">Close overlay</button></div>`;
            document.body.appendChild(overlay);
            const closeBtn = document.getElementById('fatal-error-close');
            if (closeBtn) closeBtn.addEventListener('click', () => { overlay.remove(); });
        } catch (e) {}
    }

    constructor() {
        this.router = new Router();
        this.init();
    }

    private init(): void {
        (window as any).app = (window as any).app || {};
        if (!(window as any).app.showInfo) {
            (window as any).app.showInfo = (title: string, message: string) => {
                return new Promise<void>((resolve) => {
                    try {
                        const overlay = document.createElement('div');
                        overlay.className = 'fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50';

                        const modal = document.createElement('div');
                        modal.className = 'glass-effect p-6 rounded-2xl max-w-lg w-full mx-4 relative text-left border-2 border-white/5';

                        const h = document.createElement('h2');
                        h.className = 'text-2xl font-bold text-white mb-2 gradient-text';
                        h.textContent = this.sanitizeForUi(title) || 'Info';

                        const p = document.createElement('p');
                        p.className = 'text-gray-300 mb-6';
                        p.textContent = this.sanitizeForUi(message) || '';

                        const btn = document.createElement('button');
                        btn.className = 'px-6 py-3 rounded-lg btn-primary';
                        btn.textContent = 'OK';
                        btn.onclick = () => { if (document.body.contains(overlay)) document.body.removeChild(overlay); resolve(); };

                        modal.appendChild(h);
                        modal.appendChild(p);
                        modal.appendChild(btn);
                        overlay.appendChild(modal);
                        document.body.appendChild(overlay);
                        setTimeout(() => btn.focus(), 50);
                    } catch (e) { resolve(); }
                });
            };
        }

        if (!(window as any).app.confirm) {
            (window as any).app.confirm = (title: string, message: string) => {
                return new Promise<boolean>((resolve) => {
                    try {
                        const overlay = document.createElement('div');
                        overlay.className = 'fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50';

                        const modal = document.createElement('div');
                        modal.className = 'glass-effect p-6 rounded-2xl max-w-md w-full mx-4 relative text-left border-2 border-white/5';

                        const h = document.createElement('h2');
                        h.className = 'text-2xl font-bold text-white mb-2 gradient-text';
                        h.textContent = this.sanitizeForUi(title) || 'Confirm';

                        const p = document.createElement('p');
                        p.className = 'text-gray-300 mb-6';
                        p.textContent = this.sanitizeForUi(message) || '';

                        const row = document.createElement('div');
                        row.className = 'flex gap-4 justify-end';

                        const cancel = document.createElement('button');
                        cancel.className = 'px-4 py-2 rounded bg-game-dark text-white';
                        cancel.textContent = 'Cancel';
                        cancel.onclick = () => { if (document.body.contains(overlay)) document.body.removeChild(overlay); resolve(false); };

                        const confirm = document.createElement('button');
                        confirm.className = 'px-4 py-2 rounded btn-primary';
                        confirm.textContent = 'Confirm';
                        confirm.onclick = () => { if (document.body.contains(overlay)) document.body.removeChild(overlay); resolve(true); };

                        row.appendChild(cancel);
                        row.appendChild(confirm);
                        modal.appendChild(h);
                        modal.appendChild(p);
                        modal.appendChild(row);
                        overlay.appendChild(modal);
                        document.body.appendChild(overlay);
                        setTimeout(() => confirm.focus(), 50);
                    } catch (e) { resolve(false); }
                });
            };
        }

        if (!(window as any).app.input) {
            (window as any).app.input = (title: string, placeholder: string, submitLabel = 'Submit') => {
                return new Promise<string | null>((resolve) => {
                    try {
                        const overlay = document.createElement('div');
                        overlay.className = 'fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50';

                        const modal = document.createElement('div');
                        modal.className = 'glass-effect p-6 rounded-2xl max-w-md w-full mx-4 relative text-left border-2 border-white/5';

                        const h = document.createElement('h2');
                        h.className = 'text-2xl font-bold text-white mb-2 gradient-text';
                        h.textContent = this.sanitizeForUi(title) || 'Input';

                        const input = document.createElement('input');
                        input.type = 'text';
                        input.placeholder = this.sanitizeForUi(placeholder) || '';
                        input.className = 'w-full px-4 py-3 rounded-lg bg-game-dark text-white border-2 border-gray-600 focus:border-accent-pink focus:outline-none mb-4';

                        const row = document.createElement('div');
                        row.className = 'flex gap-4 justify-end';

                        const cancel = document.createElement('button');
                        cancel.className = 'px-4 py-2 rounded bg-game-dark text-white';
                        cancel.textContent = 'Cancel';
                        cancel.onclick = () => { if (document.body.contains(overlay)) document.body.removeChild(overlay); resolve(null); };

                        const submit = document.createElement('button');
                        submit.className = 'px-4 py-2 rounded btn-primary';
                        submit.textContent = submitLabel;
                        submit.onclick = () => { if (document.body.contains(overlay)) document.body.removeChild(overlay); resolve(input.value.trim() || null); };

                        row.appendChild(cancel);
                        row.appendChild(submit);
                        modal.appendChild(h);
                        modal.appendChild(input);
                        modal.appendChild(row);
                        overlay.appendChild(modal);
                        document.body.appendChild(overlay);
                        setTimeout(() => input.focus(), 50);
                    } catch (e) { resolve(null); }
                });
            };
        }

        try {
            if (!(window as any)._friendWidget) {
                const fw = new FriendWidget();
                fw.mount();
                (window as any)._friendWidget = fw;
            }
        } catch (e) {
            this.showFatalErrorOverlay(this.sanitizeForUi('Failed to mount FriendWidget'), e);
        }

        try {
            if (!(window as any)._notificationWidget) {
                const nw = new NotificationWidget();
                nw.mount();
                (window as any)._notificationWidget = nw;
            }
        } catch (e) {
            this.showFatalErrorOverlay(this.sanitizeForUi('Failed to mount NotificationWidget'), e);
        }

        this.updateAuthSection();

        document.addEventListener('click', (e: MouseEvent) => {
            const target = (e.target as HTMLElement).closest('[data-link]') as HTMLElement | null;
            if (target) {
                e.preventDefault();
                const href = target.getAttribute('href');
                if (href) {
                    this.router.navigateTo(href);
                    setTimeout(() => this.updateAuthSection(), 0);

                    const nav = document.getElementById('main-nav');
                    const toggleBtn = document.getElementById('nav-toggle-btn');
                    if (nav && window.innerWidth < 768) {
                        nav.classList.add('collapsed');
                        document.body.classList.add('nav-collapsed');
                        if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
                    }
                }
            }
        });

        window.addEventListener('popstate', () => {
            this.router.handleRoute();
            this.updateAuthSection();
        });

        window.addEventListener('error', (event) => {
            try {
                this.showFatalErrorOverlay('Unhandled Error', this.sanitizeForUi(event.error || event.message || 'Unknown error'));
            } catch (e) {}
            try { event.preventDefault(); } catch (e) {}
        });

        window.addEventListener('unhandledrejection', (event) => {
            try {
                this.showFatalErrorOverlay('Unhandled Promise Rejection', this.sanitizeForUi(event.reason));
            } catch (e) {}
            try { event.preventDefault(); } catch (e) {}
        });

        const nav = document.getElementById('main-nav');
        const toggleBtn = document.getElementById('nav-toggle-btn');

        if (nav) {
            const applyResponsiveCollapsed = () => {
                if (window.innerWidth < 768) {
                    nav.classList.add('collapsed');
                    document.body.classList.add('nav-collapsed');
                    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
                } else {
                    nav.classList.remove('collapsed');
                    document.body.classList.remove('nav-collapsed');
                    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
                }
            };

            const showNav = () => {
                nav.style.display = '';
                if (toggleBtn) toggleBtn.style.display = '';
                applyResponsiveCollapsed();
                if (toggleBtn && !toggleBtn.getAttribute('data-nav-listener')) {
                    toggleBtn.addEventListener('click', () => {
                        const collapsed = nav.classList.toggle('collapsed');
                        document.body.classList.toggle('nav-collapsed', collapsed);
                        toggleBtn.setAttribute('aria-expanded', String(!collapsed));
                    });
                    toggleBtn.setAttribute('data-nav-listener', '1');
                }
            };

            const hideNav = () => {
                nav.style.display = 'none';
                if (toggleBtn) toggleBtn.style.display = 'none';
            };

            const onAuthChange = () => {
                this.updateAuthSection();
                const auth = AuthService.isAuthenticated();
                if (auth) showNav();
                else hideNav();
            };
            window.addEventListener('auth:change', onAuthChange);

            let prevAuth = AuthService.isAuthenticated();
            if (prevAuth) {
                showNav();
            } else {
                hideNav();
            }

            window.addEventListener('resize', () => {
                if (nav.style.display === '' || nav.style.display === 'block' || nav.style.display === '') {
                    applyResponsiveCollapsed();
                }
            }, { passive: true });

            window.setInterval(() => {
                const curAuth = AuthService.isAuthenticated();
                if (curAuth !== prevAuth) {
                    prevAuth = curAuth;
                    if (curAuth) showNav();
                    else hideNav();
                }
            }, 500);

        }

        this.connectPresenceSocket();

        this.router.handleRoute();
    }

    private connectPresenceSocket(): void {
        if (!AuthService.isAuthenticated()) return;

        const token = AuthService.getToken();
        if (!token) return;

        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host;
            const wsUrl = `${protocol}//${host}/ws?token=${encodeURIComponent(token)}`;

            this.presenceSocket = new WebSocket(wsUrl);

            this.presenceSocket.onopen = () => {};

            this.presenceSocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'presence_update') {
                        // Dispatch event with correct structure
                        window.dispatchEvent(new CustomEvent('presence:update', {
                            detail: {
                                user_id: data.userId,
                                status: data.status,
                                is_online: data.isOnline
                            }
                        }));
                        this.handlePresenceUpdate(data.userId, data.status, data.isOnline);
                    } else if (data.type === 'direct_message') {
                        window.dispatchEvent(new CustomEvent('direct_message', { detail: data }));
                    } else if (data.type === 'notification_update') {
                        const nw = (window as any)._notificationWidget;
                        if (nw && typeof nw.refreshNow === 'function') {
                            nw.refreshNow();
                        }
                        const fw = (window as any)._friendWidget;
                        if (fw && typeof fw.refreshNow === 'function') {
                            fw.refreshNow();
                        }
                    } else if (data.type === 'tournament_update') {
                        window.dispatchEvent(new CustomEvent('tournament:update', { detail: data }));
                    }
                } catch (e) {}
            };

            this.presenceSocket.onerror = (_err) => {};

            this.presenceSocket.onclose = () => {
                this.presenceSocket = null;
                setTimeout(() => {
                    if (AuthService.isAuthenticated() && !this.presenceSocket) {
                        this.connectPresenceSocket();
                    }
                }, 5000);
            };
        } catch (e) {}
    }

    private handlePresenceUpdate(userId: number, status: string, isOnline: boolean): void {
        const fw = (window as any)._friendWidget;
        if (fw && typeof fw.updateFriendPresence === 'function') {
            fw.updateFriendPresence(userId, status, isOnline);
        }

        window.dispatchEvent(new CustomEvent('user:presence', {
            detail: { userId, status, isOnline }
        }));
    }

    private updateAuthSection(): void {
        const authSection = document.getElementById('auth-section');
        if (!authSection) return;

        authSection.innerHTML = '';

        if (AuthService.isAuthenticated()) {
            const user = AuthService.getUser();
            
            const container = document.createElement('div');
            container.className = 'relative';

            const gearButton = document.createElement('button');
            gearButton.id = 'auth-menu-btn';
            gearButton.className = 'w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 group';
            
            const leftSection = document.createElement('div');
            leftSection.className = 'flex items-center gap-3 flex-1 min-w-0';
            
            const avatar = document.createElement('div');
            avatar.className = 'w-10 h-10 rounded-full bg-gradient-to-br from-accent-pink to-accent-purple flex items-center justify-center text-white font-bold text-sm ring-2 ring-white/20 flex-shrink-0 overflow-hidden cursor-pointer hover:ring-accent-pink transition-all duration-200';
            avatar.title = 'Click to change avatar';
            
            // Display avatar if exists
            const avatarUrl = AuthService.getAvatarUrl(user);
            if (avatarUrl) {
                const img = document.createElement('img');
                img.src = avatarUrl;
                img.className = 'w-full h-full object-cover';
                img.alt = 'Avatar';
                avatar.appendChild(img);
            } else {
                avatar.textContent = (user?.display_name || user?.username || 'U').charAt(0).toUpperCase();
            }

            // Add click handler for avatar upload
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/jpeg,image/png,image/gif,image/webp';
            fileInput.className = 'hidden';
            fileInput.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;

                if (file.size > 5 * 1024 * 1024) {
                    await (window as any).app.showInfo('File Too Large', 'Maximum file size is 5MB');
                    return;
                }

                try {
                    await AuthService.uploadAvatar(file);
                    this.updateAuthSection();
                } catch (err: any) {
                    await (window as any).app.showInfo('Upload Failed', AuthService.extractErrorMessage(err));
                }
            };
            avatar.appendChild(fileInput);
            avatar.onclick = (e) => {
                e.stopPropagation();
                fileInput.click();
            };
            
            const userInfo = document.createElement('div');
            userInfo.className = 'flex flex-col items-start min-w-0 flex-1';
            
            const userName = document.createElement('span');
            userName.className = 'text-white font-semibold text-sm truncate w-full text-left';
            userName.textContent = user?.display_name || user?.username || 'User';
            
            const statusContainer = document.createElement('div');
            statusContainer.className = 'flex items-center gap-1.5';
            
            const statusDot = document.createElement('span');
            statusDot.id = 'header-status-dot';
            const currentStatus = (user && (user as any).status) ? (user as any).status : 'Online';
            const statusColors: {[key: string]: string} = {
                'Online': '#22c55e',
                'Busy': '#ef4444',
                'Away': '#f59e0b',
                'Offline': '#94a3b8'
            };
            const hasGlow = currentStatus !== 'Offline';
            statusDot.className = `w-2 h-2 rounded-full ${hasGlow ? 'shadow-[0_0_8px_currentColor]' : ''}`;
            statusDot.style.backgroundColor = statusColors[currentStatus] || '#94a3b8';
            
            const statusText = document.createElement('span');
            statusText.className = 'text-xs text-gray-400';
            statusText.textContent = currentStatus;
            
            statusContainer.appendChild(statusDot);
            statusContainer.appendChild(statusText);
            
            userInfo.appendChild(userName);
            userInfo.appendChild(statusContainer);
            
            leftSection.appendChild(avatar);
            leftSection.appendChild(userInfo);
            
            const gearIcon = document.createElement('span');
            gearIcon.className = 'text-xl text-gray-400 group-hover:text-accent-pink transition-colors duration-300 group-hover:rotate-90 transition-transform';
            gearIcon.textContent = '⚙️';
            
            gearButton.appendChild(leftSection);
            gearButton.appendChild(gearIcon);

            // Dropdown menu
            const dropdown = document.createElement('div');
            dropdown.id = 'auth-dropdown';
            dropdown.className = 'absolute bottom-full left-0 right-0 mb-2 bg-gradient-to-br from-game-dark to-blue-900/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/10 overflow-hidden hidden opacity-0 transition-all duration-300';
            
            const dropdownContent = document.createElement('div');
            dropdownContent.className = 'p-2';
            
            const settingsLink = document.createElement('a');
            settingsLink.href = '/settings';
            settingsLink.setAttribute('data-link', '');
            settingsLink.className = 'flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors duration-200 text-white';
            settingsLink.innerHTML = '<span class="text-lg">⚙️</span><span>Settings</span>';
            
            const divider = document.createElement('div');
            divider.className = 'h-px bg-white/10 my-2';
            
            const logoutBtn = document.createElement('button');
            logoutBtn.className = 'w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-500/20 transition-colors duration-200 text-red-400 hover:text-red-300';
            logoutBtn.innerHTML = '<span class="text-lg">🚪</span><span>Logout</span>';
            logoutBtn.onclick = async () => {
                if (this.presenceSocket) {
                    this.presenceSocket.close();
                    this.presenceSocket = null;
                }
                await AuthService.logout();
                this.updateAuthSection();
                this.router.navigateTo('/login');
            };
            
            dropdownContent.appendChild(settingsLink);
            dropdownContent.appendChild(divider);
            dropdownContent.appendChild(logoutBtn);
            dropdown.appendChild(dropdownContent);

            // Toggle dropdown
            let isOpen = false;
            gearButton.onclick = (e) => {
                e.stopPropagation();
                isOpen = !isOpen;
                if (isOpen) {
                    dropdown.classList.remove('hidden');
                    setTimeout(() => {
                        dropdown.classList.remove('opacity-0');
                        dropdown.classList.add('opacity-100');
                    }, 10);
                } else {
                    dropdown.classList.remove('opacity-100');
                    dropdown.classList.add('opacity-0');
                    setTimeout(() => dropdown.classList.add('hidden'), 300);
                }
            };

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (isOpen && !container.contains(e.target as Node)) {
                    isOpen = false;
                    dropdown.classList.remove('opacity-100');
                    dropdown.classList.add('opacity-0');
                    setTimeout(() => dropdown.classList.add('hidden'), 300);
                }
            });

            container.appendChild(dropdown);
            container.appendChild(gearButton);
            authSection.appendChild(container);

            if (!this.presenceSocket || this.presenceSocket.readyState !== WebSocket.OPEN) {
                this.connectPresenceSocket();
            }

        } else {
            if (this.presenceSocket) {
                this.presenceSocket.close();
                this.presenceSocket = null;
            }

            const container = document.createElement('div');
            container.className = 'flex flex-col gap-3';

            const loginLink = document.createElement('a');
            loginLink.href = '/login';
            loginLink.setAttribute('data-link', '');
            loginLink.className = 'bg-accent-purple hover:bg-purple-600 text-white px-4 py-3 rounded-xl transition-all duration-300 text-center font-semibold';
            loginLink.textContent = 'Login';

            const registerLink = document.createElement('a');
            registerLink.href = '/register';
            registerLink.setAttribute('data-link', '');
            registerLink.className = 'bg-accent-pink hover:bg-pink-600 text-white px-4 py-3 rounded-xl transition-all duration-300 text-center font-semibold';
            registerLink.textContent = 'Register';

            container.appendChild(loginLink);
            container.appendChild(registerLink);
            authSection.appendChild(container);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new App();
});
