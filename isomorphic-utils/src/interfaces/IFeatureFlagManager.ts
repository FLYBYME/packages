/**
 * IFeatureFlagManager — Strict interface for feature flag management.
 */
export interface IFeatureFlagManager {
    /** Check if a feature is enabled for a given context */
    isEnabled(flag: string, context?: Record<string, unknown>): boolean;

    /** Get a map of all currently active flags */
    getFlags(): Record<string, boolean>;

    /** Synchronize local state with a remote flag set */
    sync(flags: Record<string, boolean>): void;
}
