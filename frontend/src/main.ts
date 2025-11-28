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
        return String(input).replace(/\b127(?:\.\d{1,3}){3}\b/g, '').replace(/\blocalhost\b/gi, '').trim();
    }

    // Show a visible overlay for fatal runtime errors (instance method so TypeScript sees it)
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
        } catch (e) {
            // nothing
        }
    }

    constructor() {
        this.router = new Router();
        this.init();
    }

    private init(): void {
        // expose small site-styled modal helpers on window.app
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
            console.error('Failed to mount FriendWidget:', e);
            this.showFatalErrorOverlay(this.sanitizeForUi('Failed to mount FriendWidget'), e);
        }

        try {
            if (!(window as any)._notificationWidget) {
                const nw = new NotificationWidget();
                nw.mount();
                (window as any)._notificationWidget = nw;
            }
        } catch (e) {
            console.error('Failed to mount NotificationWidget:', e);
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

                    // Collapse sidebar on small screens after navigation
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
            console.error('Global error caught:', event.error || event.message);
            try {
                this.showFatalErrorOverlay('Unhandled Error', this.sanitizeForUi(event.error || event.message || 'Unknown error'));
            } catch (e) {}
            // prevent default browser error UI (keeps overlay visible)
            try { event.preventDefault(); } catch (e) {}
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
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

            // react immediately to auth changes (login/logout)
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
            }, 500); // check auth faster so nav responds quickly

        }

        // Initialize presence WebSocket for realtime status updates
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
            const wsUrl = `${protocol}//${host}/ws`;

            this.presenceSocket = new WebSocket(wsUrl);

            // Send auth token after connection
            this.presenceSocket.onopen = () => {
                console.log('Presence WebSocket connected');
            };

            this.presenceSocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'presence_update') {
                        this.handlePresenceUpdate(data.userId, data.status, data.isOnline);
                    }
                } catch (e) {
                    console.debug('Failed to parse presence message', e);
                }
            };

            this.presenceSocket.onerror = (err) => {
                console.debug('Presence WebSocket error', err);
            };

            this.presenceSocket.onclose = () => {
                console.log('Presence WebSocket closed');
                // Attempt reconnect after 5 seconds if still authenticated
                setTimeout(() => {
                    if (AuthService.isAuthenticated() && !this.presenceSocket) {
                        this.connectPresenceSocket();
                    }
                }, 5000);
            };
        } catch (e) {
            console.error('Failed to connect presence WebSocket', e);
        }
    }

    private handlePresenceUpdate(userId: number, status: string, isOnline: boolean): void {
        // Update friend widget if it exists
        const fw = (window as any)._friendWidget;
        if (fw && typeof fw.updateFriendPresence === 'function') {
            fw.updateFriendPresence(userId, status, isOnline);
        }

        // Dispatch custom event for other components
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
            container.className = 'flex items-center gap-4';

            const welcomeText = document.createElement('span');
            welcomeText.className = 'text-white';
            welcomeText.textContent = `Welcome, ${user?.display_name || user?.username}!`;

            // Status selector with visual indicator
            const statusContainer = document.createElement('div');
            statusContainer.className = 'relative';
            
            const statusSelect = document.createElement('select');
            statusSelect.className = 'bg-game-dark text-white px-3 py-2 pr-8 rounded-lg appearance-none cursor-pointer';
            statusSelect.style.paddingLeft = '32px'; // make room for status dot
            
            const statuses: Array<{value: string; label: string; color: string}> = [
                { value: 'Online', label: '🟢 Online', color: '#22c55e' },
                { value: 'Busy', label: '🔴 Busy', color: '#ef4444' },
                { value: 'Away', label: '🟡 Away', color: '#f59e0b' },
                { value: 'Offline', label: '⚫ Offline', color: '#94a3b8' }
            ];
            
            statuses.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.value;
                opt.textContent = s.label;
                statusSelect.appendChild(opt);
            });
            
            // Get current status from user object (includes status field from server)
            const currentStatus = (user && (user as any).status) ? (user as any).status : 'Online';
            statusSelect.value = currentStatus;

            // Add visual status indicator dot
            const statusDot = document.createElement('span');
            statusDot.className = 'absolute left-2 top-1/2 transform -translate-y-1/2 pointer-events-none';
            statusDot.style.width = '10px';
            statusDot.style.height = '10px';
            statusDot.style.borderRadius = '50%';
            statusDot.style.display = 'inline-block';
            const currentStatusColor = statuses.find(s => s.value === currentStatus)?.color || '#94a3b8';
            statusDot.style.background = currentStatusColor;
            
            statusSelect.onchange = async () => {
                const newStatus = statusSelect.value as 'Online'|'Busy'|'Away'|'Offline';
                try {
                    await AuthService.setStatus(newStatus);
                    // Update dot color
                    const newColor = statuses.find(s => s.value === newStatus)?.color || '#94a3b8';
                    statusDot.style.background = newColor;
                } catch (err: any) {
                    await (window as any).app.showInfo('Status update failed', AuthService.extractErrorMessage(err) || String(err));
                    // revert select to cached value
                    const cached = AuthService.getUser();
                    const cachedStatus = (cached && (cached as any).status) ? (cached as any).status : 'Online';
                    statusSelect.value = cachedStatus;
                    const cachedColor = statuses.find(s => s.value === cachedStatus)?.color || '#94a3b8';
                    statusDot.style.background = cachedColor;
                }
            };

            // Set user online by default when authenticated (but respect cached status if not Offline)
            try {
                if (currentStatus === 'Offline') {
                    AuthService.setStatus('Online').catch(() => {});
                    statusSelect.value = 'Online';
                    statusDot.style.background = '#22c55e';
                }
            } catch (e) {}

            statusContainer.appendChild(statusDot);
            statusContainer.appendChild(statusSelect);

            const logoutBtn = document.createElement('button');
            logoutBtn.id = 'logout-btn';
            logoutBtn.className = 'bg-game-red hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors duration-300';
            logoutBtn.textContent = 'Logout';
            logoutBtn.onclick = async () => {
                // Disconnect presence socket before logout
                if (this.presenceSocket) {
                    this.presenceSocket.close();
                    this.presenceSocket = null;
                }
                await AuthService.logout();
                this.updateAuthSection();
                this.router.navigateTo('/login');
            };

            container.appendChild(welcomeText);
            container.appendChild(statusContainer);
            container.appendChild(logoutBtn);
            authSection.appendChild(container);

            // Connect presence socket when user logs in
            if (!this.presenceSocket || this.presenceSocket.readyState !== WebSocket.OPEN) {
                this.connectPresenceSocket();
            }

        } else {
            // Disconnect presence socket when user logs out
            if (this.presenceSocket) {
                this.presenceSocket.close();
                this.presenceSocket = null;
            }

            const container = document.createElement('div');
            container.className = 'flex gap-4';

            const loginLink = document.createElement('a');
            loginLink.href = '/login';
            loginLink.setAttribute('data-link', '');
            loginLink.className = 'bg-accent-purple hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors duration-300';
            loginLink.textContent = 'Login';

            const registerLink = document.createElement('a');
            registerLink.href = '/register';
            registerLink.setAttribute('data-link', '');
            registerLink.className = 'bg-accent-pink hover:bg-pink-600 text-white px-4 py-2 rounded-lg transition-colors duration-300';
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
