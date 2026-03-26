/**
 * ComponentRegistry
 * Simple global registry for UI components, moved from the deleted isomorphic-ui.
 */
export class ComponentRegistry {
    private static components: Map<string, unknown> = new Map();

    public static register(name: string, component: unknown) {
        this.components.set(name, component);
    }

    public static resolve(name: string): unknown {
        return this.components.get(name);
    }

    public static list(): string[] {
        return Array.from(this.components.keys());
    }
}
