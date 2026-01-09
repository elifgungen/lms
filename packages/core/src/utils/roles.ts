import type { UserRole } from '../types';

/**
 * Normalize role strings to standard format
 */
export function normalizeRole(val: string): UserRole {
    const r = val.toLowerCase().replace(/^role_/, '');
    if (r.includes('super')) return 'super_admin';
    if (r.includes('admin')) return 'admin';
    if (r.includes('instructor') || r.includes('teacher') || r.includes('educator')) return 'instructor';
    if (r.includes('assistant') || r === 'ta') return 'assistant';
    if (r.includes('student') || r.includes('learner')) return 'student';
    if (r.includes('guest')) return 'guest';
    return r as UserRole;
}

/**
 * Normalize an array of roles
 */
export function normalizeRoles(roles: unknown): UserRole[] {
    if (!roles) return [];

    if (Array.isArray(roles)) {
        return roles.filter(Boolean).map(String).map(normalizeRole);
    }

    if (typeof roles === 'string') {
        return roles
            .split(',')
            .map((r) => r.trim())
            .filter(Boolean)
            .map(normalizeRole);
    }

    return [];
}

/**
 * Check if user has a specific role
 */
export function hasRole(userRoles: string[], role: UserRole): boolean {
    const normalized = normalizeRoles(userRoles);
    return normalized.includes(role);
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(userRoles: string[], roles: UserRole[]): boolean {
    const normalized = normalizeRoles(userRoles);
    return roles.some((r) => normalized.includes(r));
}

/**
 * Get the primary role (first in priority order)
 */
export function getPrimaryRole(userRoles: string[]): UserRole | null {
    const priority: UserRole[] = ['super_admin', 'admin', 'instructor', 'assistant', 'student', 'guest'];
    const normalized = normalizeRoles(userRoles);

    for (const role of priority) {
        if (normalized.includes(role)) return role;
    }

    return normalized[0] || null;
}
