const API_BASE = '/api';

interface AuthResponse {
    message: string;
    token: string;
    user: {
        id: number;
        username: string;
        email: string;
        display_name: string;
    };
}

interface User {
    id: number;
    username: string;
    email: string;
    display_name: string;
    avatar_url?: string;
    is_online?: number;
}

export class AuthService {
    private static TOKEN_KEY = 'auth_token';
    private static USER_KEY = 'user_data';

    private static async parseResponseError(response: Response): Promise<never> {
        try {
            const data = await response.json();
            const msg = data?.message || data?.error || (typeof data === 'string' ? data : null);
            throw new Error(msg || `${response.status} ${response.statusText}`);
        } catch (err) {
            throw new Error(`${response.status} ${response.statusText}`);
        }
    }

    static async register(username: string, email: string, password: string, displayName: string): Promise<AuthResponse> {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password, display_name: displayName }),
        });

        if (!response.ok) {
            await this.parseResponseError(response);
        }

        const data: AuthResponse = await response.json();
        this.storeAuthData(data.token, data.user);
        return data;
    }

    static async login(username: string, password: string): Promise<AuthResponse> {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
            await this.parseResponseError(response);
        }

        const data: AuthResponse = await response.json();
        this.storeAuthData(data.token, data.user);
        return data;
    }

    static async logout(): Promise<void> {
        const token = this.getToken();
        if (token) {
            try {
                const response = await fetch(`${API_BASE}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!response.ok) {
                    // best-effort: parse server message but continue clearing local auth
                    try { const data = await response.json(); console.warn('Logout server message:', data?.message || data?.error); } catch (_) {}
                }
            } catch (error) {
                console.error('Logout request failed:', error);
            }
        }
        this.clearAuth();
    }

    static async getCurrentUser(): Promise<User | null> {
        const token = this.getToken();
        if (!token) {
            return null;
        }
        try {
            const response = await fetch(`${API_BASE}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                await this.parseResponseError(response);
            }

            const data = await response.json();
            return data.user;
        } catch (error: any) {
            console.error('Error fetching current user:', error);
            this.clearAuth();
            return null;
        }
    }

    static isAuthenticated(): boolean {
        return this.getToken() !== null;
    }

    static getToken(): string | null {
        return localStorage.getItem(this.TOKEN_KEY);
    }

    static getUser(): User | null {
        const userData = localStorage.getItem(this.USER_KEY);
        return userData ? JSON.parse(userData) : null;
    }

    private static storeAuthData(token: string, user: User): void {
        localStorage.setItem(this.TOKEN_KEY, token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }

    private static clearAuth(): void {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
    }

    // --- added friend API helpers ---

    static async getFriends(userId: number): Promise<Array<{ id: number; username: string; display_name?: string; avatar_url?: string | null; is_online?: boolean; status?: string }>> {
        const token = this.getToken();
        if (!token) throw new Error('Not authenticated');
        const resp = await fetch(`${API_BASE}/users/${userId}/friends`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) {
            await this.parseResponseError(resp);
        }
        const data = await resp.json();
        // normalize online flag to boolean
        return (data.friends || []).map((f: any) => ({
            id: f.id,
            username: f.username,
            display_name: f.display_name,
            avatar_url: f.avatar_url || null,
            is_online: !!f.is_online,
            status: f.status
        }));
    }

    static async sendFriendRequest(targetUserId: number): Promise<void> {
        const token = this.getToken();
        if (!token) throw new Error('Not authenticated');
        const resp = await fetch(`${API_BASE}/users/${targetUserId}/friends`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        if (!resp.ok) {
            await this.parseResponseError(resp);
        }
    }

    static async sendFriendRequestByUsername(username: string): Promise<void> {
        const token = this.getToken();
        if (!token) throw new Error('Not authenticated');
        const resp = await fetch(`${API_BASE}/users/friends`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        if (!resp.ok) {
            await this.parseResponseError(resp);
        }
    }

    static async removeFriend(userId: number, friendId: number): Promise<void> {
        const token = this.getToken();
        if (!token) throw new Error('Not authenticated');
        const resp = await fetch(`${API_BASE}/users/${userId}/friends/${friendId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) {
            await this.parseResponseError(resp);
        }
    }

    // --- added notification API helpers ---

    static async getNotifications(): Promise<Array<{ id: number; user_id: number; actor_id?: number; type: string; payload?: any; is_read: number; created_at: string }>> {
        const token = this.getToken();
        if (!token) throw new Error('Not authenticated');
        const resp = await fetch(`${API_BASE}/notifications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) {
            await this.parseResponseError(resp);
        }
        const data = await resp.json();
        return data.notifications || [];
    }

    static async markNotificationRead(notificationId: number): Promise<void> {
        const token = this.getToken();
        if (!token) throw new Error('Not authenticated');
        const resp = await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) {
            await this.parseResponseError(resp);
        }
    }
}
