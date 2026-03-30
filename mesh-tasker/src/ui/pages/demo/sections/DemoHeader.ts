import { Row, Col, Heading, LeadText, Section } from '@flybyme/isomorphic-ui';

export class DemoHeader extends Row {
    constructor() {
        super({
            marginBottom: '5',
            children: [
                new Col({
                    span: 12,
                    children: [
                        new Heading(1, { text: 'Broker Design System', marginBottom: '2' }),
                        new LeadText({ muted: true, text: 'A programmatic UI library built with Bootstrap 5 and Isomorphic-UI reactivity.' }),
                        new Section({ tagName: 'hr', my: '4' })
                    ]
                })
            ]
        });
    }
}
