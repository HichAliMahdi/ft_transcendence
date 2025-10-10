import { HomePage } from '../components/ui/HomePage';
import { GamePage } from '../components/ui/GamePage';
import { TournamentPage } from '../components/ui/TournamentPage';

interface Route {
    path: string;
    view: () => HTMLElement;
}

export class Router {
    private routes: Route[];

    constructor() {
        this.routes = [
            { path: '/', view: () => new HomePage().render() },
            { path: '/game', view: () => new GamePage().render() },
            { path: '/tournament', view: () => new TournamentPage().render() },
        ];
    }

    public navigateTo(url: string): void {
        history.pushState(null, '', url);
        this.handleRoute();
    }

    public handleRoute(): void {
        const path = window.location.pathname;
        const route = this.routes.find(r => r.path === path) || this.routes[0];
        
        const content = document.getElementById('content');
        if (content) {
            content.innerHTML = '';
            content.appendChild(route.view());
        }
    }
}
