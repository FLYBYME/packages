import { Section, Heading, ComponentChild } from '@flybyme/isomorphic-ui';

/**
 * BaseDemoSection - A helper to wrap demo content in a consistent card layout.
 */
export abstract class BaseDemoSection extends Section {
    constructor(title: string, content: ComponentChild | ComponentChild[]) {
        super({
            marginBottom: '5',
            children: [
                new Heading(3, { text: title, marginBottom: '3', className: 'text-primary' }),
                new Section({
                    padding: '4',
                    className: 'card shadow-sm border-0',
                    children: content
                })
            ]
        });
    }
}
