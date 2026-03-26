export interface IKVEntry<TValue> {
    key: string;
    value: TValue;
    ttl: number; // absolute timestamp
    version: number;
    ownerID: string;
}

export interface IKVStorageAdapter {
    get<T>(key: string): Promise<IKVEntry<T> | null>;
    set<T>(entry: IKVEntry<T>): Promise<void>;
    delete(key: string): Promise<boolean>;
    cleanup(): Promise<number>;
}
