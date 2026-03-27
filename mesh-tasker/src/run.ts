import { IServiceBroker } from '@flybyme/isomorphic-core';
import { nanoid } from 'nanoid';
import { bootstrapMeshTasker } from './index';
import { TaskWorkerService } from './services/TaskWorker.service';
import { CompilerService, ManifestService } from '@flybyme/isomorphic-compiler';
import { DeliveryService } from '@flybyme/isomorphic-cdn';

// Notice: We don't even need to import the `Task` type or `CreateTaskParams` here.
// The compiler already knows exactly what they are via `task.contract.ts`.
import './contracts/task.contract';
import { Task } from './schemas/task.schema';
import './ui/pages/Dashboard';

async function main(): Promise<void> {
    try {
        const gatewayApp = await bootstrapMeshTasker({
            nodeID: 'node-a',
            role: 'gateway',
            mesh: {
                network: { endpoints: [] },
                telemetry: {
                    logging: { drains: ['console', 'mesh'] }
                }
            },
            port: 5020,
            bootstrapNodes: [],
            dbPath: './data/mesh-tasker.db'
        });

        // Rule 3: Safe DI (Strict generic for the provider)
        const gatewayBroker = gatewayApp.getProvider<IServiceBroker>('broker');
        // gatewayBroker.on('*', (payload: any, packet: any) => {
        //     // Only relay business events. Ignore internal mesh chatter.
        //     if (packet.type === 'EVENT' && !packet.topic.startsWith('$node.')) {

        //         // Prevent infinite echo loops by making sure we didn't send this
        //         if (packet.senderNodeID !== gatewayApp.nodeID) {

        //             // Re-publish the event down to connected browsers
        //             gatewayBroker.emit(packet.topic, payload);
        //         }
        //     }
        // });

        const workerApp = await bootstrapMeshTasker({
            nodeID: 'node-c',
            role: 'worker',
            mesh: {
                telemetry: {
                    logging: { drains: ['console', 'mesh'] }
                }
            },
            port: 5021,
            bootstrapNodes: ['ws://127.0.0.1:5020'],
            dbPath: './data/mesh-tasker.db'
        });

        const taskWorker = new TaskWorkerService(workerApp.logger);
        await workerApp.registerService(taskWorker);

        // --- CDN Edge Service Setup ---
        const deliveryService = new DeliveryService();
        await gatewayApp.registerService(deliveryService);
        gatewayApp.logger.info(`CDN Delivery Service started on Gateway node (port 3000)`);

        // --- Compiler & Manifest Service Setup ---
        const compilerService = new CompilerService();
        const manifestService = new ManifestService();

        await workerApp.registerService(compilerService);
        await workerApp.registerService(manifestService);


        // --- Wait for discovery ---
        await gatewayApp.registry.waitForService('mesh.manifest', 5000);
        await gatewayApp.registry.waitForService('mesh.compiler', 5000);

        // --- Trigger Initial Build using Manifest Path ---
        gatewayApp.logger.info(`Triggering initial build from manifest path...`);
        const buildResult = await gatewayBroker.call('mesh.compiler.build_from_path', {
            manifestPath: 'src/ui/tasker.manifest.ts',
            watch: true
        });
        gatewayApp.logger.info(`Build queued`, { buildId: buildResult.buildId });

        // ---------------------------------------------------------
        // BASIC INFERENCE
        // TypeScript automatically infers the types of events and RPC calls
        // based on the service definitions and contracts.
        const workerBroker = workerApp.getProvider<IServiceBroker>('broker');

        workerBroker.on('tasks.created', (task: Task) => {
            // TypeScript infers `task` is of type `Task` here without any explicit annotation.
            workerApp.logger.info(`[WORKER EVENT] Created: "${task.title}"`);
        });
        // ---------------------------------------------------------
        // EVENT INFERENCE
        // TypeScript knows `task` is of type `Task` automatically 
        // because of the event registry contracts.
        // ---------------------------------------------------------
        gatewayBroker.on('tasks.created', (task: Task) => {
            gatewayApp.logger.info(`[EVENT] Created: "${task.title}"`);
        });

        await gatewayApp.registry.waitForService('tasks', 5000);

        // --- PERSISTENCE DEMO: List existing tasks first ---
        const existingTasks = await gatewayBroker.call('tasks.list', {});
        gatewayApp.logger.info(`Found ${existingTasks.length} existing tasks in SQLite:`);
        if (existingTasks.length > 0) {
            console.table(existingTasks.map(t => ({
                ID: t.id,
                Title: t.title,
                Status: t.status,
                AssignedTo: t.assignedTo,
                CreatedAt: t.createdAt,
                UpdatedAt: t.updatedAt,
            })));
        }

        // ---------------------------------------------------------
        // RPC INFERENCE (The true power of TypeScript)
        // ---------------------------------------------------------

        // 1. The compiler forces the second argument to perfectly match `CreateTaskParams`
        // 2. The compiler infers `newTask` is of type `Task` without any generic casting.
        const newTask = await gatewayBroker.call('tasks.create', {
            id: nanoid(),
            title: `Task ${existingTasks.length + 1}: Deploy Iron Mesh`,
            status: 'pending' as any,
            assignedTo: 'timothy',
            priority: 'medium',
            tags: []
        });
        
        if (!newTask) throw new Error('Failed to create task');

        gatewayApp.logger.info(`Created New Task: ${newTask.id}`);

        // The compiler enforces that we only pass `{ id: string }` here
        const updatedTask = await gatewayBroker.call('tasks.toggleStatus', {
            id: newTask.id
        });
        gatewayApp.logger.info(`Updated Task Status: ${updatedTask.status}`);

        // --- CRUD AUTO-PROVISIONING DEMO ---
        const taskCount = await gatewayBroker.call('tasks.count', {});
        gatewayApp.logger.info(`Total tasks in DB: ${taskCount}`);

        const fetchedTask = await gatewayBroker.call('tasks.get', { id: newTask.id });
        if (!fetchedTask) throw new Error(`Failed to fetch task ${newTask.id}`);
        gatewayApp.logger.info(`Fetched task by ID`, { id: fetchedTask.id, title: fetchedTask.title });

        gatewayApp.logger.info(`Demo is running. Visit http://localhost:3000 to see the Mesh CDN in action.`);
        gatewayApp.logger.warn('Press Ctrl+C to stop.');

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\n🛑 Shutting down...');
            await gatewayApp.stop();
            await workerApp.stop();
            process.exit(0);
        });

    } catch (_err: unknown) {
        if (_err instanceof Error) {
            console.error('Fatal Error:', _err.message);
        }
        process.exit(1);

    }
}

main();