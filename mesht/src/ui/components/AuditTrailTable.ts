// FILE: src/ui/components/AuditTrailTable.ts
import {
  BrokerComponent, ComponentChild,
  DataTable, Badge, Section, SmallText, IBaseUIProps
} from '@flybyme/isomorphic-ui';
import { AuditLog } from '../../domains/sys.audit/audit.schema';

interface IAuditTrailProps extends IBaseUIProps {
  data: AuditLog[];
  pageSize?: number;
}

type AuditTrailRow = AuditLog & {
  displayTime: string;
  actorId: string;
};

export class AuditTrailTable extends BrokerComponent {
  private readonly data: AuditLog[];
  private readonly pageSize: number;

  constructor(props: IAuditTrailProps) {
    super('div', props);
    this.data = props.data;
    this.pageSize = props.pageSize ?? 10;
  }

  build(): ComponentChild {
    const formattedData: AuditTrailRow[] = this.data.map((log: AuditLog) => ({
      ...log,
      displayTime: new Date(log.timestamp).toLocaleString(),
      actorId: log.actor.personaID || log.actor.nodeID || 'system'
    }));

    return new DataTable<AuditTrailRow>({
      pagination: true,
      pageSize: this.pageSize,
      columns: [
        {
          key: 'displayTime',
          label: 'Timestamp',
          className: 'x-small text-muted font-monospace'
        },
        {
          key: 'domain',
          label: 'Domain',
          render: (row: AuditTrailRow) => new Badge({
            text: row.domain,
            variant: 'light',
            className: 'text-dark border'
          })
        },
        {
          key: 'action',
          label: 'Action',
          render: (row: AuditTrailRow) => new Section({
            children: [
              new SmallText({ text: row.action.split('.')[0], className: 'fw-bold me-1' }),
              new SmallText({ text: row.action.split('.').slice(1).join('.'), className: 'text-info' })
            ]
          })
        },
        {
          key: 'actorId',
          label: 'Actor',
          render: (row: AuditTrailRow) => new Badge({
            text: row.actorId,
            variant: 'secondary'
          })
        },
        {
          key: 'status',
          label: 'Result',
          render: (row: AuditTrailRow) => new Badge({
            variant: row.status === 'SUCCESS' ? 'success' : 'danger',
            text: row.status
          })
        }
      ],
      data: formattedData
    });
  }
}
