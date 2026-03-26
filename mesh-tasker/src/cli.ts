import { bootstrapMeshTasker } from './index';

async function run() {
    const args = process.argv.slice(2);
    const roleArg = args.find(a => a.startsWith('--role='))?.split('=')[1];
    const nodeIdArg = args.find(a => a.startsWith('--nodeId='))?.split('=')[1];

    if (!roleArg || !nodeIdArg) {
        console.log('Usage: npx ts-node -r tsconfig-paths/register src/cli.ts --role=[gateway|worker|auth] --nodeId=[name]');
        process.exit(1);
    }

    const role = roleArg;
    console.log(`\n--- 🚀 Starting MeshTasker [${role.toUpperCase()}] ---`);

    try {
        const app = await bootstrapMeshTasker({
            nodeID: nodeIdArg,
            role
        });

        console.log(`--- ✅ Node ${nodeIdArg} is online ---`);

        // Handle Shutdown
        process.on('SIGINT', async () => {
            console.log('\n🛑 Shutting down...');
            await app.stop();
            process.exit(0);
        });

    } catch (err) {
        console.error('❌ Failed to start node:', err);
        process.exit(1);
    }
}

run();
