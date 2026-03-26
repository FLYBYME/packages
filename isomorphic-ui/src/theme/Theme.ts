import { BrokerDOM } from '../BrokerDOM';

export class Theme {
    public static color(name: string): string {
        const manifest = BrokerDOM.getManifest();
        const colors = manifest?.design?.tokens?.colors;
        if (colors && colors[name]) {
            return colors[name];
        }

        // Fallback colors matching CSS variables in BrokerComponent
        const fallbacks: Record<string, string> = {
            background: '#0f172a',
            surface: '#1e293b',
            text: '#f8fafc',
            muted: '#94a3b8',
            primary: '#4f46e5'
        };

        return fallbacks[name] || '#000000';
    }
}
