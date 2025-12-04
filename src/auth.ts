// Authentication Service
export type UserRole = 'mahasiswa' | 'dosen' | 'super_admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  [key: string]: any;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// Get token from localStorage
export function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

// Get user from localStorage
export function getUser(): User | null {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

// Save auth data
export function saveAuth(token: string, user: User): void {
  localStorage.setItem('auth_token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

// Clear auth data
export function clearAuth(): void {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return getToken() !== null && getUser() !== null;
}

// Check user role
export function hasRole(role: UserRole): boolean {
  const user = getUser();
  return user?.role === role;
}

// Get user role
export function getUserRole(): UserRole | null {
  const user = getUser();
  return user?.role || null;
}

