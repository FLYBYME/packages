import { BrokerDOM } from '../BrokerDOM';
import { IMeshApp, ILogger } from '@flybyme/isomorphic-core';
import { StyleProps } from './types/styleProps';
import { mapStyleProps } from './utils/styleMapper';

export type ComponentChild = string | number | boolean | null | undefined | BrokerComponent;

export interface ILayoutProps extends StyleProps {
    flex?: boolean | number | string;
    direction?: 'row' | 'row-reverse' | 'column' | 'column-reverse' | 'col' | 'col-reverse';
    align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
    justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
    wrap?: boolean | 'wrap' | 'nowrap' | 'reverse';
    weight?: 'light' | 'normal' | 'bold';
    unstyled?: boolean;
    fullWidth?: boolean;
    shadow?: 'sm' | 'md' | 'lg';
    rounded?: boolean | string;
    textCenter?: boolean;
}

export interface IBaseUIProps extends ILayoutProps {
    key?: string | number;
    text?: string | number;
    children?: ComponentChild | ComponentChild[];
    style?: Record<string, string | number>;
    color?: string;
    background?: string;
    variant?: string;
    size?: string | number;
    onClick?: (e: Event) => void;
    tagName?: string;
    label?: string;
    ariaLabel?: string;
    [key: string]: unknown;
}

/**
 * BrokerComponent — The unified rendering engine.
 * Engineered for zero-duplication, perfect hydration, and full SPA reactivity.
 */
export abstract class BrokerComponent {
    public static readonly isBrokerUIComponent = true;
    public element: HTMLElement | null = null;
    public props: IBaseUIProps;
    protected app: IMeshApp;
    protected logger: ILogger;
    protected oldTree: ComponentChild[] = [];
    protected _isMounted = false;
    private _bindings: (() => void)[] = [];
    private _unsubscribes: (() => void)[] = [];
    private _isRendering = false;

    protected static RESERVED_PROPS = new Set([
        'key', 'text', 'children',
        'style', 'variant', 'size', 'tagName', 'label', 'ariaLabel',
        'flex', 'direction', 'gap', 'align', 'alignItems', 'justify', 'justifyContent', 'wrap',
        'padding', 'paddingX', 'paddingY', 'margin', 'marginX', 'marginY', 'marginTop', 'marginBottom',
        'weight', 'unstyled', 'fullWidth', 'shadow', 'rounded', 'background', 'color', 'textCenter',
        // Component Specific
        'outline', 'nowrap', 'active', 'toggle', 'dismiss', 'pill', 'indicator', 'positioned', 'hiddenText',
        'divider', 'flush', 'alwaysOpen', 'header', 'defaultOpen', 'accordionId', 'dismissible',
        'icon', 'onClose', 'show', 'vertical', 'switch', 'hasValidation', 'feedback', 'feedbackType',
        'border', 'textVariant', 'imgCap', 'overlay', 'horizontal', 'bgTransparent', 'align', 'body',
        // Carousel & Collapse Props
        'fade', 'dark', 'ride', 'interval', 'touch', 'active', 'controls', 'indicators', 'slide', 'slideTo',
        'onToggle',
        // ListGroup Props
        'numbered', 'action',
        // Modal Props
        'centered', 'scrollable', 'staticBackdrop', 'fullscreen',
        // Nav, Tab & Navbar Props
        'paneId', 'fill', 'justified', 'expand', 'placement', 'collapseId', 'container', 'sticky',
        // Dropdown Props
        'direction', 'split', 'align', 'autoClose', 'offset', 'display', 'dark', 'active',
        // Popover Props
        'popoverTitle', 'content', 'placement', 'trigger', 'html', 'sanitize', 'container', 'boundary', 'offset',
        // Progress Props
        'striped', 'animated',
        // Spinner Props
        'spinnerType',
        // Toast Props
        'autohide', 'delay', 'animation',
        // Tooltip Props
        'tooltipTitle', 'customClass',
        // Offcanvas Props
        'backdrop', 'scroll', 'targetId',
        // Generic Utility Props
        'fluid', 'role', 'colspan', 'rowspan',
        // Boolean Attributes
        'disabled', 'checked', 'selected', 'readonly', 'required'
    ]);

    constructor(public tagName: string = 'div', props: IBaseUIProps = {}) {
        this.props = props;
        this.app = BrokerDOM.getBroker().app;
        this.logger = BrokerDOM.getLogger().child({ component: this.constructor.name });
        if (typeof window !== 'undefined') BrokerDOM.registerComponent(this);
    }

    public abstract build(): ComponentChild | ComponentChild[];

    protected getUtilityClasses(props: IBaseUIProps): string[] {
        const c: string[] = [];
        if (props.weight) c.push(`fw-${props.weight}`);
        if (props.unstyled) c.push('list-unstyled');
        if (props.fullWidth) c.push('w-100');
        if (props.textCenter) c.push('text-center');
        if (props.shadow) c.push(`shadow-${props.shadow}`);
        if (props.rounded === true) c.push('rounded');
        else if (props.rounded) c.push(`rounded-${props.rounded}`);
        if (props.background) c.push(`mesh-bg-${props.background}`);

        // Use mapStyleProps to handle all margin, padding, flex, typography mapped correctly.
        // We import it locally to avoid circular dependency issues at the top level if needed, or just import it at top.
        // Actually it's imported at top? No we need to import it at top.
        return c;
    }

    protected applyDOMProps(props: IBaseUIProps): void {
        if (!this.element || this.tagName === 'fragment') return;
        const el = this.element;

        this._bindings.forEach(u => u());
        this._bindings = [];

        // 1. Classes
        const classes = [
            this.getBaseClasses(),
            this.getVariantClasses(props.variant),
            this.getSizeClasses(props.size),
            ...this.getUtilityClasses(props),
            ...mapStyleProps(props)
        ];
        const classStr = this.clsx(...classes);
        if (classStr) {
            el.setAttribute('class', classStr);
        } else {
            el.removeAttribute('class');
        }

        // 2. Styles
        const styles = { ...this.getLayoutStyles(props), ...(props.style || {}) };
        // Clear all previous inline styles to ensure removals are respected
        el.removeAttribute('style');

        Object.entries(styles).forEach(([k, v]) => {
            const kebab = k.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
            const val = this.evaluateExpression(v);
            const str = String(val);
            el.style.setProperty(kebab, str.replace(' !important', ''), str.includes('important') ? 'important' : '');
        });

        // 3. Attributes & Events
        const BOOLEAN_PROPS = ['disabled', 'checked', 'selected', 'readonly', 'required'];
        const DIRECT_PROPS = ['value', 'innerText', 'innerHTML', 'dangerouslySetInnerHTML'];

        Object.entries(props).forEach(([k, v]) => {
            if (k.startsWith('on') && typeof v === 'function') {
                const eventName = k.toLowerCase();
                (el as unknown as Record<string, unknown>)[eventName] = v;
                return;
            }

            if (BOOLEAN_PROPS.includes(k)) {
                const res = this.evaluateExpression(v);
                (el as unknown as Record<string, unknown>)[k] = !!res;
                // Also set attribute for CSS selectors like [disabled]
                if (res) el.setAttribute(k, '');
                else el.removeAttribute(k);
                return;
            }

            if (DIRECT_PROPS.includes(k)) {
                const res = this.evaluateExpression(v);
                if (k === 'dangerouslySetInnerHTML') {
                    el.innerHTML = res != null ? String(res) : '';
                } else {
                    (el as unknown as Record<string, unknown>)[k] = res != null ? res : '';
                }
                return;
            }

            if (BrokerComponent.RESERVED_PROPS.has(k) || typeof v === 'function' || k.startsWith('class.')) return;

            // SPECIAL CASE: Dynamic ARIA updates
            if (k === 'show' && this.tagName === 'div' && el.classList.contains('modal')) {
                el.setAttribute('aria-hidden', v ? 'false' : 'true');
            }

            const res = this.evaluateExpression(v);
            if (res == null) el.removeAttribute(k);
            else el.setAttribute(k, String(res));
        });

        // 4. class.X bindings
        Object.entries(props).forEach(([k, v]) => {
            if (k.startsWith('class.')) {
                const className = k.split('.')[1];
                const res = this.evaluateExpression(v);
                el.classList.toggle(className, !!res);
            }
        });
    }

    private evaluateExpression(expr: unknown): unknown {
        // 1. Early exit for static props
        if (typeof expr !== 'string' || !expr.includes('$state.')) return expr;

        const state = BrokerDOM.getStateService();

        // 2. Extract ALL state dependencies in the string for subscription
        // Support hyphens and bracketed notation in paths
        const pathRegex = /\$state\.([a-zA-Z0-9._$[\]"'-]+)/g;
        let match;
        pathRegex.lastIndex = 0;
        while ((match = pathRegex.exec(expr)) !== null) {
            const rawPath = match[1];
            const path = rawPath.replace(/\[["']?(.+?)["']?\]/g, '.$1').replace(/^\./, '');
            const unsub = state.subscribe(path, () => this.update());
            this._bindings.push(unsub);
        }

        // 3. Transform the string into safely executable code
        const isPure = expr.trim().startsWith('$state.');

        let finalBody: string;
        if (isPure) {
            finalBody = expr.replace(
                pathRegex,
                (match, rawPath) => {
                    const path = rawPath.replace(/\[["']?(.+?)["']?\]/g, '.$1').replace(/^\./, '');
                    return `$state.getValue(${JSON.stringify(path)})`;
                }
            );
        } else {
            const templateTransformed = expr.replace(
                pathRegex,
                (match, rawPath) => {
                    const path = rawPath.replace(/\[["']?(.+?)["']?\]/g, '.$1').replace(/^\./, '');
                    return `\${$state.getValue(${JSON.stringify(path)})}`;
                }
            );
            finalBody = `\`${templateTransformed}\``;
        }

        // 4. Evaluate the expression as native JavaScript
        try {
            // eslint-disable-next-line no-new-func
            const evaluator = new Function('$state', `return ${finalBody};`);
            return evaluator(state);
        } catch (error) {
            this.logger.warn(`Failed to evaluate expression: ${expr}`, { error: (error as Error).message });
            return null;
        }
    }

    /**
     * Update props and trigger a re-render.
     */
    public setProps(newProps: Partial<IBaseUIProps>): void {
        this.props = { ...this.props, ...newProps };
        this.update();
    }

    private static _renderQueue: Set<BrokerComponent> = new Set();
    private static _isProcessingQueue = false;
    private _isQueued = false;

    /**
     * Request an update for this component.
     * Deduplicates multiple requests and defers to next microtask to break recursive loops.
     */
    public update(): void {
        if (this._isQueued || (!this.element && this.tagName !== 'fragment')) {
            return;
        }

        this._isQueued = true;
        BrokerComponent._renderQueue.add(this);

        if (!BrokerComponent._isProcessingQueue) {
            BrokerComponent._isProcessingQueue = true;
            queueMicrotask(() => BrokerComponent.processRenderQueue());
        }
    }

    private static processRenderQueue(): void {
        this._isProcessingQueue = true;

        const queue = Array.from(this._renderQueue);
        this._renderQueue.clear();

        for (const component of queue) {
            component._isQueued = false;
            component.performInternalUpdate();
        }

        if (this._renderQueue.size > 0) {
            this.processRenderQueue();
        } else {
            this._isProcessingQueue = false;
        }
    }

    private performInternalUpdate(): void {
        if (this._isRendering || (!this.element && this.tagName !== 'fragment')) return;
        this._isRendering = true;

        try {
            const structure = this._buildWithTracking();
            const newTree = (Array.isArray(structure) ? structure : [structure])
                .filter(n => n !== null && n !== undefined && n !== false) as ComponentChild[];

            const container = (this.tagName === 'fragment') ? (this as unknown as { parentElement: HTMLElement }).parentElement : this.element;
            if (container) {
                this.reconcile(this.oldTree, newTree, container);
                this.oldTree = newTree;
                if (this.element) this.applyDOMProps(this.props);
            }
        } finally {
            this._isRendering = false;
        }
    }

    private _buildWithTracking(): ComponentChild | ComponentChild[] {
        this._unsubscribes.forEach(u => u());
        this._unsubscribes = [];

        const magic = (globalThis as unknown as { MeshMagicSauce: { subscriberStack: { invalidate: () => void, unsubscribes: (() => void)[] }[] } }).MeshMagicSauce || { subscriberStack: [] };
        (globalThis as unknown as Record<string, unknown>).MeshMagicSauce = magic;

        const entry = {
            invalidate: () => this.update(),
            unsubscribes: this._unsubscribes
        };

        magic.subscriberStack.push(entry);
        try {
            return this.build();
        } finally {
            magic.subscriberStack.pop();
        }
    }

    /**
     * Reconciles two lists of component children.
     * EXPECTS: oldTree and newTree to be pre-filtered (no null/false/undefined).
     * This ensures newTree[i] maps 1:1 to container.childNodes[i].
     */
    private reconcile(oldTree: ComponentChild[], newTree: ComponentChild[], container: HTMLElement): void {
        if (!container) return;
        const oldMap = new Map<string | number, { node: ComponentChild, index: number }>();
        oldTree.forEach((node, i) => {
            if (this.isComp(node) && node.props.key != null) {
                oldMap.set(node.props.key, { node, index: i });
            }
        });

        const newLen = newTree.length;
        const oldLen = oldTree.length;
        const consumedOldIndices = new Set<number>();

        for (let i = 0; i < newLen; i++) {
            const newNode = newTree[i];

            if (this.isComp(newNode) && newNode.props.key != null) {
                const keyed = oldMap.get(newNode.props.key);
                if (keyed) {
                    consumedOldIndices.add(keyed.index);
                    const targetDom = container.childNodes[keyed.index];
                    if (targetDom && targetDom !== container.childNodes[i]) {
                        container.insertBefore(targetDom, container.childNodes[i]);
                    }
                    this.patch(container, keyed.node, newNode, i);
                    continue;
                }
            }

            if (i < oldLen && !consumedOldIndices.has(i)) {
                const oldNode = oldTree[i];
                if (this.isComp(oldNode) && oldNode.props.key != null) {
                    this.patch(container, null, newNode, i);
                } else {
                    consumedOldIndices.add(i);
                    this.patch(container, oldNode, newNode, i);
                }
            } else {
                this.patch(container, null, newNode, i);
            }
        }

        // Cleanup any nodes that were not consumed
        for (let i = oldLen - 1; i >= 0; i--) {
            if (!consumedOldIndices.has(i)) {
                const oldNode = oldTree[i];
                const dom = container.childNodes[i];
                if (dom) {
                    this.deepDispose(oldNode, true);
                    if (dom.parentNode === container) {
                        container.removeChild(dom);
                    }
                }
            }
        }
    }

    private static readonly SELF_CLOSING_TAGS = new Set(['input', 'img', 'br', 'hr', 'meta', 'link']);

    private patch(parent: HTMLElement, oldNode: ComponentChild | null, newNode: ComponentChild, index: number): void {
        if (!parent) return;
        const dom = parent.childNodes[index] as HTMLElement;

        if (!dom) {
            this.mountChild(parent, newNode);
            if (this.isComp(newNode) && document.body.contains(parent)) {
                newNode.triggerMount();
            }
            return;
        }

        // Only recycle if constructor AND tagName matches AND it is actually an Element
        if (this.isComp(newNode) && this.isComp(oldNode) &&
            newNode.constructor === oldNode.constructor &&
            newNode.tagName === oldNode.tagName &&
            dom.nodeType === Node.ELEMENT_NODE) {

            if (newNode === oldNode) {
                newNode.update();
                return;
            }

            newNode.element = dom;
            newNode.oldTree = oldNode.oldTree;
            oldNode.dispose(false);
            newNode.performInternalUpdate();
            return;
        }

        if (oldNode) this.deepDispose(oldNode, true);
        const nodes = this.createNodes(newNode);
        if (nodes.length > 0) {
            if (dom.parentNode === parent) {
                parent.replaceChild(nodes[0], dom);
            } else {
                parent.insertBefore(nodes[0], parent.childNodes[index]);
            }
            for (let i = 1; i < nodes.length; i++) parent.insertBefore(nodes[i], parent.childNodes[index + i]);

            if (this.isComp(newNode) && document.body.contains(parent)) {
                newNode.triggerMount();
            }
        } else if (dom.parentNode === parent) {
            parent.removeChild(dom);
        }
    }

    public triggerMount(): void {
        if (this._isMounted) return;
        this._isMounted = true;
        this.onMount();
        if (Array.isArray(this.oldTree)) {
            this.oldTree.forEach(child => {
                if (this.isComp(child)) child.triggerMount();
            });
        }
    }

    private deepDispose(node: ComponentChild | ComponentChild[], removeDOM: boolean = true): void {
        if (node == null || node === false) return;
        if (Array.isArray(node)) {
            node.forEach(c => this.deepDispose(c, removeDOM));
            return;
        }
        if (this.isComp(node)) {
            this.deepDispose(node.oldTree, false);
            node.dispose(removeDOM);
            node._isMounted = false;
        }
    }

    private mountChild(parent: HTMLElement, node: ComponentChild | ComponentChild[]): void {
        if (node == null || node === false || !parent) return;

        // Safety: Check tagName existence and node type
        if (parent.nodeType !== Node.ELEMENT_NODE) return;
        if (parent.tagName && BrokerComponent.SELF_CLOSING_TAGS.has(parent.tagName.toLowerCase())) {
            return;
        }

        if (Array.isArray(node)) {
            node.forEach(child => this.mountChild(parent, child));
            return;
        }

        if (this.isComp(node)) {
            node.mount(parent);
        } else if (typeof node === 'string' && node.includes('$state.')) {
            this.createNodes(node).forEach(n => parent.appendChild(n));
        } else {
            parent.appendChild(document.createTextNode(String(node)));
        }
    }

    private createNodes(node: ComponentChild | ComponentChild[]): Node[] {
        if (node == null || node === false) return [];

        if (Array.isArray(node)) {
            return node.flatMap(c => this.createNodes(c));
        }

        if (this.isComp(node)) {
            if (node.tagName === 'fragment') {
                const structure = node._buildWithTracking();
                const tree = Array.isArray(structure) ? structure : [structure];
                return tree.flatMap(c => this.createNodes(c));
            }
            const dummy = document.createElement('div');
            node.mount(dummy);
            return Array.from(dummy.childNodes);
        }

        if (typeof node === 'string' && node.includes('$state.')) {
            const res = this.evaluateExpression(node);
            const tree = Array.isArray(res) ? res : [res];
            return tree.flatMap(c => this.createNodes(c));
        }

        return [document.createTextNode(String(node))];
    }

    private isComp(node: unknown): node is BrokerComponent {
        return !!(node && typeof node === 'object' && (node as Record<string, unknown>).constructor && (node.constructor as typeof BrokerComponent).isBrokerUIComponent);
    }

    public mount(parent: HTMLElement): HTMLElement[] {
        this._isRendering = true;

        if (this.tagName === 'fragment') {
            (this as unknown as { parentElement: HTMLElement }).parentElement = parent;
            const structure = this._buildWithTracking();
            this.oldTree = (Array.isArray(structure) ? structure : [structure])
                .filter(n => n !== null && n !== undefined && n !== false) as ComponentChild[];
            const nodes = this.oldTree.flatMap(child => {
                if (this.isComp(child)) return child.mount(parent);
                const text = document.createTextNode(String(child));
                parent.appendChild(text);
                return [text as unknown as HTMLElement];
            });
            this._isRendering = false;
            return nodes;
        }

        // REUSE: If this component was already mounted, we just move/keep the element
        if (!this.element) {
            const isSVG = this.tagName === 'svg' || (parent && parent.closest('svg'));
            if (isSVG) {
                this.element = document.createElementNS('http://www.w3.org/2000/svg', this.tagName) as unknown as HTMLElement;
            } else {
                this.element = document.createElement(this.tagName);
            }

            const el = this.element!;
            (el as unknown as Record<string, unknown>).__brokerInstance = this;

            const structure = this._buildWithTracking();
            this.oldTree = (Array.isArray(structure) ? structure : [structure])
                .filter(n => n !== null && n !== undefined && n !== false) as ComponentChild[];

            this.oldTree.forEach(child => {
                if (child == null || child === false) return;
                this.mountChild(el, child);
            });
        }

        const el = this.element!;
        (this as unknown as { parentElement: HTMLElement }).parentElement = parent;
        this.applyDOMProps(this.props);

        if (parent && !parent.contains(el)) {
            parent.appendChild(el);
        }

        this._isRendering = false;

        if (document.body.contains(el)) {
            this.triggerMount();
        }

        return [el];
    }

    public hydrate(el: HTMLElement): void {
        this.element = el;
        (el as HTMLElement & { __brokerInstance: BrokerComponent }).__brokerInstance = this;
        this.applyDOMProps(this.props);
        const structure = this._buildWithTracking();
        this.oldTree = (Array.isArray(structure) ? structure : [structure])
            .filter(n => n !== null && n !== undefined && n !== false) as ComponentChild[];
        const children = Array.from(el.childNodes);
        this.oldTree.forEach((child, i) => {
            if (this.isComp(child) && children[i]) child.hydrate(children[i] as HTMLElement);
        });
        if (document.body.contains(el)) {
            this.triggerMount();
        }
    }

    protected getBaseClasses() { return ''; }
    protected getVariantClasses(_v?: string) { return ''; }
    protected getSizeClasses(_s?: string | number) { return ''; }
    protected getLayoutStyles(p: IBaseUIProps): Record<string, string | number> {
        const s: Record<string, string | number> = {};
        if (p.flex) {
            s.display = 'flex !important';
            if (typeof p.flex !== 'boolean') s.flex = `${p.flex} !important`;
        }
        if (p.direction) s.flexDirection = (p.direction === 'col' ? 'column' : p.direction) + ' !important';
        if (p.gap) s.gap = (typeof p.gap === 'number' ? `${p.gap}px` : p.gap) + ' !important';
        if (p.align || p.alignItems) s.alignItems = (p.align || p.alignItems) + ' !important';
        if (p.justify || p.justifyContent) s.justifyContent = (p.justify || p.justifyContent) + ' !important';
        if (p.wrap) s.flexWrap = (p.wrap === true ? 'wrap' : p.wrap) + ' !important';

        if (p.top !== undefined && ![0, 50, 100].includes(p.top as number)) s.top = typeof p.top === 'number' ? `${p.top}px` : p.top;
        if (p.bottom !== undefined && ![0, 50, 100].includes(p.bottom as number)) s.bottom = typeof p.bottom === 'number' ? `${p.bottom}px` : p.bottom;
        if (p.left !== undefined && ![0, 50, 100].includes(p.left as number)) s.left = typeof p.left === 'number' ? `${p.left}px` : p.left;
        if (p.right !== undefined && ![0, 50, 100].includes(p.right as number)) s.right = typeof p.right === 'number' ? `${p.right}px` : p.right;
        if (p.zIndex !== undefined) s.zIndex = p.zIndex;

        return s;
    }

    protected clsx(...args: (string | undefined | null | boolean | string[])[]): string {
        return args.flat().filter(x => typeof x === 'string' && x.length > 0).join(' ');
    }

    public onMount() { }
    public dispose(removeDOM: boolean = true) {
        this._bindings.forEach(u => u());
        this._unsubscribes.forEach(u => u());
        if (removeDOM && this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}
