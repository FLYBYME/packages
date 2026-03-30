import { Row, Col, Heading, ListGroup, ListGroupItem, Section, SmallText, Progress, ProgressBar, Spinner } from '@flybyme/isomorphic-ui';
import { BaseDemoSection } from './BaseDemoSection';

export class SystemsSection extends BaseDemoSection {
    private syncBar: ProgressBar;
    private progressValue = 0;

    constructor() {
        const syncBar = new ProgressBar({ value: 0, variant: 'primary', striped: true, animated: true });
        
        super('Lists & Progress', [
            new Row({
                children: [
                    new Col({
                        span: 6,
                        children: [
                            new Heading(5, { text: 'Default List Group', marginBottom: '3' }),
                            new ListGroup({
                                mb: 4,
                                children: [
                                    new ListGroupItem({ active: true, text: 'Active Mesh Node' }),
                                    new ListGroupItem({ text: 'Secondary Gateway' }),
                                    new ListGroupItem({ variant: 'danger', text: 'Offline Peer' }),
                                    new ListGroupItem({ disabled: true, text: 'Unauthorized Node' })
                                ]
                            }),

                            new Heading(5, { text: 'Flush List Group', marginBottom: '3' }),
                            new ListGroup({
                                flush: true,
                                mb: 4,
                                children: [
                                    new ListGroupItem({ text: 'An item' }),
                                    new ListGroupItem({ text: 'A second item' }),
                                    new ListGroupItem({ text: 'A third item' })
                                ]
                            }),

                            new Heading(5, { text: 'Numbered List Group', marginBottom: '3' }),
                            new ListGroup({
                                numbered: true,
                                mb: 4,
                                children: [
                                    new ListGroupItem({ text: 'Initialize Cluster' }),
                                    new ListGroupItem({ text: 'Verify Nodes' }),
                                    new ListGroupItem({ text: 'Start Sync' })
                                ]
                            })
                        ]
                    }),
                    new Col({
                        span: 6,
                        children: [
                            new Heading(5, { text: 'Horizontal List Group', marginBottom: '3' }),
                            new ListGroup({
                                horizontal: true,
                                mb: 4,
                                children: [
                                    new ListGroupItem({ text: '1' }),
                                    new ListGroupItem({ text: '2' }),
                                    new ListGroupItem({ text: '3' })
                                ]
                            }),

                            new Heading(5, { text: 'System Progress', marginBottom: '3' }),
                            new Section({ marginBottom: '3', children: [
                                new SmallText({ text: 'Syncing Data...', displayBlock: true, marginBottom: '1' }),
                                new Progress({ 
                                    height: 10,
                                    children: syncBar
                                })
                            ]}),
                            new Section({ marginBottom: '3', children: [
                                new SmallText({ text: 'Deployment Status', displayBlock: true, marginBottom: '1' }),
                                new Progress({ 
                                    children: new ProgressBar({ value: 100, variant: 'success', label: 'Completed' })
                                })
                            ]}),
                            new Section({ marginBottom: '3', children: [
                                new SmallText({ text: 'Multiple Bars', displayBlock: true, marginBottom: '1' }),
                                new Progress({ 
                                    children: [
                                        new ProgressBar({ value: 15, variant: 'success' }),
                                        new ProgressBar({ value: 30, variant: 'warning' }),
                                        new ProgressBar({ value: 20, variant: 'danger' })
                                    ]
                                })
                            ]}),

                            new Heading(5, { text: 'Spinners', mt: 4, mb: 3 }),
                            new Section({
                                display: 'flex', gap: 4, mt: 2, alignItems: 'center',
                                children: [
                                    new Spinner({ variant: 'primary' }),
                                    new Spinner({ type: 'grow', variant: 'success' }),
                                    new Spinner({ type: 'border', size: 'sm', variant: 'danger' }),
                                    new Spinner({ type: 'grow', size: 'sm', variant: 'warning' })
                                ]
                            })
                        ]
                    })
                ]
            })
        ]);

        this.syncBar = syncBar;
        
        // Start live update timer
        setInterval(() => {
            this.progressValue = (this.progressValue + 5) % 105;
            this.syncBar.setProps({ value: this.progressValue });
        }, 1000);
    }
}
