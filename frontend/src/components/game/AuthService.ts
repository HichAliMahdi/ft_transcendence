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

    // Normalize various error shapes into a user-friendly single-line message
    static extractErrorMessage(err: any): string {
        const sanitize = (s: string) => {
            if (!s) return s;
            // remove bare 127.0.0.1 occurrences and common localhost tokens
            return s.replace(/\b127(?:\.\d{1,3}){3}\b/g, '').replace(/\blocalhost\b/gi, '').trim();
        };

        if (!err) return 'Unknown error';

        // If it's an Error instance, use its message
        if (err instanceof Error) {
            return sanitize(AuthService.extractErrorMessage(err.message));
        }

        // If it's a string, try to parse JSON or strip quotes/braces
        if (typeof err === 'string') {
            const s = err.trim();
            try {
                const parsed = JSON.parse(s);
                if (parsed?.message) return String(parsed.message);
                if (parsed?.error) return String(parsed.error);
                // If parsed is primitive, return it
                if (typeof parsed === 'string' || typeof parsed === 'number') return String(parsed);
            } catch (_) {
                // Not JSON - remove surrounding quotes if any
                if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
                    return sanitize(s.slice(1, -1));
                }
                // Remove outer braces if someone passed raw JSON-like string
                if (s.startsWith('{') && s.endsWith('}')) {
                    try {
                        const pj = JSON.parse(s);
                        if (pj?.message) return String(pj.message);
                    } catch (_) {}
                }
                return sanitize(s);
            }
        }

        // If it's an object, try common fields
        if (typeof err === 'object') {
            if (err.message) return AuthService.extractErrorMessage(err.message);
            if (err.error) return AuthService.extractErrorMessage(err.error);
            // Try to pull readable string values
            const vals = Object.values(err).filter(v => typeof v === 'string' || typeof v === 'number').join(' | ');
            if (vals) return String(vals);
            try {
                return JSON.stringify(err);
            } catch (_) {
                return 'Unknown error';
            }
        }

        return String(err);
    }

    private static async parseResponseError(response: Response): Promise<never> {
        // Try to read the body as text and parse JSON if possible.
        let bodyText = '';
        try {
            bodyText = await response.text();
        } catch (e) {
            // ignore
        }

        // Try parse JSON body to extract a message/error field.
        try {
            if (bodyText) {
                const json = JSON.parse(bodyText);
                const msg = json?.message || json?.error || (typeof json === 'string' ? json : null);
                if (msg) throw new Error(String(msg));
            }
        } catch (e) {
            // If parsing failed, fall back to using bodyText directly.
            if (bodyText && bodyText.trim().length > 0) {
                throw new Error(bodyText.trim());
            }
        }

        // Fallback to status text if no body provided
        throw new Error(`${response.status} ${response.statusText}`);
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
        // notify app that authentication state changed (login)
        try { window.dispatchEvent(new Event('auth:change')); } catch (e) {}
    }

    private static clearAuth(): void {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
        // notify app that authentication state changed (logout)
        try { window.dispatchEvent(new Event('auth:change')); } catch (e) {}
    }

    // --- added friend API helpers ---

    static async getFriends(userId: number): Promise<Array<{ id: number; username: string; display_name?: string; avatar_url?: string | null; is_online?: boolean; status?: string; relation?: string }>> {
        const token = this.getToken();
        if (!token) throw new Error('Not authenticated');
        const resp = await fetch(`${API_BASE}/users/${userId}/friends`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) {
            await this.parseResponseError(resp);
        }
        const data = await resp.json();
        // normalize online flag to boolean and preserve relation from backend
        return (data.friends || []).map((f: any) => ({
            id: f.id,
            username: f.username,
            display_name: f.display_name,
            avatar_url: f.avatar_url || null,
            is_online: !!f.is_online,
            status: f.status,
            relation: f.relation || undefined
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

    // Accept an incoming friend request (userId is the accepter/recipient, friendId is the original requester)
    static async acceptFriend(userId: number, friendId: number): Promise<void> {
        const token = this.getToken();
        if (!token) throw new Error('Not authenticated');
        const resp = await fetch(`${API_BASE}/users/${userId}/friends/${friendId}/accept`, {
            method: 'POST',
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

    // Delete a single notification
    static async deleteNotification(notificationId: number): Promise<void> {
        const token = this.getToken();
        if (!token) throw new Error('Not authenticated');
        const resp = await fetch(`${API_BASE}/notifications/${notificationId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) {
            await this.parseResponseError(resp);
        }
    }

    // Clear all notifications for current user
    static async clearNotifications(): Promise<void> {
        const token = this.getToken();
        if (!token) throw new Error('Not authenticated');
        const resp = await fetch(`${API_BASE}/notifications`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) {
            await this.parseResponseError(resp);
        }
    }

    // Mark all notifications as read
    static async markAllNotificationsRead(): Promise<void> {
        const token = this.getToken();
        if (!token) throw new Error('Not authenticated');
        const resp = await fetch(`${API_BASE}/notifications/read-all`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) {
            await this.parseResponseError(resp);
        }
    }
}
