import { BrokerComponent } from '../core/BrokerComponent';

export interface UIPlugin {
    name: string;
    onBeforeMount?(component: BrokerComponent): void;
    onMounted?(component: BrokerComponent): void;
    onUpdated?(component: BrokerComponent): void;
    onUnmount?(component: BrokerComponent): void;
}