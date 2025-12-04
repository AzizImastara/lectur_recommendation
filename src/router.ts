// Simple Router
import { isAuthenticated } from './auth';

export type Route = 'login' | 'register' | 'dashboard' | 'profile';

let currentRoute: Route = 'login';

export function getCurrentRoute(): Route {
  return currentRoute;
}

export function setRoute(route: Route): void {
  currentRoute = route;
  // Trigger route change event
  window.dispatchEvent(new CustomEvent('routechange', { detail: { route } }));
}

// Initialize route based on auth status
export function initRoute(): void {
  if (isAuthenticated()) {
    currentRoute = 'dashboard';
  } else {
    currentRoute = 'login';
  }
}

