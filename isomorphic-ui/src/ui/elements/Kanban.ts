import { BrokerComponent, ComponentChild, IBaseUIProps } from '../../core/BrokerComponent';
import { LayoutComponent, IPrimitiveProps } from '../../core/LayoutComponent';
import { Container, Row, Col, Box } from './Layout';

/**
 * KanbanBoard - The parent container for a Kanban board.
 */
export class KanbanBoard extends LayoutComponent {
    constructor(props: IPrimitiveProps = {}) {
        super('div', { 
            className: 'mesh-kanban-board p-4 flex-grow-1 overflow-auto',
            ...props 
        });
    }

    build(): ComponentChild | ComponentChild[] {
        return new Container({
            fluid: true,
            className: 'h-100 d-flex flex-column',
            children: new Row({
                className: 'g-4 pb-3',
                children: this.props.children
            })
        });
    }
}

/**
 * Props for KanbanColumn.
 */
export interface IKanbanColumnProps extends IPrimitiveProps {
    title: string;
    status: string;
    onCardDrop?: (id: string, newStatus: string) => void;
    headerChildren?: ComponentChild | ComponentChild[];
}

/**
 * KanbanColumn - A single column in the Kanban board.
 */
export class KanbanColumn extends LayoutComponent {
    constructor(props: IIKanbanColumnProps) {
        super('div', props);
    }

    build(): ComponentChild | ComponentChild[] {
        const props = this.props as IIKanbanColumnProps;
        
        return new Col({
            span: 12, mdSpan: 6, xlSpan: true,
            className: 'd-flex flex-column',
            children: new Box({
                className: 'card bg-light border-0 shadow-sm h-100',
                onDragOver: (e: DragEvent) => e.preventDefault(),
                onDrop: (e: DragEvent) => {
                    e.preventDefault();
                    const id = e.dataTransfer?.getData('text/plain');
                    if (id && props.onCardDrop) props.onCardDrop(id, props.status);
                },
                children: [
                    new Box({
                        className: 'card-header bg-transparent border-0 py-3 d-flex justify-content-between align-items-center',
                        children: [
                            new Box({ tagName: 'h6', className: 'mb-0 fw-bold', text: props.title }),
                            ...(Array.isArray(props.headerChildren) ? props.headerChildren : (props.headerChildren ? [props.headerChildren] : []))
                        ]
                    }),
                    new Box({
                        className: 'card-body p-3 d-flex flex-column gap-3',
                        style: { minHeight: '150px' },
                        children: props.children
                    })
                ]
            })
        });
    }
}

/**
 * Props for KanbanCard.
 */
export interface IKanbanCardProps extends IBaseUIProps {
    id: string;
}

/**
 * KanbanCard - A draggable card in the Kanban board.
 */
export class KanbanCard extends BrokerComponent {
    constructor(props: IKanbanCardProps) {
        super('div', {
            ...props,
            draggable: 'true',
            className: 'card shadow-sm border-secondary border-opacity-25 hover-shadow transition-all' + (props.className ? ` ${props.className}` : ''),
            onDragStart: (e: DragEvent) => {
                e.dataTransfer?.setData('text/plain', props.id);
            },
            style: { cursor: 'grab', ...props.style }
        });
    }

    build(): ComponentChild | ComponentChild[] {
        return this.props.children;
    }
}

// Internal alias fix for props inheritance
type IIKanbanColumnProps = IKanbanColumnProps;
