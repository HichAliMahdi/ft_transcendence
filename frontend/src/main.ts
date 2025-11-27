import { Router } from './router/Router';
import { AuthService } from './components/game/AuthService';
import './styles/main.css';
import { FriendWidget } from './components/Widgets/FriendWidget';
import { NotificationWidget } from './components/Widgets/NotificationWidget';

class App {
    private router: Router;

    constructor() {
        this.router = new Router();
        this.init();
    }

    private init(): void {
        // Helper: visible overlay for fatal runtime errors (useful during development)
        const showFatalErrorOverlay = (title: string, err: any) => {
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
                overlay.innerHTML = `<h2 style="margin-top:0;color:#ff7b7b">${title}</h2>
                    <pre style="white-space:pre-wrap;font-size:13px;color:#fff;margin-top:12px;">${(err && err.stack) ? (err.stack) : (typeof err === 'string' ? err : JSON.stringify(err, null, 2))}</pre>
                    <div style="margin-top:18px;"><button id="fatal-error-close" style="padding:8px 12px;border-radius:6px;border:none;background:#ef4444;color:#fff;cursor:pointer">Close overlay</button></div>`;
                document.body.appendChild(overlay);
                const closeBtn = document.getElementById('fatal-error-close');
                if (closeBtn) closeBtn.addEventListener('click', () => { overlay.remove(); });
            } catch (e) {
                // nothing
            }
        };

        try {
            if (!(window as any)._friendWidget) {
                const fw = new FriendWidget();
                fw.mount();
                (window as any)._friendWidget = fw;
            }
        } catch (e) {
            console.error('Failed to mount FriendWidget:', e);
            showFatalErrorOverlay('Failed to mount FriendWidget', e);
        }

        try {
            if (!(window as any)._notificationWidget) {
                const nw = new NotificationWidget();
                nw.mount();
                (window as any)._notificationWidget = nw;
            }
        } catch (e) {
            console.error('Failed to mount NotificationWidget:', e);
            showFatalErrorOverlay('Failed to mount NotificationWidget', e);
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
                showFatalErrorOverlay('Unhandled Error', event.error || event.message || 'Unknown error');
            } catch (e) {}
            // prevent default browser error UI (keeps overlay visible)
            try { event.preventDefault(); } catch (e) {}
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            try {
                showFatalErrorOverlay('Unhandled Promise Rejection', event.reason);
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
            }, 1500);

        }

        this.router.handleRoute();
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

            const logoutBtn = document.createElement('button');
            logoutBtn.id = 'logout-btn';
            logoutBtn.className = 'bg-game-red hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors duration-300';
            logoutBtn.textContent = 'Logout';
            logoutBtn.onclick = async () => {
                await AuthService.logout();
                this.updateAuthSection();
                this.router.navigateTo('/login');
            };

            container.appendChild(welcomeText);
            container.appendChild(logoutBtn);
            authSection.appendChild(container);

        } else {
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
