import { HomePage } from '../components/ui/HomePage';
import { GamePage } from '../components/ui/GamePage';
import { TournamentPage } from '../components/ui/TournamentPage';
import { MultiplayerPage } from '../components/ui/MultiPlayerPage';
import { LoginPage } from '../components/ui/LoginPage';
import { RegisterPage } from '../components/ui/RegisterPage';
import { AuthService } from '../components/game/AuthService';

interface Route {
    path: string;
    view: () => any;
    requiresAuth?: boolean;
}

export class Router {
    private routes: Route[];
    private currentPage: any = null;
    private isNavigating: boolean = false;

    constructor() {
        this.routes = [
            { path: '/', view: () => new HomePage(), requiresAuth: true },
            { path: '/game', view: () => new GamePage(), requiresAuth: true },
            { path: '/tournament', view: () => new TournamentPage(), requiresAuth: true },
            { path: '/multiplayer', view: () => new MultiplayerPage(), requiresAuth: true },
            { path: '/login', view: () => new LoginPage(), requiresAuth: false },
            { path: '/register', view: () => new RegisterPage(), requiresAuth: false },
        ];
    }

    public navigateTo(url: string): void {
        if (window.location.pathname === url) {
            return;
        }
        
        history.pushState(null, '', url);
        this.handleRoute();
    }

    public handleRoute(): void {
        if (this.isNavigating) {
            return;
        }
        
        this.isNavigating = true;

        try {
            if (this.currentPage && typeof this.currentPage.cleanup === 'function') {
                this.currentPage.cleanup();
            }

            const path = window.location.pathname;
            const route = this.routes.find(r => r.path === path) || this.routes[0];
            
            if (route.requiresAuth && !AuthService.isAuthenticated()) {
                if (path !== '/login') {
                    this.isNavigating = false;
                    this.navigateTo('/login');
                    return;
                }
            }

            if ((path === '/login' || path === '/register') && AuthService.isAuthenticated()) {
                this.isNavigating = false;
                this.navigateTo('/');
                return;
            }

            this.currentPage = route.view();
            
            const content = document.getElementById('content');
            if (content) {
                content.innerHTML = '';
                content.appendChild(this.currentPage.render());
            }
        } finally {
            this.isNavigating = false;
        }
    }
}
