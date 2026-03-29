// FILE: src/domains/sys.artifacts/actions/register.ts
import { IContext, MeshError } from '@flybyme/isomorphic-core';
import { RegisterArtifactParamsSchema, ArtifactSchema, Artifact } from '../artifacts.schema';
import { z } from 'zod';
import type { ArtifactsService } from '../artifacts.service';

type RegisterParams = z.infer<typeof RegisterArtifactParamsSchema>;

export const register = {
  params: RegisterArtifactParamsSchema,
  returns: ArtifactSchema,
  async handler(this: ArtifactsService, ctx: IContext<RegisterParams>): Promise<Artifact> {
    const { name, type, description, manifest, metadata } = RegisterArtifactParamsSchema.parse(ctx.params);

    if (type === 'protocol' && !manifest) {
      throw new MeshError({ code: 'VALIDATION_ERROR', message: 'Protocol artifacts require a manifest.', status: 400 });
    }

    const id = `${type === 'protocol' ? 'prot' : 'cap'}_${name.toLowerCase().replace(/\s+/g, '_')}_v${metadata.version.replace(/\./g, '')}`;

    const existing = await this.db.find({ id });
    if (existing.length > 0) {
      throw new MeshError({ code: 'CONFLICT', message: `Artifact '${id}' already exists.`, status: 409 });
    }

    const now = Date.now();
    await this.db.create({
      type,
      name,
      description,
      manifest,
      metadata: {
        ...metadata,
        createdAt: now,
        updatedAt: now
      },
    });

    this.logger.info(`[sys.artifacts] Registered: ${id} (${type})`);
    ctx.emit('sys.artifacts.registered', { id, type, name });

    const results = await this.db.find({ id });
    return results[0];
  },
};
