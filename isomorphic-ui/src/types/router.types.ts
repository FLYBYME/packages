import { IMeshContext } from '../BrokerDOM';

export type RouteGuard = (ctx: IMeshContext) => Promise<boolean> | boolean;

export interface RouteConfig {
    path: string | RegExp;
    component: { new (...args: unknown[]): unknown };
    guards?: RouteGuard[];
    meta?: Record<string, unknown>;
}

export interface CurrentRoute {
    path: string;
    componentClass: { new (...args: unknown[]): unknown };
}
