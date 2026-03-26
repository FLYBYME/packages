import { Row, Col, PricingCard } from '@flybyme/isomorphic-ui';
import { BaseDemoSection } from './BaseDemoSection';

const PRICING_TIERS = [
    { title: 'Free', price: 0, features: ['100 Requests/day', 'Single Region', 'Community Support'] },
    { title: 'Pro', price: 29, isPrimary: true, features: ['Unlimited Requests', 'Multi-Region', 'Priority Support', 'Custom Domains'] },
    { title: 'Enterprise', price: 'Custom', features: ['SLA Guarantee', 'Dedicated Infrastructure', '24/7 Phone Support'] }
];

export class PricingSection extends BaseDemoSection {
    constructor() {
        super('Composites: Pricing', [
            new Row({
                children: PRICING_TIERS.map(tier => 
                    new Col({
                        span: 4,
                        children: new PricingCard(tier)
                    })
                )
            })
        ]);
    }
}
