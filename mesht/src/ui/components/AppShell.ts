// FILE: src/ui/components/AppShell.ts
import { 
  BrokerComponent, ComponentChild, 
  Navbar, NavbarBrand, NavbarNav, NavbarItem, NavbarLink,
  Sidebar, Section, Main,
  SmallText, IBaseUIProps
} from '@flybyme/isomorphic-ui';
import { GlobalToastProvider } from './GlobalToastProvider';

export class AppShell extends BrokerComponent {
  constructor(props: IBaseUIProps = {}) {
    super('div', { 
        className: 'mesh-app-shell',
        height: 'screen',
        display: 'flex',
        flexDirection: 'column',
        ...props 
    });
  }

  build(): ComponentChild[] {
    return [
      // Top Navbar
      new Navbar({
        variant: 'dark',
        background: 'dark',
        borderBottom: true,
        children: [
          new NavbarBrand({ text: 'MeshT Console', fontWeight: 'bold', color: 'info' }),
          new NavbarNav({
            ml: 'auto',
            children: [
              new NavbarItem({
                children: new Section({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  px: 3,
                  py: 1,
                  background: 'black',
                  rounded: 'pill',
                  border: 'secondary',
                  children: [
                    new Section({ 
                      rounded: 'circle',
                      background: 'success', 
                      style: { width: '8px', height: '8px' },
                      'class.bg-success': '$state.$network.connected',
                      'class.bg-danger': '!$state.$network.connected'
                    }),
                    new SmallText({ 
                      text: '$state.$network.connected ? "Grid Online" : "Grid Offline"', 
                      color: 'white',
                      fontSize: 6
                    })
                  ]
                })
              })
            ]
          })
        ]
      }),
      // Main Layout (Sidebar + Content)
      new Section({
        display: 'flex',
        flexGrow: 1,
        overflow: 'hidden',
        children: [
          new Sidebar({
            background: 'dark',
            borderRight: true,
            color: 'white',
            padding: 3,
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
              new Section({ 
                  mt: 'auto', 
                  padding: 2, 
                  borderTop: true, 
                  children: [
                    new SmallText({ text: 'mesht-gateway', display: 'block', color: 'muted', fontSize: 6 }),
                    new SmallText({ text: 'v1.2.0-stable', display: 'block', color: 'muted', fontSize: 6 })
                  ]
              })
            ]
          }),
          new Main({
            flexGrow: 1,
            overflow: 'auto',
            background: 'light',
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
      className: 'transition-all hover-bg-secondary cursor-pointer',
      'class.active': `$router.path === "${path}"`,
      'class.text-white': `$router.path === "${path}"`,
      'class.bg-secondary': `$router.path === "${path}"`,
      py: 2,
      px: 3,
      rounded: true,
      mb: 1,
      color: 'white-50', // Custom color suffix should work via mesh-text-white-50
      text: label
    });
  }
}
