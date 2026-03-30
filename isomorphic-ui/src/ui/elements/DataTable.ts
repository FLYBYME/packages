import { BrokerComponent, IBaseUIProps, ComponentChild } from '../../core/BrokerComponent';
import { Row, Col, Container } from './Layout';
import { Table, TableHead, TableRow, TableCell, TableBody } from './Table';
import { Pagination, PageItem, PageLink } from './NavigationComponents';
import { Text } from './Typography';
import { FormSelect, FormControl, FormOption, IFormControlProps, IFormSelectProps } from './Forms';

export interface IDataTableColumn<T = Record<string, unknown>> {
    key: string;
    label: string;
    sortable?: boolean;
    className?: string;
    render?: (row: T) => ComponentChild;
}

export interface IDataTableProps<T = Record<string, unknown>> extends IBaseUIProps {
    columns: IDataTableColumn<T>[];
    data: T[];
    initialEntriesPerPage?: number;
}

class SearchInput extends FormControl {
    private onInputFn: (e: Event) => void;
    constructor(props: IFormControlProps, onInputFn: (e: Event) => void) {
        super(props);
        this.onInputFn = onInputFn;
    }
    override onMount() {
        super.onMount();
        if (this.element) {
            this.element.addEventListener('input', this.onInputFn);
        }
    }
}

class EntriesSelect extends FormSelect {
    private onChangeFn: (e: Event) => void;
    constructor(props: IFormSelectProps, onChangeFn: (e: Event) => void) {
        super(props);
        this.onChangeFn = onChangeFn;
    }
    override onMount() {
        super.onMount();
        if (this.element) {
            this.element.addEventListener('change', this.onChangeFn);
        }
    }
}

export class DataTable<T = Record<string, unknown>> extends BrokerComponent {
    private data: T[];
    private columns: IDataTableColumn<T>[];
    private currentPage: number = 1;
    private entriesPerPage: number;
    private searchQuery: string = '';
    private sortColumn: string | null = null;
    private sortDirection: 'asc' | 'desc' = 'asc';

    private searchInput!: SearchInput;
    private entriesSelect!: EntriesSelect;
    private shouldRestoreFocus: boolean = false;

    constructor(props: IDataTableProps<T>) {
        super('div', { ...props, className: 'datatable-container' });
        this.data = props.data || [];
        this.columns = props.columns || [];
        this.entriesPerPage = props.initialEntriesPerPage || 10;
    }

    private handleSearch = (e: Event) => {
        this.searchQuery = (e.target as HTMLInputElement).value;
        this.currentPage = 1;
        this.shouldRestoreFocus = true;
        this.update();
    }

    private handleEntriesChange = (e: Event) => {
        this.entriesPerPage = parseInt((e.target as HTMLSelectElement).value, 10);
        this.currentPage = 1;
        this.update();
    }

    private handleSort = (columnKey: string) => {
        if (this.sortColumn === columnKey) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = columnKey;
            this.sortDirection = 'asc';
        }
        this.update();
    }

    private setPage = (page: number) => {
        this.currentPage = page;
        this.update();
    }

    override update() {
        super.update();
        if (this.shouldRestoreFocus && this.searchInput && this.searchInput.element) {
            const el = this.searchInput.element as HTMLInputElement;
            // Explicitly set the value property to ensure it reflects what the user typed
            el.value = this.searchQuery;
            el.focus();

            // Move cursor to the end of the text
            const len = this.searchQuery.length;
            el.setSelectionRange(len, len);

            this.shouldRestoreFocus = false;
        }
    }

    private getProcessedData() {
        let processed = [...this.data];

        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            processed = processed.filter(item => {
                return Object.values(item as Record<string, unknown>).some(val =>
                    String(val).toLowerCase().includes(query)
                );
            });
        }

        if (this.sortColumn) {
            processed.sort((a, b) => {
                const valA = (a as Record<string, unknown>)[this.sortColumn!] as string | number;
                const valB = (b as Record<string, unknown>)[this.sortColumn!] as string | number;

                if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
                if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return processed;
    }

    build(): ComponentChild | ComponentChild[] {
        const processedData = this.getProcessedData();
        const totalEntries = processedData.length;
        const totalPages = Math.ceil(totalEntries / this.entriesPerPage) || 1;

        if (this.currentPage > totalPages && totalPages > 0) {
            this.currentPage = totalPages;
        }

        const startIndex = (this.currentPage - 1) * this.entriesPerPage;
        const endIndex = Math.min(startIndex + this.entriesPerPage, totalEntries);
        const currentData = processedData.slice(startIndex, endIndex);

        this.entriesSelect = new EntriesSelect({
            size: 'sm',
            children: [
                new FormOption({ value: '5', text: '5', selected: this.entriesPerPage === 5 ? true : undefined }),
                new FormOption({ value: '10', text: '10', selected: this.entriesPerPage === 10 ? true : undefined }),
                new FormOption({ value: '25', text: '25', selected: this.entriesPerPage === 25 ? true : undefined }),
                new FormOption({ value: '50', text: '50', selected: this.entriesPerPage === 50 ? true : undefined })
            ]
        }, this.handleEntriesChange);

        this.searchInput = new SearchInput({
            size: 'sm',
            type: 'text',
            value: this.searchQuery,
            placeholder: 'Filter...'
        }, this.handleSearch);

        const topControls = new Row({
            className: 'mb-3 align-items-center',
            children: [
                new Col({
                    span: 6,
                    className: 'd-flex align-items-center gap-2',
                    children: [
                        new Text({ text: 'Show' }),
                        new Container({
                            style: { width: '80px' },
                            children: this.entriesSelect
                        }),
                        new Text({ text: 'entries' })
                    ]
                }),
                new Col({
                    span: 6,
                    className: 'd-flex justify-content-end align-items-center gap-2',
                    children: [
                        new Text({ text: 'Search:' }),
                        new Container({
                            style: { width: '200px' },
                            children: this.searchInput
                        })
                    ]
                })
            ]
        });

        const tableHeaders = this.columns.map(col => {
            let sortIndicator = '';
            if (col.sortable) {
                if (this.sortColumn === col.key) {
                    sortIndicator = this.sortDirection === 'asc' ? ' ▲' : ' ▼';
                } else {
                    sortIndicator = ' ↕';
                }
            }

            return new TableCell({
                isHeader: true,
                style: col.sortable ? { cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' } : { whiteSpace: 'nowrap' },
                onClick: col.sortable ? () => this.handleSort(col.key) : undefined,
                children: new Container({
                    className: 'd-flex justify-content-between align-items-center',
                    children: [
                        new Text({ text: col.label }),
                        new Text({ text: sortIndicator, className: 'text-muted small ms-2' })
                    ]
                })
            });
        });

        const tableRows = currentData.map(row => {
            return new TableRow({
                children: this.columns.map(col => {
                    const rowVal = (row as Record<string, unknown>)[col.key];
                    if (col.render) return new TableCell({ className: col.className, children: col.render(row) });
                    return new TableCell({ className: col.className, text: String(rowVal) });
                })
            });
        });

        if (currentData.length === 0) {
            tableRows.push(new TableRow({
                children: new TableCell({
                    colspan: this.columns.length,
                    className: 'text-center text-muted py-4',
                    text: 'No matching records found'
                })
            }));
        }

        const dataTable = new Table({
            responsive: true,
            striped: true,
            hover: true,
            bordered: true,
            className: 'mb-0',
            children: [
                new TableHead({
                    variant: 'light',
                    children: new TableRow({ children: tableHeaders })
                }),
                new TableBody({
                    children: tableRows
                })
            ]
        });

        const paginationItems = [];

        paginationItems.push(new PageItem({
            disabled: this.currentPage === 1,
            children: new PageLink({
                text: 'Previous',
                onClick: (e: Event) => { e.preventDefault(); if (this.currentPage > 1) this.setPage(this.currentPage - 1); }
            })
        }));

        const maxPagesToShow = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
        const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

        if (endPage - startPage + 1 < maxPagesToShow) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationItems.push(new PageItem({
                active: this.currentPage === i,
                children: new PageLink({
                    text: String(i),
                    onClick: (e: Event) => { e.preventDefault(); this.setPage(i); }
                })
            }));
        }

        paginationItems.push(new PageItem({
            disabled: this.currentPage === totalPages || totalPages === 0,
            children: new PageLink({
                text: 'Next',
                onClick: (e: Event) => { e.preventDefault(); if (this.currentPage < totalPages) this.setPage(this.currentPage + 1); }
            })
        }));

        const bottomControls = new Row({
            className: 'mt-3 align-items-center',
            children: [
                new Col({
                    span: 6,
                    children: new Text({
                        text: `Showing ${totalEntries > 0 ? startIndex + 1 : 0} to ${endIndex} of ${totalEntries} entries`
                    })
                }),
                new Col({
                    span: 6,
                    className: 'd-flex justify-content-end',
                    children: new Pagination({
                        size: 'sm',
                        className: 'mb-0',
                        children: paginationItems
                    })
                })
            ]
        });

        return [
            topControls,
            new Container({
                className: 'table-responsive rounded',
                children: dataTable
            }),
            bottomControls
        ];
    }
}
