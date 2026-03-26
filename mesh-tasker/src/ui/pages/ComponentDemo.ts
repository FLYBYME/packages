import { 
    BrokerPage, 
    Container
} from '@flybyme/isomorphic-ui';

import { DemoHeader } from './demo/sections/DemoHeader';
import { ButtonsSection } from './demo/sections/ButtonsSection';
import { FeedbackSection } from './demo/sections/FeedbackSection';
import { NavigationSection } from './demo/sections/NavigationSection';
import { FormsSection } from './demo/sections/FormsSection';
import { LayoutSection } from './demo/sections/LayoutSection';
import { DataSection } from './demo/sections/DataSection';
import { SystemsSection } from './demo/sections/SystemsSection';
import { PricingSection } from './demo/sections/PricingSection';
import { AdvancedCardsSection } from './demo/sections/AdvancedCardsSection';
import { CarouselSection } from './demo/sections/CarouselSection';
import { DropdownSection } from './demo/sections/DropdownSection';
import { ModalSection } from './demo/sections/ModalSection';
import { TabsSection } from './demo/sections/TabsSection';
import { NavbarSection } from './demo/sections/NavbarSection';
import { OverlaysSection } from './demo/sections/OverlaysSection';

/**
 * ComponentDemo - A modular living design system for the Broker platform.
 * Refactored into a composable architecture using isolated section components.
 */
export class ComponentDemo extends BrokerPage {
    constructor() {
        super('div', {
            className: 'pb-5'
        });
    }

    public getPageConfig() { return null; }
    public getSEO() { return { defaultTitle: 'Design System | Broker' }; }

    public async onEnter(): Promise<void> {}
    public async onLeave(): Promise<boolean | void> { return true; }

    build() {
        return new Container({
            children: [
                new DemoHeader(),
                new ButtonsSection(),
                new FeedbackSection(),
                new NavigationSection(),
                new FormsSection(),
                new LayoutSection(),
                new DataSection(),
                new SystemsSection(),
                new PricingSection(),
                new AdvancedCardsSection(),
                new CarouselSection(),
                new DropdownSection(),
                new ModalSection(),
                new TabsSection(),
                new NavbarSection(),
                new OverlaysSection()
            ]
        });
    }
}
