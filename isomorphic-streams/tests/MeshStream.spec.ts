import { MeshStream } from '../src/core/MeshStream';
import { MeshError } from '@flybyme/isomorphic-core';

describe('MeshStream', () => {
    it('should write data and respect backpressure', async () => {
        const onWrite = jest.fn().mockResolvedValue(undefined);
        const stream = new MeshStream({ onWrite });

        await stream.write('chunk1');
        expect(onWrite).toHaveBeenCalledWith('chunk1');
        expect(stream.status).toBe('OPEN');

        // Trigger backpressure
        stream.pause();
        expect(stream.status).toBe('PAUSED');

        const writePromise = stream.write('chunk2');
        // Should be pending due to backpressure
        let resolved = false;
        writePromise.then(() => { resolved = true; });
        
        await new Promise(resolve => setTimeout(resolve, 10));
        expect(resolved).toBe(false);

        // Resume stream
        stream.resume();
        await writePromise;
        expect(resolved).toBe(true);
        expect(onWrite).toHaveBeenCalledWith('chunk2');
    });

    it('should handle end and error states', async () => {
        const onEnd = jest.fn().mockResolvedValue(undefined);
        const stream = new MeshStream({ onEnd });

        await stream.end();
        expect(stream.status).toBe('CLOSED');
        expect(onEnd).toHaveBeenCalled();

        await expect(stream.write('data')).rejects.toThrow('Cannot write to stream');
    });

    it('should propagate errors', async () => {
        const onError = jest.fn().mockResolvedValue(undefined);
        const stream = new MeshStream({ onError });
        const error = new MeshError({ message: 'BOOM', code: 'TEST_ERROR', status: 500 });

        const errorListener = jest.fn();
        stream.on('error', errorListener);

        await stream.error(error);
        expect(stream.status).toBe('ERROR');
        expect(onError).toHaveBeenCalledWith(error);
        expect(errorListener).toHaveBeenCalledWith(error);
    });
});
