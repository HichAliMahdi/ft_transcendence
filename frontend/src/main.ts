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
        if (nav) {
            let lastScrollY = window.scrollY;
            let ticking = false;
            window.addEventListener('scroll', () => {
                if (!ticking) {
                    ticking = true;
                    requestAnimationFrame(() => {
                        if (window.scrollY > lastScrollY && window.scrollY > 100) {
                            nav.style.transform = 'translateY(-100%)';
                        } else {
                            nav.style.transform = 'translateY(0)';
                        }
                        lastScrollY = window.scrollY;
                        ticking = false;
                    });
                }
            }, { passive: true });

            document.addEventListener('mousemove', (e) => {
                if (e.clientY < 80) {
                    nav.style.transform = 'translateY(0)';
                }
            });
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
