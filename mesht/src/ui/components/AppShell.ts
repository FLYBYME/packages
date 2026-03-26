// FILE: src/ui/components/AppShell.ts
import { 
  BrokerComponent, ComponentChild, 
  Navbar, NavbarBrand, NavbarNav, NavbarItem, NavbarLink,
  Sidebar, Box, Main,
  SmallText, IBaseUIProps
} from '@flybyme/isomorphic-ui';
import { GlobalToastProvider } from './GlobalToastProvider';

export class AppShell extends BrokerComponent {
  constructor(props: IBaseUIProps = {}) {
    super('div', { className: 'mesh-app-shell vh-100 d-flex flex-column', ...props });
  }

  build(): ComponentChild[] {
    return [
      // Top Navbar
      new Navbar({
        variant: 'dark',
        className: 'bg-dark border-bottom border-secondary',
        children: [
          new NavbarBrand({ text: 'MeshT Console', className: 'fw-bold text-info' }),
          new NavbarNav({
            className: 'ms-auto',
            children: [
              new NavbarItem({
                children: new Box({
                  className: 'd-flex align-items-center gap-2 px-3 py-1 bg-black rounded-pill border border-secondary',
                  children: [
                    new Box({ 
                      className: 'rounded-circle bg-success', 
                      style: { width: '8px', height: '8px' },
                      'class.bg-success': '$state.$network.connected',
                      'class.bg-danger': '!$state.$network.connected'
                    }),
                    new SmallText({ 
                      text: '$state.$network.connected ? "Grid Online" : "Grid Offline"', 
                      className: 'text-white x-small' 
                    })
                  ]
                })
              })
            ]
          })
        ]
      }),
      // Main Layout (Sidebar + Content)
      new Box({
        className: 'd-flex flex-grow-1 overflow-hidden',
        children: [
          new Sidebar({
            className: 'bg-dark border-end border-secondary text-white p-3',
            style: { width: '240px' },
            children: [
              this.buildNavLink('/', 'Dashboard'),
              this.buildNavLink('/directives', 'Directives'),
              this.buildNavLink('/gitflow', 'Gitflow'),
              this.buildNavLink('/personas', 'Personas'),
              this.buildNavLink('/swarm', 'Swarm Grid'),
              this.buildNavLink('/governance', 'Governance'),
              this.buildNavLink('/memory', 'Memory'),
              this.buildNavLink('/tools', 'Tools'),
              new Box({ className: 'mt-auto p-2 border-top border-secondary', children: [
                new SmallText({ text: 'mesht-gateway', className: 'd-block text-muted x-small' }),
                new SmallText({ text: 'v1.2.0-stable', className: 'd-block text-muted x-small' })
              ]})
            ]
          }),
          new Main({
            className: 'flex-grow-1 overflow-auto bg-light',
            children: this.props.children
          })
        ]
      }),
      // HITL Approval Toast Provider
      new GlobalToastProvider(),
    ];
  }

  private buildNavLink(path: string, label: string): ComponentChild {
    return new NavbarLink({
      href: path,
      className: 'nav-link text-white-50 py-2 px-3 rounded mb-1 transition-all hover-bg-secondary cursor-pointer',
      'class.active': `$router.path === "${path}"`,
      'class.text-white': `$router.path === "${path}"`,
      'class.bg-secondary': `$router.path === "${path}"`,
      text: label
    });
  }
}
