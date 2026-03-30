import { Navbar, NavbarBrand, NavbarToggler, NavbarCollapse, NavbarNav, NavItem, Button, FormControl, Section } from '@flybyme/isomorphic-ui';
import { BaseDemoSection } from './BaseDemoSection';

export class NavbarSection extends BaseDemoSection {
    constructor() {
        super('Responsive Navbars', [
            new Navbar({
                expand: 'lg',
                variant: 'dark',
                mb: 4, className: 'bg-dark rounded shadow-sm',
                container: 'fluid',
                children: [
                    new NavbarBrand({ href: '#', text: 'MeshOS' }),
                    new NavbarToggler({ collapseId: 'demoNavbar' }),
                    new NavbarCollapse({
                        id: 'demoNavbar',
                        children: [
                            new NavbarNav({
                                className: 'me-auto mb-2 mb-lg-0',
                                children: [
                                    new NavItem({ href: '#', active: true, text: 'Network' }),
                                    new NavItem({ href: '#', text: 'Clusters' }),
                                    new NavItem({ href: '#', text: 'Service Mesh' })
                                ]
                            }),
                            new Section({
                                tagName: 'form',
                                display: 'flex',
                                children: [
                                    new FormControl({ type: 'search', placeholder: 'Cluster ID', className: 'me-2' }),
                                    new Button({ variant: 'info', outline: true, label: 'Monitor', type: 'submit' })
                                ]
                            })
                        ]
                    })
                ]
            }),

            new Navbar({
                expand: 'md',
                variant: 'light',
                mb: 4, className: 'bg-light border rounded',
                children: [
                    new NavbarBrand({ 
                        href: '#', 
                        children: new Section({ tagName: 'span', weight: 'bold', text: '⚡ NodeLink' }) 
                    }),
                    new NavbarToggler({ collapseId: 'navbarLight' }),
                    new NavbarCollapse({
                        id: 'navbarLight',
                        children: [
                            new NavbarNav({
                                children: [
                                    new NavItem({ href: '#', active: true, text: 'Status' }),
                                    new NavItem({ href: '#', text: 'Alerts' }),
                                    new NavItem({ href: '#', text: 'Settings' })
                                ]
                            })
                        ]
                    })
                ]
            })
        ]);
    }
}
