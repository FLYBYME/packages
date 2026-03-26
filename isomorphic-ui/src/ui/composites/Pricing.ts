import { Container } from '../elements/Layout';
import { DisplayHeading, LeadText, Heading, SmallText } from '../elements/Typography';
import { Card, CardHeader, CardBody } from '../elements/Card';
import { List, ListItem } from '../elements/ListGroup';
import { Button } from '../elements/Button';
import { IBaseUIProps } from '../../core/BrokerComponent';

export interface IHeroHeaderProps extends IBaseUIProps {
    title: string;
    subtitle: string;
}

export class HeroHeader extends Container {
    constructor(props: IHeroHeaderProps) { 
        super({
            paddingY: 'xl',
            textCenter: true,
            className: 'mx-auto',
            style: { maxWidth: '700px' },
            children: [
                new DisplayHeading({ level: 1, weight: 'normal', text: props.title, marginBottom: 'md' }),
                new LeadText({ muted: true, text: props.subtitle })
            ]
        }); 
    }
}

export interface IPricingCardProps extends IBaseUIProps {
    title: string;
    price: number | string;
    features: string[];
    isPrimary?: boolean;
}

export class PricingCard extends Card {
    constructor(props: IPricingCardProps) { 
        super({
            shadow: 'sm',
            rounded: true,
            borderColor: props.isPrimary ? 'primary' : undefined,
            marginBottom: '4',
            children: [
                new CardHeader({
                    background: props.isPrimary ? 'primary' : 'surface',
                    color: props.isPrimary ? 'white' : undefined,
                    paddingY: '3',
                    children: [ new Heading(4, { weight: 'normal', className: 'my-0', text: props.title }) ]
                }),
                new CardBody({
                    textCenter: true,
                    children: [
                        new Heading(1, {
                            className: 'card-title pricing-card-title',
                            children: [
                                `$${props.price}`,
                                new SmallText({ muted: true, weight: 'light', text: '/mo' })
                            ]
                        }),
                        new List({
                            unstyled: true,
                            marginTop: '3',
                            marginBottom: '4',
                            children: (props.features || []).map(f => new ListItem({ text: f }))
                        }),
                        new Button({
                            variant: 'primary',
                            outline: !props.isPrimary,
                            size: 'lg',
                            fullWidth: true,
                            text: props.title === 'Free' ? 'Sign up for free' : props.title === 'Enterprise' ? 'Contact us' : 'Get started'
                        })
                    ]
                })
            ]
        }); 
    }
}
