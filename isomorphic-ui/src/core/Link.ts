import { LayoutComponent, IPrimitiveProps } from './LayoutComponent';
import { BrokerDOM } from '../BrokerDOM';

export interface ILinkProps extends IPrimitiveProps {
    to: string;
    color?: string;
    noDecoration?: boolean;
}

/**
 * Link Component — A specialized <a> tag that intercepts clicks for SPA navigation.
 */
export class Link extends LayoutComponent {
    private _targetPath: string;

    constructor(props: ILinkProps) {
        const { to, ...rest } = props;
        super('a', {
            ...rest,
            href: to,
            // Capture click at component level to ensure internal routing
            onClick: (e: Event) => {
                if (props.onClick) props.onClick(e);
                e.preventDefault();
                BrokerDOM.navigate(to);
            }
        });
        this._targetPath = to;
    }

    protected override getBaseClasses(): string {
        const props = this.props as ILinkProps;
        const classes = ['mesh-nav-link'];
        
        // Use high-priority mesh class for reliable theme mapping
        if (props.color) {
            classes.push(`mesh-text-${props.color}`);
        } else {
            // Default to 'text' color for high contrast on 'surface' backgrounds
            classes.push('mesh-text-text');
        }

        if (props.noDecoration) classes.push('text-decoration-none');
        return classes.join(' ');
    }

    public build() {
        return this.props.children;
    }
}
