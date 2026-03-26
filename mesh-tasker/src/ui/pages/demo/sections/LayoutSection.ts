import { Row, Col, Accordion, AccordionItem, Card, CardHeader, CardBody, CardTitle, CardSubtitle, CardText, CardFooter, Heading, CardGroup } from '@flybyme/isomorphic-ui';
import { BaseDemoSection } from './BaseDemoSection';

export class LayoutSection extends BaseDemoSection {
    constructor() {
        super('Accordions & Cards', [
            new Row({
                children: [
                    new Col({
                        span: 6,
                        children: [
                            new Heading(5, { text: 'Standard Accordion', marginBottom: '3' }),
                            new Accordion({
                                className: 'mb-4',
                                children: [
                                    new AccordionItem({
                                        header: 'Dynamic Rendering',
                                        defaultOpen: true,
                                        children: 'All components are rendered purely programmatically without any raw HTML templates.'
                                    }),
                                    new AccordionItem({
                                        header: 'Smart Linking',
                                        children: 'The framework automatically handles ID binding for accessibility.'
                                    })
                                ]
                            }),

                            new Heading(5, { text: 'Flush Accordion', marginBottom: '3' }),
                            new Accordion({
                                flush: true,
                                className: 'mb-4',
                                children: [
                                    new AccordionItem({
                                        header: 'Flush Item #1',
                                        children: 'Placeholder content for this accordion, which is intended to demonstrate the .accordion-flush class.'
                                    }),
                                    new AccordionItem({
                                        header: 'Flush Item #2',
                                        children: 'More placeholder content for the second accordion item.'
                                    })
                                ]
                            })
                        ]
                    }),
                    new Col({
                        span: 6,
                        children: [
                            new Heading(5, { text: 'Feature Cards', marginBottom: '3' }),
                            new Card({
                                className: 'mb-4',
                                children: [
                                    new CardHeader({ text: 'Feature Container' }),
                                    new CardBody({
                                        children: [
                                            new CardTitle({ text: 'Card Title' }),
                                            new CardSubtitle({ text: 'Card subtitle' }),
                                            new CardText({ text: 'Cards can wrap any complexity of children while maintaining style.' })
                                        ]
                                    }),
                                    new CardFooter({ text: '2 days ago', className: 'text-muted' })
                                ]
                            }),

                            new Heading(5, { text: 'Card Variants', marginBottom: '3' }),
                            new Card({
                                variant: 'primary',
                                textVariant: 'white',
                                className: 'mb-4',
                                children: [
                                    new CardHeader({ text: 'Primary Theme' }),
                                    new CardBody({
                                        children: [
                                            new CardTitle({ text: 'Primary card title' }),
                                            new CardText({ text: 'Some quick example text to build on the card title and make up the bulk of the card content.' })
                                        ]
                                    })
                                ]
                            })
                        ]
                    })
                ]
            }),

            new Heading(5, { text: 'Card Groups', className: 'mt-4 mb-3' }),
            new CardGroup({
                children: [
                    new Card({
                        children: [
                            new CardBody({
                                children: [
                                    new CardTitle({ text: 'Card 1' }),
                                    new CardText({ text: 'This is a wider card with supporting text below as a natural lead-in to additional content.' })
                                ]
                            }),
                            new CardFooter({ text: 'Last updated 3 mins ago' })
                        ]
                    }),
                    new Card({
                        children: [
                            new CardBody({
                                children: [
                                    new CardTitle({ text: 'Card 2' }),
                                    new CardText({ text: 'This card has supporting text below as a natural lead-in to additional content.' })
                                ]
                            }),
                            new CardFooter({ text: 'Last updated 3 mins ago' })
                        ]
                    }),
                    new Card({
                        children: [
                            new CardBody({
                                children: [
                                    new CardTitle({ text: 'Card 3' }),
                                    new CardText({ text: 'This is a wider card with supporting text below as a natural lead-in to additional content. This card has even longer content than the first to show that equal height action.' })
                                ]
                            }),
                            new CardFooter({ text: 'Last updated 3 mins ago' })
                        ]
                    })
                ]
            })
        ]);
    }
}
