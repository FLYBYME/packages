import { IServiceRegistry } from '@flybyme/isomorphic-core';
import {
    BrokerPage, ComponentChild, BrokerDOM, Row, Col,
    Section, CardBody, CardFooter, Button, Heading,
    SmallText, Badge, Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter,
    FormLabel, FormControl, FormSelect,
    ButtonGroup, KanbanBoard, KanbanColumn, KanbanCard
} from '@flybyme/isomorphic-ui';
import { Task } from 'src/schemas/task.schema';

export class Dashboard extends BrokerPage {
    private unsubTasks?: () => void;
    private createModal?: Modal;

    constructor() {
        super('div', { display: 'flex', flexDirection: 'column', className: 'mesh-dashboard' });
        this.initCreateModal();
    }

    private initCreateModal() {
        this.createModal = new Modal({
            id: 'createTaskModal',
            children: [
                new ModalHeader({ 
                    onClose: () => this.createModal?.hide(),
                    children: new ModalTitle({ text: 'Create New Task' }) 
                }),
                new ModalBody({
                    children: [
                        new FormLabel({ text: 'Task Title' }),
                        new FormControl({
                            id: 'newTaskTitle',
                            type: 'text',
                            placeholder: 'Enter task title...'
                        }),
                        new Section({ mt: 3 }),
                        new FormLabel({ text: 'Description' }),
                        new FormControl({
                            id: 'newTaskDesc',
                            type: 'text',
                            tagName: 'textarea',
                            placeholder: 'Task description...'
                        }),
                        new Section({ mt: 3 }),
                        new FormLabel({ text: 'Priority' }),
                        new FormSelect({
                            id: 'newTaskPriority',
                            children: [
                                new Section({ tagName: 'option', text: 'low', value: 'low' }),
                                new Section({ tagName: 'option', text: 'medium', value: 'medium', selected: true }),
                                new Section({ tagName: 'option', text: 'high', value: 'high' }),
                                new Section({ tagName: 'option', text: 'urgent', value: 'urgent' })
                            ]
                        }),
                        new Section({ mt: 3 }),
                        new FormLabel({ text: 'Tags (comma separated)' }),
                        new FormControl({
                            id: 'newTaskTags',
                            type: 'text',
                            placeholder: 'frontend, ui, bug'
                        })
                    ]
                }),
                new ModalFooter({
                    children: [
                        new Button({ variant: 'secondary', text: 'Cancel', onClick: () => this.createModal?.hide() }),
                        new Button({
                            variant: 'primary',
                            text: 'Create Task',
                            onClick: async () => {
                                await this.submitNewTask();
                                this.createModal?.hide();
                            }
                        })
                    ]
                })
            ]
        });
    }

    // ========================================================================
    // BrokerPage Abstract Implementations
    // ========================================================================

    public getSEO(): Partial<{ title: string; description: string; canonical: string }> {
        return {
            title: 'Task Board | Mesh Tasker',
            description: 'Kanban board for distributed tasks.'
        };
    }

    public async onEnter(_params: Record<string, unknown>): Promise<void> {
        this.logger.info('onEnter called. Setting up mesh sync and header actions.');

        // Initial state seed to ensure paths exist for auto-subscription
        const state = BrokerDOM.getStateService();
        if (state.getValue<Task[]>('$data.tasks') === undefined) {
            state.set('$data.tasks', []);
        }

        const broker = BrokerDOM.getBroker();

        // 1. Subscribe to mesh events to update state reactively
        this.unsubTasks = broker.on('tasks.updated', (updatedTask: Task) => {
            this.logger.info('Task updated via mesh:', { updatedTask });
            const currentTasks = state.getValue<Task[]>('$data.tasks') || [];
            const index = currentTasks.findIndex((t: Task) => t.id === updatedTask.id);
            if (index !== -1) {
                currentTasks[index] = updatedTask;
                state.set('$data.tasks', [...currentTasks]);
            }
        });

        // 2. Set dynamic header actions
        this.logger.info('setting header actions...');
        this.setHeaderActions([
            new Button({
                variant: 'info',
                text: 'Send Test Log',
                className: 'me-2',
                onClick: () => {
                    this.logger.info('Test log from browser via Mesh', { 
                        timestamp: Date.now(), 
                        source: 'Dashboard UI' 
                    });
                }
            }),
            new Button({
                variant: 'primary',
                text: '+ New Task',
                onClick: () => this.createModal?.show()
            })
        ]);

        // 3. Fetch the initial data
        await this.loadTasks();
    }

    public async onLeave(): Promise<boolean> {
        if (this.unsubTasks) {
            this.unsubTasks();
            this.unsubTasks = undefined;
        }
        // Contributions are automatically cleared by RouterView via BrokerPage methods
        return true;
    }

    public getPageConfig() {
        return {
            title: 'Task Board'
        };
    }

    // ========================================================================
    // Mesh Network RPC Integrations
    // ========================================================================

    private async loadTasks() {
        try {
            const registry = this.app.getProvider<IServiceRegistry>('registry');
            await registry.waitForService('tasks', 10000);

            const broker = BrokerDOM.getBroker();
            if (!broker) throw new Error('Broker is offline.');

            const tasks = await broker.call<Task[]>('tasks.find', {});
            BrokerDOM.getStateService().set('$data.tasks', tasks);
        } catch (error) {
            this.logger.error('Failed to load tasks:', { error });
        }
    }

    private async submitNewTask() {
        const input = document.getElementById('newTaskTitle') as HTMLInputElement;
        const title = input?.value;
        if (!title) return;

        const descInput = document.getElementById('newTaskDesc') as HTMLTextAreaElement;
        const priorityInput = document.getElementById('newTaskPriority') as HTMLSelectElement;
        const tagsInput = document.getElementById('newTaskTags') as HTMLInputElement;

        const tags = tagsInput?.value ? tagsInput.value.split(',').map(t => t.trim()).filter(Boolean) : [];

        try {
            const broker = BrokerDOM.getBroker();
            if (!broker) throw new Error('Broker is offline.');

            const id = 'task-' + Math.random().toString(36).substring(2, 9);
            await broker.call('tasks.create', {
                id,
                title,
                description: descInput?.value || '',
                priority: priorityInput?.value || 'medium',
                tags,
                status: 'backlog',
                assignedTo: 'system',
                createdAt: Date.now()
            });

            // Clear inputs
            input.value = '';
            if (descInput) descInput.value = '';
            if (tagsInput) tagsInput.value = '';

            // The tasks.updated event or loadTasks will refresh the UI
            await this.loadTasks();

        } catch (error) {
            this.logger.error('Failed to create task:', { error });
        }
    }

    private async handleToggleStatus(taskId: string) {
        try {
            const broker = BrokerDOM.getBroker();
            if (!broker) throw new Error('Broker is offline.');

            await broker.call('tasks.toggleStatus', { id: taskId });
            await this.loadTasks();
        } catch (error) {
            this.logger.error('Failed to toggle task status:', { error });
        }
    }

    private async handleDelete(taskId: string) {
        if (!confirm('Are you sure you want to delete this task?')) return;

        try {
            const broker = BrokerDOM.getBroker();
            if (!broker) throw new Error('Broker is offline.');

            await broker.call('tasks.remove', { id: taskId });
            await this.loadTasks();
        } catch (error) {
            this.logger.error('Failed to delete task:', { error });
        }
    }

    // ========================================================================
    // UI Construction
    // ========================================================================

    public build(): ComponentChild[] {
        // This read pulls the fresh array every time this.update() is called
        const tasks = BrokerDOM.getStateService().getValue<Task[]>('$data.tasks') || [];

        const totalTasks = tasks.length;
        const progress = totalTasks === 0 ? 0 : Math.round((tasks.filter((t: Task) => t.status === 'completed').length / totalTasks) * 100);

        return [
            new KanbanBoard({
                children: [
                    // Header progress (span the full width above columns)
                    new Col({ span: 12, mb: 2, children: [
                        new Section({
                            mb: 4,
                            children: [
                                new Section({ display: 'flex', justifyContent: 'between', mb: 1, children: [
                                    new SmallText({ text: 'Project Progress', color: 'muted', weight: 'bold' }),
                                    new SmallText({ text: `${progress}%`, color: 'muted', weight: 'bold' })
                                ]}),
                                new Section({
                                    className: 'progress',
                                    style: { height: '10px' },
                                    children: new Section({
                                        className: 'progress-bar bg-success',
                                        role: 'progressbar',
                                        style: { width: `${progress}%` },
                                        'aria-valuenow': progress,
                                        'aria-valuemin': 0,
                                        'aria-valuemax': 100
                                    })
                                })
                            ]
                        })
                    ]}),

                    this.buildKanbanColumn('Backlog', 'backlog', 'secondary', tasks),
                    this.buildKanbanColumn('Pending', 'pending', 'info', tasks),
                    this.buildKanbanColumn('Active', 'active', 'primary', tasks),
                    this.buildKanbanColumn('Review', 'review', 'warning', tasks),
                    this.buildKanbanColumn('Completed', 'completed', 'success', tasks)
                ]
            }),

            // Create Task Modal
            this.createModal!
        ];
    }

    private buildKanbanColumn(title: string, statusFilter: string, _color: string, allTasks: Task[]): ComponentChild {
        const columnTasks = allTasks.filter(t => {
            const status = (t.status || 'pending').toLowerCase();
            return status === statusFilter.toLowerCase();
        });

        return new KanbanColumn({
            title,
            status: statusFilter,
            onCardDrop: (id, newStatus) => this.handleDrop(id, newStatus),
            headerChildren: new Badge({ variant: 'light', text: columnTasks.length.toString(), color: 'dark' }),
            children: columnTasks.map(task => this.buildTaskCard(task))
        });
    }

    private handleDrop = async (taskId: string, newStatus: string) => {
        try {
            const broker = BrokerDOM.getBroker();
            if (!broker) throw new Error('Broker is offline.');

            await broker.call('tasks.update', {
                id: taskId,
                status: newStatus
            });
            await this.loadTasks();
        } catch (error) {
            this.logger.error('Failed to move task:', { error });
        }
    };

    private async handleMakePending(taskId: string) {
        try {
            const broker = BrokerDOM.getBroker();
            if (!broker) throw new Error('Broker is offline.');

            await broker.call('tasks.update', {
                id: taskId,
                status: 'pending'
            });
        } catch (error) {
            this.logger.error('Failed to make task pending:', { error });
        }
    }

    private buildTaskCard(task: Task): ComponentChild {
        const priorityColors: Record<string, 'success' | 'warning' | 'primary' | 'secondary' | 'danger' | 'info' | 'light' | 'dark'> = { low: 'secondary', medium: 'info', high: 'warning', urgent: 'danger' };
        const pColor = priorityColors[task.priority] || 'info';

        return new KanbanCard({
            id: task.id,
            children: [
                new CardBody({
                    padding: 3,
                    children: [
                        new Row({
                            justifyContent: 'between',
                            children: [
                                new Col({ children: new Heading(6, { text: task.title || 'Untitled Task', mb: 1 }) }),
                                new Col({ 
                                    textAlign: 'right',
                                    children: new Badge({ variant: pColor, text: task.priority || 'medium', className: 'ms-2' })
                                })
                            ]
                        }),
                        task.description && new SmallText({ text: task.description, color: 'muted', mb: 2, className: 'd-block' }),
                        new Section({
                            display: 'flex', gap: 1, mb: 2, className: 'flex-wrap',
                            children: (task.tags || []).map((tag: string) => new Badge({ variant: 'light', text: tag, color: 'dark', className: 'border' }))
                        }),
                        new SmallText({ text: task.id, color: 'muted', className: 'x-small font-monospace' })
                    ]
                }),
                new CardFooter({
                    padding: 2, display: 'flex', justifyContent: 'between', className: 'bg-transparent border-top border-secondary border-opacity-10',
                    children: [
                        new ButtonGroup({
                            ariaLabel: 'Task actions',
                            children: [
                                new Button({
                                    variant: 'danger',
                                    size: 'sm',
                                    text: 'Drop',
                                    onClick: () => this.handleDelete(task.id)
                                }),
                                new Button({
                                    variant: task.status === 'completed' ? 'secondary' : 'primary',
                                    size: 'sm',
                                    text: task.status === 'completed' ? 'Reopen' : 'Advance →',
                                    onClick: () => this.handleToggleStatus(task.id)
                                }),
                                task.status !== 'pending' && new Button({
                                    variant: 'primary',
                                    size: 'sm',
                                    text: 'Make pending',
                                    onClick: () => this.handleMakePending(task.id)
                                })
                            ]
                        })
                    ]
                })
            ]
        });
    }
}