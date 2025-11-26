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
        try {
            if (!(window as any)._friendWidget) {
                const fw = new FriendWidget();
                fw.mount();
                (window as any)._friendWidget = fw;
            }
        } catch (e) {
            console.error('Failed to mount FriendWidget:', e);
        }

        try {
            if (!(window as any)._notificationWidget) {
                const nw = new NotificationWidget();
                nw.mount();
                (window as any)._notificationWidget = nw;
            }
        } catch (e) {
            console.error('Failed to mount NotificationWidget:', e);
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
            console.error('Global error caught:', event.error);
            if (event.error?.message?.includes('Canvas')) {
                event.preventDefault();
            }
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
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
