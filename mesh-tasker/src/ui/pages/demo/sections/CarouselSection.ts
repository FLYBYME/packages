import { Row, Col, Heading, Carousel, CarouselItem, Box, CarouselCaption, Text } from '@flybyme/isomorphic-ui';
import { BaseDemoSection } from './BaseDemoSection';

export class CarouselSection extends BaseDemoSection {
    constructor() {
        super('Interactive Carousels', [
            new Row({
                children: [
                    new Col({
                        span: 8,
                        children: [
                            new Heading(5, { text: 'Dynamic Slideshow', marginBottom: '3' }),
                            new Carousel({
                                ride: 'carousel',
                                controls: true,
                                indicators: true,
                                children: [
                                    new CarouselItem({
                                        children: [
                                            new Box({ tagName: 'img', src: 'https://placehold.co/1200x500/007bff/white?text=Mesh+Architecture', className: 'd-block w-100 rounded', alt: 'Slide 1' }),
                                            new CarouselCaption({
                                                children: [
                                                    new Heading(3, { text: 'Mesh Networking' }),
                                                    new Text({ text: 'Distributed infrastructure at the edge.' })
                                                ]
                                            })
                                        ]
                                    }),
                                    new CarouselItem({
                                        children: [
                                            new Box({ tagName: 'img', src: 'https://placehold.co/1200x500/28a745/white?text=Global+Distribution', className: 'd-block w-100 rounded', alt: 'Slide 2' }),
                                            new CarouselCaption({
                                                children: [
                                                    new Heading(3, { text: 'Global Reach' }),
                                                    new Text({ text: 'Deploy to 50+ regions with a single command.' })
                                                ]
                                            })
                                        ]
                                    }),
                                    new CarouselItem({
                                        children: [
                                            new Box({ tagName: 'img', src: 'https://placehold.co/1200x500/dc3545/white?text=Real-time+Reactivity', className: 'd-block w-100 rounded', alt: 'Slide 3' }),
                                            new CarouselCaption({
                                                children: [
                                                    new Heading(3, { text: 'Real-time Sync' }),
                                                    new Text({ text: 'Zero-latency state synchronization across mirrors.' })
                                                ]
                                            })
                                        ]
                                    })
                                ]
                            })
                        ]
                    }),
                    new Col({
                        span: 4,
                        children: [
                            new Heading(5, { text: 'Fade Transition', marginBottom: '3' }),
                            new Carousel({
                                fade: true,
                                ride: 'carousel',
                                interval: 3000,
                                children: [
                                    new CarouselItem({ children: new Box({ tagName: 'img', src: 'https://placehold.co/600x600/343a40/white?text=Node+A', className: 'd-block w-100 rounded' }) }),
                                    new CarouselItem({ children: new Box({ tagName: 'img', src: 'https://placehold.co/600x600/6c757d/white?text=Node+B', className: 'd-block w-100 rounded' }) })
                                ]
                            })
                        ]
                    })
                ]
            })
        ]);
    }
}
