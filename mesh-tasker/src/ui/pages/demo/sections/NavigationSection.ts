import { Breadcrumb, BreadcrumbItem, Pagination, PageItem, PageLink, Heading, Box } from '@flybyme/isomorphic-ui';
import { BaseDemoSection } from './BaseDemoSection';

export class NavigationSection extends BaseDemoSection {
    constructor() {
        super('Navigation', [
            new Heading(5, { text: 'Breadcrumbs', marginBottom: '3' }),
            new Breadcrumb({
                divider: "'>'",
                className: 'mb-4',
                children: [
                    new BreadcrumbItem({ href: '#', text: 'Design System' }),
                    new BreadcrumbItem({ href: '#', text: 'Components' }),
                    new BreadcrumbItem({ active: true, text: 'Breadcrumbs' })
                ]
            }),

            new Heading(5, { text: 'Pagination', marginBottom: '3' }),
            new Box({
                className: 'd-flex gap-4 flex-wrap align-items-center',
                children: [
                    // Standard
                    new Pagination({
                        ariaLabel: 'Search results',
                        children: [
                            new PageItem({ disabled: true, children: new PageLink({ text: 'Previous' }) }),
                            new PageItem({ children: new PageLink({ href: '#', text: '1' }) }),
                            new PageItem({ active: true, children: new PageLink({ text: '2' }) }),
                            new PageItem({ children: new PageLink({ href: '#', text: '3' }) }),
                            new PageItem({ children: new PageLink({ href: '#', text: 'Next' }) })
                        ]
                    }),

                    // Small Icons
                    new Pagination({
                        size: 'sm',
                        children: [
                            new PageItem({ children: new PageLink({ href: '#', label: 'Previous', icon: true, text: '«' }) }),
                            new PageItem({ children: new PageLink({ href: '#', text: '1' }) }),
                            new PageItem({ active: true, children: new PageLink({ text: '2' }) }),
                            new PageItem({ children: new PageLink({ href: '#', label: 'Next', icon: true, text: '»' }) })
                        ]
                    })
                ]
            })
        ]);
    }
}
