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

    static async register(username: string, email: string, password: string, displayName: string): Promise<AuthResponse> {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password, display_name: displayName }),
        });

        if (!response.ok) {
            throw new Error('Registration failed');
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
            throw new Error('Login failed');
        }

        const data: AuthResponse = await response.json();
        this.storeAuthData(data.token, data.user);
        return data;
    }

    static async logout(): Promise<void> {
        const token = this.getToken();
        if (token) {
            try {
                await fetch(`${API_BASE}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
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
                throw new Error('Failed to fetch user data');
            }

            const data = await response.json();
            return data.user;
        } catch (error) {
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
}
