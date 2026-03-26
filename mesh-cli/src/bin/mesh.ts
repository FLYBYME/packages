#!/usr/bin/env node
import { Command } from 'commander';
import { scaffoldService } from '../commands/scaffold';
import { runDevMode } from '../commands/dev';
import * as path from 'path';

const program = new Command();

program
  .name('mesh')
  .description('MeshApp Developer CLI')
  .version('1.0.0');

program
  .command('scaffold <name>')
  .description('Scaffold a new triad-based service')
  .option('-d, --dir <directory>', 'Target directory', '.')
  .action(async (name, options) => {
    await scaffoldService(name, path.resolve(options.dir));
  });

program
  .command('dev')
  .description('Run all packages in dev mode')
  .action(async () => {
    // Detect packages in the current monorepo (assuming we are in /packages)
    const packages = [
        '../isomorphic-core',
        '../isomorphic-database',
        '../isomorphic-mesh',
        '../isomorphic-ui'
    ].map(p => path.resolve(__dirname, p));
    
    await runDevMode(packages);
  });

program.parse();
