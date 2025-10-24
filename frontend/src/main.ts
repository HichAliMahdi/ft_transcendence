import { Router } from './router/Router';
import './styles/main.css';

class App {
    private router: Router;

    constructor() {
        this.router = new Router();
        this.init();
    }

    private init(): void {

        // Use closest() so clicks on children inside anchors still navigate.
        document.addEventListener('click', (e: MouseEvent) => {
            const target = (e.target as HTMLElement).closest('[data-link]') as HTMLElement | null;
            if (target) {
                e.preventDefault();
                const href = target.getAttribute('href');
                if (href) {
                    this.router.navigateTo(href);
                }
            }
        });

        window.addEventListener('popstate', () => {
            this.router.handleRoute();
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
        if (nav){
            // Throttle scroll updates with rAF to avoid many style/layout updates per frame.
            let lastScrollY = window.scrollY;
            let ticking = false;
            window.addEventListener('scroll', () => {
                if (!ticking) {
                    ticking = true;
                    requestAnimationFrame(() => {
                        if (window.scrollY > lastScrollY) {
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
}

document.addEventListener('DOMContentLoaded', () => {
    new App();
});
