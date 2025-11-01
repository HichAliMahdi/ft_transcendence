import { Router } from './router/Router';
import { AuthService } from './components/game/AuthService';
import './styles/main.css';

class App {
    private router: Router;

    constructor() {
        this.router = new Router();
        this.init();
    }

    private init(): void {
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

        // Sidebar toggle logic (replaces mouse-based behavior)
        const nav = document.getElementById('main-nav');
        const toggleBtn = document.getElementById('nav-toggle-btn');

        if (nav) {
            // Initialize collapsed state on small screens
            if (window.innerWidth < 768) {
                nav.classList.add('collapsed');
                document.body.classList.add('nav-collapsed');
                if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
            }

            if (toggleBtn) {
                toggleBtn.addEventListener('click', () => {
                    const collapsed = nav.classList.toggle('collapsed');
                    document.body.classList.toggle('nav-collapsed', collapsed);
                    toggleBtn.setAttribute('aria-expanded', String(!collapsed));
                });
            }

            // Make resize responsive: ensure desktop shows sidebar by default
            window.addEventListener('resize', () => {
                if (window.innerWidth >= 768) {
                    nav.classList.remove('collapsed');
                    document.body.classList.remove('nav-collapsed');
                    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
                } else {
                    // keep small screens collapsed by default
                    nav.classList.add('collapsed');
                    document.body.classList.add('nav-collapsed');
                    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
                }
            }, { passive: true });
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
