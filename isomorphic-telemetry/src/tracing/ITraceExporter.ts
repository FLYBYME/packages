export interface ISpan {
    traceId: string;
    spanId: string;
    parentId?: string;
    name: string;
    startTime: number;
    endTime?: number;
    tags?: Record<string, string | number | boolean>;
}

/**
 * ITraceExporter — Interface for exporting strictly-typed span data.
 */
export interface ITraceExporter {
    name: string;
    export(spans: ISpan[]): Promise<void>;
}
