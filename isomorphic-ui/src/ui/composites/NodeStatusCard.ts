import { BrokerComponent, IBaseUIProps, ComponentChild } from '../../core/BrokerComponent';
import { Card, CardHeader, CardBody, CardFooter } from '../elements/Card';
import { Badge, IBadgeProps } from '../elements/Badge';
import { Spinner, ISpinnerProps } from '../elements/Feedback';
import { ProgressBar, Progress, IProgressBarProps } from '../elements/Progress';
import { SmallText, Heading } from '../elements/Typography';
import { Row, Col, Box } from '../elements/Layout';
import { VirtualRouter } from '../../core/VirtualRouter';

export interface INodeStatusCardProps extends IBaseUIProps {
    nodeId: string;
    showMetrics?: boolean;
    compact?: boolean;
}

export class NodeStatusCard extends BrokerComponent {
    private basePath: string;

    constructor(props: INodeStatusCardProps) {
        super('div', props);
        this.basePath = `$registry.nodes["${props.nodeId}"]`;
    }

    protected override applyDOMProps(_props: INodeStatusCardProps): void {
        this.props['class.opacity-50'] = '$state.$network.connected ? "" : "opacity-50"';
        super.applyDOMProps(this.props);
    }

    protected override getBaseClasses(): string {
        return 'node-status-card-wrapper';
    }

    build(): ComponentChild | ComponentChild[] {
        const { nodeId, showMetrics, compact } = this.props as INodeStatusCardProps;
        const path = this.basePath;

        return new Card({
            shadow: 'sm',
            borderColor: `$state.${path}.status === "Offline" ? "danger" : "secondary"`,
            className: 'cursor-pointer transition-all hover-shadow-md h-100',
            onClick: () => VirtualRouter.push(`/nodes/${nodeId}`),
            children: [
                new CardHeader({
                    bgTransparent: true,
                    className: compact ? 'py-2' : '',
                    children: [
                        new Row({ 
                            alignItems: 'center', 
                            justifyContent: 'between', 
                            children: [
                                new Col({ span: 'auto', children: new Heading(compact ? 6 : 5, { text: nodeId, className: 'mb-0' }) }),
                                new Col({ span: 'auto', children: new Badge({ 
                                    text: `$state.${path}.type`,
                                    variant: `$state.${path}.type === "Worker" ? "info" : ($state.${path}.type === "Gateway" ? "dark" : ($state.${path}.type === "Orchestrator" ? "primary" : "secondary"))` as IBadgeProps['variant']
                                }) })
                            ]
                        })
                    ]
                }),
                new CardBody({
                    className: compact ? 'py-2' : '',
                    children: [
                        new Row({ 
                            alignItems: 'center', 
                            className: showMetrics ? 'mb-3' : 'mb-0', 
                            children: [
                                new Col({ span: 'auto', children: new Spinner({ 
                                    size: 'sm', 
                                    'class.d-none': `$state.${path}.status !== "Starting" && $state.${path}.status !== "Degraded"`,
                                    variant: `$state.${path}.status === "Starting" ? "info" : "warning"` as ISpinnerProps['variant']
                                }) }),
                                new Col({ children: new Badge({ 
                                    text: `$state.${path}.status`,
                                    variant: `$state.${path}.status === "Running" ? "success" : ($state.${path}.status === "Offline" ? "danger" : ($state.${path}.status === "Degraded" ? "warning" : "info"))` as IBadgeProps['variant']
                                }) })
                            ]
                        }),
                        showMetrics ? this.buildMetrics(path) : null
                    ]
                }),
                new CardFooter({
                    bgTransparent: true,
                    className: compact ? 'py-1 text-muted' : 'text-muted',
                    children: new SmallText({ text: `Last Seen: $state.${path}.lastHeartbeat` })
                })
            ]
        });
    }

    private buildMetrics(path: string): ComponentChild {
        return new Box({
            children: [
                new Box({
                    className: 'mb-2',
                    children: [
                        new Row({
                            justifyContent: 'between',
                            children: [
                                new Col({ span: 'auto', children: new SmallText({ text: 'CPU' }) }),
                                new Col({ span: 'auto', children: new SmallText({ text: `$state.${path}.metrics.cpu + "%"` }) })
                            ]
                        }),
                        new Progress({ 
                            height: 5, 
                            children: new ProgressBar({ 
                                value: `$state.${path}.metrics.cpu` as unknown as number,
                                variant: `$state.${path}.metrics.cpu > 80 ? "danger" : ($state.${path}.metrics.cpu > 60 ? "warning" : "primary")` as IProgressBarProps['variant']
                            }) 
                        })
                    ]
                }),
                new Box({
                    children: [
                        new Row({
                            justifyContent: 'between',
                            children: [
                                new Col({ span: 'auto', children: new SmallText({ text: 'RAM' }) }),
                                new Col({ span: 'auto', children: new SmallText({ text: `$state.${path}.metrics.ram + "%"` }) })
                            ]
                        }),
                        new Progress({ 
                            height: 5, 
                            children: new ProgressBar({ 
                                value: `$state.${path}.metrics.ram` as unknown as number,
                                variant: `$state.${path}.metrics.ram > 80 ? "danger" : ($state.${path}.metrics.ram > 60 ? "warning" : "info")` as IProgressBarProps['variant']
                            }) 
                        })
                    ]
                })
            ]
        });
    }
}
