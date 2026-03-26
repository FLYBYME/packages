export class AccessDeniedError extends Error {
    constructor(public permission: string, public actionName?: string) {
        super(
            `Access denied: permission "${permission}" is required`
            + (actionName ? ` to call "${actionName}"` : '')
        );
        this.name = 'AccessDeniedError';
    }
}

export interface IAuthContext {
    meta?: {
        user?: {
            id?: string;
            groups?: string[];
            permissions?: string[];
        };
        assignedGroups?: string[];
    };
}

interface GroupDefinition {
    permissions: string[];
    extends: string[];
}

/**
 * PolicyEngine — evaluates hierarchical permissions.
 */
export class PolicyEngine {
    private groups = new Map<string, GroupDefinition>();
    private groupCache = new Map<string, Set<string>>();

    /**
     * Register a group with its direct permissions and optional parent groups.
     */
    defineGroup(name: string, permissions: string[], inherits: string[] = []): void {
        this.groups.set(name, { permissions, extends: inherits });
        this.groupCache.clear();
    }

    /**
     * Resolve the complete permission set for a group.
     */
    resolveGroup(groupName: string, visited = new Set<string>()): Set<string> {
        if (this.groupCache.has(groupName)) {
            return this.groupCache.get(groupName)!;
        }

        if (visited.has(groupName)) return new Set();
        visited.add(groupName);

        const def = this.groups.get(groupName);
        if (!def) return new Set();

        const resolved = new Set<string>(def.permissions);

        for (const parent of def.extends) {
            for (const perm of this.resolveGroup(parent, visited)) {
                resolved.add(perm);
            }
        }

        this.groupCache.set(groupName, resolved);
        return resolved;
    }

    /**
     * Resolve all permissions for the current context user.
     */
    resolvePermissions(ctx: IAuthContext): Set<string> {
        const resolved = new Set<string>();

        const groups: string[] = [
            ...(ctx.meta?.assignedGroups ?? []),
            ...(ctx.meta?.user?.groups ?? []),
        ];
        
        for (const group of groups) {
            const groupPerms = this.resolveGroup(group);
            for (const perm of groupPerms) {
                resolved.add(perm);
            }
        }

        for (const perm of ctx.meta?.user?.permissions ?? []) {
            resolved.add(perm);
        }

        return resolved;
    }

    /**
     * Check whether the current user has a given permission.
     */
    can(permission: string, ctx: IAuthContext): boolean {
        const perms = this.resolvePermissions(ctx);
        return perms.has('*') || perms.has(permission);
    }

    /**
     * Assert that the current user has a given permission.
     */
    require(permission: string, ctx: IAuthContext, actionName?: string): void {
        if (!this.can(permission, ctx)) {
            throw new AccessDeniedError(permission, actionName);
        }
    }

    /**
     * Reload policies from an external source or payload.
     */
    reload(newGroups: Record<string, GroupDefinition>): void {
        this.groups.clear();
        for (const [name, def] of Object.entries(newGroups)) {
            this.groups.set(name, def);
        }
        this.clearCache();
    }

    clearCache(): void {
        this.groupCache.clear();
    }

    listGroups(): string[] {
        return Array.from(this.groups.keys());
    }
}
