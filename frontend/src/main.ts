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

        this.router.handleRoute();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new App();
});
