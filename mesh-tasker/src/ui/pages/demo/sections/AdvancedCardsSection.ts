import { Row, Col, Heading, Card, CardImage, CardBody, CardTitle, CardText, Button, CardImgOverlay, CardGroup, CardHeader, CardFooter } from '@flybyme/isomorphic-ui';
import { BaseDemoSection } from './BaseDemoSection';

export class AdvancedCardsSection extends BaseDemoSection {
    constructor() {
        super('Advanced Card System', [
            new Row({
                marginBottom: '4',
                children: [
                    new Col({
                        span: 6,
                        children: [
                            new Heading(5, { text: 'Horizontal Card', marginBottom: '3' }),
                            new Card({
                                horizontal: true,
                                children: [
                                    new Col({ mdSpan: 4, children: new CardImage({ src: 'https://placehold.co/400x600', className: 'img-fluid rounded-start', alt: 'Demo' }) }),
                                    new Col({ mdSpan: 8, children: new CardBody({
                                        children: [
                                            new CardTitle({ text: 'Side-by-Side' }),
                                            new CardText({ text: 'Perfect for articles or profile snippets. Grid logic is handled internally.' }),
                                            new Button({ variant: 'link', label: 'Read more', padding: '0' })
                                        ]
                                    })})
                                ]
                            })
                        ]
                    }),
                    new Col({
                        span: 6,
                        children: [
                            new Heading(5, { text: 'Image Overlay', marginBottom: '3' }),
                            new Card({
                                className: 'text-white border-0 overflow-hidden',
                                children: [
                                    new CardImage({ src: 'https://placehold.co/800x400', overlay: true, alt: 'Background' }),
                                    new CardImgOverlay({
                                        children: [
                                            new CardTitle({ text: 'Overlay Title' }),
                                            new CardText({ text: 'Supporting text that floats over the content image background.' }),
                                            new CardText({ text: 'Last updated 3 mins ago', className: 'small' })
                                        ]
                                    })
                                ]
                            })
                        ]
                    })
                ]
            }),
            new Row({
                children: [
                    new Col({
                        span: 12,
                        children: [
                            new Heading(5, { text: 'Card Group', marginBottom: '3' }),
                            new CardGroup({
                                children: [
                                    new Card({
                                        children: [
                                            new CardHeader({ text: 'Featured' }),
                                            new CardBody({ children: [
                                                new CardTitle({ text: 'Phase 1' }),
                                                new CardText({ text: 'Infrastructure deployment.' })
                                            ]}),
                                            new CardFooter({ text: '12-05-2026' })
                                        ]
                                    }),
                                    new Card({
                                        variant: 'primary',
                                        textVariant: 'white',
                                        children: [
                                            new CardHeader({ text: 'In Progress', bgTransparent: true }),
                                            new CardBody({ children: [
                                                new CardTitle({ text: 'Phase 2' }),
                                                new CardText({ text: 'API Gateway integration.' })
                                            ]}),
                                            new CardFooter({ text: 'Today', bgTransparent: true })
                                        ]
                                    }),
                                    new Card({
                                        children: [
                                            new CardHeader({ text: 'Pending' }),
                                            new CardBody({ children: [
                                                new CardTitle({ text: 'Phase 3' }),
                                                new CardText({ text: 'Global edge distribution.' })
                                            ]}),
                                            new CardFooter({ text: 'Q4 2026' })
                                        ]
                                    })
                                ]
                            })
                        ]
                    })
                ]
            })
        ]);
    }
}
