import { Table, TableHead, TableRow, TableCell, TableBody, Badge, Heading, Section, DataTable } from '@flybyme/isomorphic-ui';
import { BaseDemoSection } from './BaseDemoSection';

export class DataSection extends BaseDemoSection {
    constructor() {
        const dummyData = Array.from({ length: 57 }, (_, i) => ({
            id: `node-${(i + 1).toString().padStart(3, '0')}`,
            type: ['Orchestrator', 'CDN Delivery', 'Storage', 'Compute', 'Gateway'][Math.floor(Math.random() * 5)],
            status: ['Running', 'Degraded', 'Offline', 'Starting'][Math.floor(Math.random() * 4)],
            heartbeat: `${Math.floor(Math.random() * 500)}ms`
        }));

        super('Data Tables', [
            new Heading(5, { text: 'Interactive Datatable', marginBottom: '3' }),
            new DataTable({
                columns: [
                    { key: 'id', label: 'Node ID', sortable: true },
                    { key: 'type', label: 'Type', sortable: true },
                    { key: 'status', label: 'Status', sortable: true },
                    { key: 'heartbeat', label: 'Heartbeat', sortable: true }
                ],
                data: dummyData,
                initialEntriesPerPage: 10
            }),
            
            new Section({ my: '5', children: new Section({ tagName: 'hr' }) }),

            new Heading(5, { text: 'Standard Responsive Table', marginBottom: '3' }),
            new Table({
                responsive: true,
                hover: true,
                striped: true,
                children: [
                    new TableHead({
                        children: [
                            new TableRow({
                                children: [
                                    new TableCell({ isHeader: true, text: 'Node ID' }),
                                    new TableCell({ isHeader: true, text: 'Type' }),
                                    new TableCell({ isHeader: true, text: 'Status' }),
                                    new TableCell({ isHeader: true, text: 'Heartbeat' })
                                ]
                            })
                        ]
                    }),
                    new TableBody({
                        children: [
                            new TableRow({
                                children: [
                                    new TableCell({ text: 'node-alpha-44' }),
                                    new TableCell({ text: 'Orchestrator' }),
                                    new TableCell({ children: new Badge({ variant: 'success', text: 'Running' }) }),
                                    new TableCell({ text: '2ms' })
                                ]
                            }),
                            new TableRow({
                                children: [
                                    new TableCell({ text: 'edge-bravo-12' }),
                                    new TableCell({ text: 'CDN Delivery' }),
                                    new TableCell({ children: new Badge({ variant: 'warning', text: 'Degraded' }) }),
                                    new TableCell({ text: '450ms' })
                                ]
                            }),
                            new TableRow({
                                variant: 'danger',
                                children: [
                                    new TableCell({ text: 'edge-charlie-09' }),
                                    new TableCell({ text: 'Storage' }),
                                    new TableCell({ children: new Badge({ variant: 'danger', text: 'Offline' }) }),
                                    new TableCell({ text: 'N/A' })
                                ]
                            })
                        ]
                    })
                ]
            }),

            new Heading(5, { text: 'Compact Dark Table', mt: 5, mb: 3 }),
            new Table({
                variant: 'dark',
                compact: true,
                striped: true,
                children: [
                    new TableHead({
                        children: [
                            new TableRow({
                                children: [
                                    new TableCell({ isHeader: true, text: '#' }),
                                    new TableCell({ isHeader: true, text: 'Service' }),
                                    new TableCell({ isHeader: true, text: 'Version' }),
                                    new TableCell({ isHeader: true, text: 'Load' })
                                ]
                            })
                        ]
                    }),
                    new TableBody({
                        children: [
                            new TableRow({ children: [ new TableCell({ text: '1' }), new TableCell({ text: 'Auth API' }), new TableCell({ text: 'v2.4.1' }), new TableCell({ text: '12%' }) ] }),
                            new TableRow({ children: [ new TableCell({ text: '2' }), new TableCell({ text: 'Mesh Gateway' }), new TableCell({ text: 'v1.1.0' }), new TableCell({ text: '85%' }) ] }),
                            new TableRow({ children: [ new TableCell({ text: '3' }), new TableCell({ text: 'Data Sync' }), new TableCell({ text: 'v0.9.8-beta' }), new TableCell({ text: '44%' }) ] })
                        ]
                    })
                ]
            }),

            new Heading(5, { text: 'Bordered & Centered', mt: 5, mb: 3 }),
            new Table({
                bordered: true,
                alignVertical: 'middle',
                children: [
                    new TableHead({
                        variant: 'light',
                        children: [
                            new TableRow({
                                children: [
                                    new TableCell({ isHeader: true, text: 'Component' }),
                                    new TableCell({ isHeader: true, text: 'Maintenance' }),
                                    new TableCell({ isHeader: true, text: 'Last Check' })
                                ]
                            })
                        ]
                    }),
                    new TableBody({
                        children: [
                            new TableRow({
                                children: [
                                    new TableCell({ text: 'Primary DB' }),
                                    new TableCell({ children: new Badge({ variant: 'info', text: 'Weekly' }) }),
                                    new TableCell({ text: '2024-03-20' })
                                ]
                            }),
                            new TableRow({
                                children: [
                                    new TableCell({ text: 'Cache Cluster' }),
                                    new TableCell({ children: new Badge({ variant: 'info', text: 'Daily' }) }),
                                    new TableCell({ text: '2024-03-22' })
                                ]
                            })
                        ]
                    })
                ]
            })
        ]);
    }
}
