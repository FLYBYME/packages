import {
  BrokerComponent, ComponentChild, BrokerDOM,
  Section, Heading, SmallText, Badge,
  Button, Card, CardHeader, CardBody, DataTable,
  Modal, ModalHeader, ModalTitle, ModalBody,
  IBaseUIProps, IBadgeProps
} from '@flybyme/isomorphic-ui';
import { GitflowSession, GitflowCommit, GitflowChangedFile, GitflowFileDiff } from '../../domains/sys.gitflow/gitflow.schema';

export class GitflowTab extends BrokerComponent {
  private unsubscribe: (() => void)[] = [];
  private directiveId: string = '';
  private diffModal?: Modal;

  constructor(props: IBaseUIProps & { directiveId: string }) {
    super('div', {
      className: 'h-100 d-flex flex-column bg-light ' + (props.className || ''),
      ...props
    });
    this.directiveId = props.directiveId;
    this.initDiffModal();
  }

  private initDiffModal() {
    this.diffModal = new Modal({
      id: 'diffModal',
      size: 'xl',
      children: [
        new ModalHeader({
          onClose: () => this.diffModal?.hide(),
          children: new ModalTitle({ text: 'File Diff Viewer' })
        }),
        new ModalBody({
          className: 'p-0 bg-dark',
          style: { height: '70vh' },
          children: [
            new Section({
              id: 'diffContent',
              className: 'h-100 overflow-auto p-3 font-monospace x-small text-white',
              style: { whiteSpace: 'pre-wrap' },
              text: 'Loading diff...'
            })
          ]
        })
      ]
    });
  }

  override async onMount(): Promise<void> {
    super.onMount();
    this.refresh();

    const broker = BrokerDOM.getBroker();
    this.unsubscribe.push(broker.on('sys.gitflow.session_updated', (data: { directiveId: string }) => {
      if (data.directiveId === this.directiveId) {
        this.refresh();
      }
    }));
  }

  override dispose(): void {
    this.unsubscribe.forEach(u => u());
    super.dispose();
  }

  private async refresh() {
    try {
      const session = await BrokerDOM.getBroker().call<GitflowSession>('sys.gitflow.get_session_details', {
        directiveId: this.directiveId
      });
      BrokerDOM.getStateService().set(`ui.gitflow.${this.directiveId}`, session);
      this.update();
    } catch {
      console.warn('[GitflowTab] No session found for directive', this.directiveId);
    }
  }

  build(): ComponentChild[] {
    const session = BrokerDOM.getStateService().getValue<GitflowSession>(`ui.gitflow.${this.directiveId}`);

    if (!session) {
      return [
        new Section({
          className: 'd-flex h-100 align-items-center justify-content-center flex-column text-muted',
          children: [
            new Heading(6, { text: 'No Gitflow Session' }),
            new SmallText({ text: 'This directive does not have an active version control workspace yet.' })
          ]
        })
      ];
    }

    return [
      // Header: Branch Lifecycle
      this.renderHeader(session),

      new Section({
        className: 'flex-grow-1 overflow-auto p-3',
        children: [
          new Section({
            className: 'row g-3',
            children: [
              // Left Col: Timeline & Actions
              new Section({
                className: 'col-md-5',
                children: [
                  this.renderTimeline(session.commitHistory),
                  new Section({ className: 'mt-3' }),
                  this.renderAdminActions(session)
                ]
              }),
              // Right Col: Files & Conflicts
              new Section({
                className: 'col-md-7',
                children: [
                  session.status === 'conflict' ? this.renderConflictAlert(session) : null,
                  this.renderFileExplorer(session.changedFiles)
                ]
              })
            ]
          })
        ]
      }),
      this.diffModal!
    ];
  }

  private renderHeader(session: GitflowSession): ComponentChild {
    const statusVariants: Record<string, IBadgeProps['variant']> = {
      active: 'primary',
      pending: 'secondary',
      merging: 'warning',
      merged: 'success',
      conflict: 'danger'
    };

    return new Section({
      className: 'p-3 border-bottom bg-white d-flex justify-content-between align-items-center',
      children: [
        new Section({
          children: [
            new SmallText({ text: 'Branch Lifecycle', className: 'text-muted uppercase x-small fw-bold mb-1 d-block' }),
            new Section({
              className: 'd-flex align-items-center gap-2',
              children: [
                new Badge({ variant: 'light', text: session.baseBranch, className: 'border' }),
                new SmallText({ text: '→', className: 'text-muted' }),
                new Heading(6, { text: session.branchName, className: 'mb-0 font-monospace' }),
              ]
            })
          ]
        }),
        new Badge({ 
          text: session.status.toUpperCase(), 
          variant: statusVariants[session.status] || 'secondary' 
        })
      ]
    });
  }

  private renderTimeline(history: GitflowCommit[]): ComponentChild {
    return new Card({
      children: [
        new CardHeader({ children: new Heading(6, { text: 'Autonomous Commit Timeline', className: 'mb-0' }) }),
        new CardBody({
          className: 'p-0',
          children: history.length === 0 
            ? new Section({ className: 'p-4 text-center text-muted italic', text: 'No commits recorded yet.' })
            : history.map((commit, i) => new Section({
                className: 'p-3 border-bottom d-flex gap-3 position-relative',
                children: [
                  // Timeline line
                  i < history.length - 1 ? new Section({ 
                    className: 'position-absolute bg-secondary bg-opacity-25', 
                    style: { left: '23px', top: '40px', width: '2px', height: 'calc(100% - 20px)' } 
                  }) : null,
                  // Icon
                  new Section({ 
                    className: 'rounded-circle bg-info bg-opacity-10 border border-info d-flex align-items-center justify-content-center flex-shrink-0', 
                    style: { width: '20px', height: '20px', marginTop: '4px', zIndex: 1 },
                    children: new Section({ className: 'bg-info rounded-circle', style: { width: '8px', height: '8px' } })
                  }),
                  // Content
                  new Section({
                    children: [
                      new SmallText({ text: commit.message, className: 'd-block fw-bold' }),
                      new SmallText({ text: commit.sha.slice(0, 7), className: 'font-monospace text-muted x-small me-2' }),
                      new SmallText({ text: new Date(commit.timestamp).toLocaleString(), className: 'text-muted x-small' }),
                    ]
                  })
                ]
              }))
        })
      ]
    });
  }

  private renderFileExplorer(files: GitflowChangedFile[]): ComponentChild {
    return new Card({
      children: [
        new CardHeader({ children: new Heading(6, { text: 'File Diff Explorer', className: 'mb-0' }) }),
        new CardBody({
          className: 'p-0',
          children: files.length === 0
            ? new Section({ className: 'p-4 text-center text-muted italic', text: 'No files changed.' })
            : new DataTable<GitflowChangedFile>({
                columns: [
                  { 
                    key: 'status', 
                    label: '', 
                    render: (row: GitflowChangedFile) => {
                      const variants: Record<'added' | 'modified' | 'deleted', IBadgeProps['variant']> = { 
                        added: 'success', 
                        modified: 'warning', 
                        deleted: 'danger' 
                      };
                      const icons: Record<'added' | 'modified' | 'deleted', string> = { 
                        added: '+', 
                        modified: '~', 
                        deleted: '-' 
                      };
                      return new Badge({ 
                        text: icons[row.status], 
                        variant: variants[row.status], 
                        className: 'px-2' 
                      });
                    }
                  },
                  { key: 'file', label: 'File Path', render: (row: GitflowChangedFile) => new SmallText({ text: row.file, className: 'font-monospace small' }) },
                  { 
                    key: 'file', 
                    label: 'Actions', 
                    render: (row: GitflowChangedFile) => new Button({
                      size: 'sm',
                      variant: 'link',
                      className: 'p-0 text-info text-decoration-none x-small',
                      text: 'View Diff',
                      onClick: () => this.showFileDiff(row.file)
                    })
                  }
                ],
                data: files
              })
        })
      ]
    });
  }

  private renderConflictAlert(session: GitflowSession): ComponentChild {
    return new Section({
      className: 'alert alert-danger mb-3 p-3',
      children: [
        new Heading(6, { text: '⚠️ Merge Conflict Detected', className: 'alert-heading mb-2' }),
        new SmallText({ text: 'The Grid attempted to merge but encountered conflicts. Autonomous operations are paused.', className: 'd-block mb-3' }),
        new Section({
          className: 'bg-black bg-opacity-10 p-2 rounded mb-3',
          children: session.conflictDetails.map(c => new Section({
            className: 'd-flex justify-content-between align-items-center mb-1',
            children: [
              new SmallText({ text: c.file, className: 'font-monospace x-small' }),
              new Badge({ text: 'CONFLICT', variant: 'danger', className: 'x-small' })
            ]
          }))
        }),
        new Heading(6, { text: 'How to resolve:', className: 'small fw-bold mb-2' }),
        new Section({
          className: 'bg-dark p-2 rounded mb-3 text-white font-monospace x-small overflow-auto',
          children: `git checkout ${session.baseBranch} && git pull && git checkout ${session.branchName} && git rebase ${session.baseBranch}`
        }),
        new Button({
          variant: 'danger',
          className: 'w-100',
          text: 'Mark Conflict Resolved & Retry Merge',
          onClick: () => this.retryMerge()
        })
      ]
    });
  }

  private renderAdminActions(_session: GitflowSession): ComponentChild {
    return new Card({
      children: [
        new CardHeader({ children: new Heading(6, { text: 'Administrative Overrides', className: 'mb-0 text-danger' }) }),
        new CardBody({
          className: 'd-flex flex-column gap-2',
          children: [
            new Button({ 
              variant: 'outline-primary', 
              size: 'sm', 
              text: 'Force Auto-Commit', 
              onClick: () => this.forceCommit() 
            }),
            new Button({ 
              variant: 'outline-warning', 
              size: 'sm', 
              text: 'Force Merge (Bypass Tests)', 
              onClick: () => this.forceMerge() 
            }),
            new Button({ 
              variant: 'outline-danger', 
              size: 'sm', 
              text: 'Abort & Destroy Workspace', 
              onClick: () => this.abortWorkspace() 
            }),
          ]
        })
      ]
    });
  }

  private async showFileDiff(file: string) {
    this.diffModal?.show();
    try {
      const diff = await BrokerDOM.getBroker().call<GitflowFileDiff>('sys.gitflow.get_file_diff', {
        directiveId: this.directiveId,
        file
      });
      
      const content = this.formatDiff(diff);
      const el = document.getElementById('diffContent');
      if (el) el.innerText = content;
    } catch (err) {
      const el = document.getElementById('diffContent');
      if (el) el.innerText = 'Failed to load diff: ' + (err as Error).message;
    }
  }

  private formatDiff(diff: GitflowFileDiff): string {
    if (diff.status === 'added') return `[NEW FILE]\n\n${diff.currentContent}`;
    if (diff.status === 'deleted') return `[DELETED FILE]\n\n${diff.baseContent}`;
    
    // Simple line-by-line diff for prototype
    const baseLines = (diff.baseContent || '').split('\n');
    const currentLines = (diff.currentContent || '').split('\n');
    let out = `--- ${diff.file} (base)\n+++ ${diff.file} (current)\n\n`;
    
    // This is a VERY naive diff for visualization
    const max = Math.max(baseLines.length, currentLines.length);
    for (let i = 0; i < max; i++) {
      if (baseLines[i] !== currentLines[i]) {
        if (baseLines[i] !== undefined) out += `- ${baseLines[i]}\n`;
        if (currentLines[i] !== undefined) out += `+ ${currentLines[i]}\n`;
      } else {
        out += `  ${baseLines[i]}\n`;
      }
    }
    return out;
  }

  private async retryMerge() {
    try {
      await BrokerDOM.getBroker().call('sys.gitflow.attempt_merge', { directiveId: this.directiveId });
      this.refresh();
    } catch {
      alert('Merge failed again. Please check conflicts.');
    }
  }

  private async forceCommit() {
    try {
      await BrokerDOM.getBroker().call('sys.gitflow.commit_checkpoint', { 
        directiveId: this.directiveId,
        nodeName: 'Manual Override'
      });
      this.refresh();
    } catch (err) {
      console.error('Force commit failed', err);
    }
  }

  private async forceMerge() {
    if (!confirm('Are you sure you want to bypass tests and force merge?')) return;
    try {
      await BrokerDOM.getBroker().call('sys.gitflow.force_merge', { directiveId: this.directiveId });
      this.refresh();
    } catch (err) {
      console.error('Force merge failed', err);
    }
  }

  private async abortWorkspace() {
    if (!confirm('This will delete the local workspace and branch. Are you sure?')) return;
    try {
      await BrokerDOM.getBroker().call('sys.gitflow.abort_workspace', { directiveId: this.directiveId });
      this.refresh();
    } catch (err) {
      console.error('Abort failed', err);
    }
  }
}
