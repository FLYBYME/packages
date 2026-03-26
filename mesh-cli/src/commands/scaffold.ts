import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';

/**
 * Service Scaffolder — Generates Triad Files.
 */
export async function scaffoldService(name: string, targetDir: string) {
    const domain = name.toLowerCase();
    const basePath = path.join(targetDir, domain);
    
    await fs.ensureDir(basePath);

    // 1. Schema
    const schemaContent = `import { z } from 'zod';

export const ${name}Schema = z.object({
  id: z.string().uuid().optional(),
  name: z.string(),
  // Add domain fields
});

export type I${name} = z.infer<typeof ${name}Schema>;
`;

    // 2. Contract
    const contractContent = `import { IServiceActionRegistry } from '@mesh-app/core';
import { ${name}Schema, I${name} } from './${domain}.schema';

declare module '@mesh-app/core' {
  interface IServiceActionRegistry {
    '${domain}.create': { params: I${name}, returns: I${name} };
    '${domain}.find': { params: Partial<I${name}>, returns: I${name}[] };
  }
}
`;

    // 3. Service
    const serviceContent = `import { DatabaseMixin } from '@mesh-app/database';
import { ${name}Schema } from './${domain}.schema';

export class ${name}Service {
  public name = '${domain}';
  public mixins = [DatabaseMixin];
  
  public settings = {
    schema: ${name}Schema,
    tableName: '${domain}s'
  };

  public actions = {
    async create(ctx: any) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await (this as any).db.create(ctx.params);
    },
    async find(ctx: any) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await (this as any).db.find(ctx.params);
    }
  };
}
`;

    await fs.writeFile(path.join(basePath, `${domain}.schema.ts`), schemaContent);
    await fs.writeFile(path.join(basePath, `${domain}.contract.ts`), contractContent);
    await fs.writeFile(path.join(basePath, `${domain}.service.ts`), serviceContent);

    console.log(chalk.green(`\n🚀 [Scaffolder] Triad files created for "${name}" in ${basePath}`));
    console.log(chalk.gray(`- ${domain}.schema.ts`));
    console.log(chalk.gray(`- ${domain}.contract.ts`));
    console.log(chalk.gray(`- ${domain}.service.ts`));
}
