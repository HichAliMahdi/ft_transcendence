import { Router } from './router/Router';
import './styles/main.css';

class App {
    private router: Router;

    constructor() {
        this.router = new Router();
        this.init();
    }

    private init(): void {

        document.addEventListener('click', (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.matches('[data-link]')) {
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
            let lastScrollY = window.scrollY;
            window.addEventListener('scroll', () => {
                if (window.scrollY > lastScrollY) {
                    nav.style.transform = 'translateY(-100%)';
                } else {
                    nav.style.transform = 'translateY(0)';
                }
                lastScrollY = window.scrollY;
            });
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
