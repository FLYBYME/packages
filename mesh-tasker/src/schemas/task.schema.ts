import { z } from 'zod';

/**
 * Task Schema: Represents a task on the board.
 */
export const TaskSchema = z.object({
    id: z.string(),
    title: z.string().min(1).max(255),
    description: z.string().nullish().transform(val => val ?? undefined),
    status: z.enum(['backlog', 'pending', 'active', 'review', 'completed']),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).nullish().transform(val => val ?? 'medium'),
    tags: z.array(z.string()).nullish().transform(val => val ?? []),
    assignedTo: z.string().min(1),
    dueDate: z.number().nullish().transform(val => val ?? undefined),
    createdAt: z.number().nullish().transform(val => val ?? undefined),
    updatedAt: z.number().nullish().transform(val => val ?? undefined)
});

export type Task = z.infer<typeof TaskSchema>;

/**
 * User Schema: Represents a mesh user.
 */
export const UserSchema = z.object({
    id: z.string(),
    name: z.string().min(1),
    role: z.enum(['user', 'admin'])
});

export type User = z.infer<typeof UserSchema>;

/**
 * Action Parameters
 */
export const CreateTaskParams = TaskSchema.omit({ createdAt: true, updatedAt: true, id: true }).extend({
    id: z.string().optional()
});
export const UpdateTaskParams = TaskSchema.partial().extend({ 
    id: z.string(),
    expectedStatus: z.enum(['backlog', 'pending', 'active', 'review', 'completed']).optional()
});
export const ListTasksParams = z.object({
    status: z.enum(['backlog', 'pending', 'active', 'review', 'completed']).optional(),
    assignedTo: z.string().optional()
});
export type CreateTaskParams = z.infer<typeof CreateTaskParams>;
export type UpdateTaskParams = z.infer<typeof UpdateTaskParams>;
export type ListTasksParams = z.infer<typeof ListTasksParams>;
