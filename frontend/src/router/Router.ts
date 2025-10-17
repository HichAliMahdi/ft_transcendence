import { HomePage } from '../components/ui/HomePage';
import { GamePage } from '../components/ui/GamePage';
import { TournamentPage } from '../components/ui/TournamentPage';
import { MultiplayerPage } from '../components/ui/MultiPlayerPage';

interface Route {
    path: string;
    view: () => any;
}

export class Router {
    private routes: Route[];
    private currentPage: any = null;

    constructor() {
        this.routes = [
            { path: '/', view: () => new HomePage() },
            { path: '/game', view: () => new GamePage() },
            { path: '/tournament', view: () => new TournamentPage() },
            { path: '/multiplayer', view: () => new MultiplayerPage() },
        ];
    }

    public navigateTo(url: string): void {
        history.pushState(null, '', url);
        this.handleRoute();
    }

    public handleRoute(): void {
        if (this.currentPage && typeof this.currentPage.cleanup === 'function') {
            this.currentPage.cleanup();
        }

        const path = window.location.pathname;
        const route = this.routes.find(r => r.path === path) || this.routes[0];
        
        this.currentPage = route.view();
        
        const content = document.getElementById('content');
        if (content) {
            content.innerHTML = '';
            content.appendChild(this.currentPage.render());
        }
    }
}
