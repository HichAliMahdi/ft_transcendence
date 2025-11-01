import { AuthService } from '../game/AuthService';

export class HomePage {
	public render(): HTMLElement {
		const container = document.createElement('div');
		container.className = 'container mx-auto p-8 fade-in';

		const content = document.createElement('div');
		content.className = 'max-w-4xl mx-auto';
		content.textContent = 'Loading stats...';
		container.appendChild(content);

		this.populate(content).catch(err => {
			console.error('HomePage populate error:', err);
			content.textContent = 'Failed to load stats.';
		});

		return container;
	}

	private async populate(target: HTMLElement): Promise<void> {
		target.innerHTML = '';

		if (!AuthService.isAuthenticated()) {
			const msg = document.createElement('p');
			msg.className = 'text-center text-gray-400 text-lg';
			msg.textContent = 'Please log in to view your player statistics.';
			target.appendChild(msg);
			return;
		}

		const localUser = AuthService.getUser();
		let user = localUser;
		try {
			const fresh = await AuthService.getCurrentUser();
			if (fresh) user = fresh;
		} catch (e) {
		}

		const statsCard = document.createElement('div');
		statsCard.className = 'glass-effect p-8 rounded-2xl';

		const header = document.createElement('h2');
		header.className = 'text-2xl font-bold text-white mb-4';
		header.textContent = `Player Stats — ${user?.display_name || user?.username || 'Player'}`;
		statsCard.appendChild(header);

		const grid = document.createElement('div');
		grid.className = 'grid grid-cols-1 sm:grid-cols-3 gap-4';

		const makeStat = (label: string) => {
			const card = document.createElement('div');
			card.className = 'bg-game-dark p-4 rounded-lg';
			const lbl = document.createElement('div');
			lbl.className = 'text-sm text-gray-400';
			lbl.textContent = label;
			const val = document.createElement('div');
			val.className = 'text-3xl font-bold text-white mt-2';
			val.textContent = '—';
			card.appendChild(lbl);
			card.appendChild(val);
			return { card, val };
		};

		const sGames = makeStat('Games Played');
		const sWins = makeStat('Matches Won');
		const sTournaments = makeStat('Tournaments Joined');

		grid.appendChild(sGames.card);
		grid.appendChild(sWins.card);
		grid.appendChild(sTournaments.card);

		statsCard.appendChild(grid);

		const extra = document.createElement('div');
		extra.className = 'mt-6 text-sm text-gray-300 flex flex-wrap gap-4 justify-center';
		extra.textContent = 'Loading additional stats...';
		statsCard.appendChild(extra);

		target.appendChild(statsCard);

		if (!user?.id) {
			sGames.val.textContent = '0';
			sWins.val.textContent = '0';
			sTournaments.val.textContent = '0';
			extra.textContent = '';
			return;
		}

		try {
			const token = AuthService.getToken();
			const res = await fetch(`/api/users/${user.id}/stats`, {
				headers: token ? { Authorization: `Bearer ${token}` } : undefined
			});

			if (!res.ok) throw new Error('Stats endpoint not available');

			const data: any = await res.json();
			const games = data.games_played ?? data.games ?? 0;
			const wins = data.matches_won ?? data.wins ?? 0;
			const tournaments = data.tournaments_joined ?? data.tournaments ?? 0;
			const losses = data.matches_lost ?? data.losses ?? 0;
			const tournamentsWon = data.tournaments_won ?? 0;

			sGames.val.textContent = String(games);
			sWins.val.textContent = String(wins);
			sTournaments.val.textContent = String(tournaments);

			extra.innerHTML = `
				<div>Matches Lost: ${losses}</div>
				<div>|</div>
				<div>Tournaments Won: ${tournamentsWon}</div>
				<div>|</div>
				<div>Win Rate: ${this.formatWinRate(wins, losses)}</div>
			`;
		} catch (e) {
			console.warn('Could not load server stats, using defaults.', e);
			sGames.val.textContent = '0';
			sWins.val.textContent = '0';
			sTournaments.val.textContent = '0';
			extra.textContent = 'Server stats unavailable.';
		}
	}

	private formatWinRate(wins: number, losses: number): string {
		const total = (wins || 0) + (losses || 0);
		if (total === 0) return '0%';
		return `${Math.round((wins / total) * 100)}%`;
	}

	public cleanup(): void {

	}
}
