import { jest, describe, it, expect } from '@jest/globals';
import { BinaryStreamTransformer } from '../src/core/BinaryStreamTransformer';
import { MeshStream } from '../src/core/MeshStream';

describe('BinaryStreamTransformer', () => {
    describe('toUint8Array', () => {
        it('should pass through Uint8Array', () => {
            const input = new Uint8Array([1, 2, 3]);
            const output = BinaryStreamTransformer.toUint8Array(input);
            expect(output).toBe(input);
        });

        it('should convert string to Uint8Array', () => {
            const input = 'hello';
            const output = BinaryStreamTransformer.toUint8Array(input);
            expect(output).toBeInstanceOf(Uint8Array);
            expect(new TextDecoder().decode(output)).toBe('hello');
        });

        it('should convert ArrayBuffer to Uint8Array', () => {
            const input = new ArrayBuffer(8);
            const output = BinaryStreamTransformer.toUint8Array(input);
            expect(output.byteLength).toBe(8);
        });

        it('should handle ArrayBuffer views', () => {
            const buf = new ArrayBuffer(16);
            const view = new Int32Array(buf, 4, 2);
            const output = BinaryStreamTransformer.toUint8Array(view);
            expect(output.byteLength).toBe(8);
            expect(output.byteOffset).toBe(4);
        });
    });

    describe('pipeBinary', () => {
        it('should normalize chunks while piping', async () => {
            const input = new MeshStream<string>({});
            const mockWrite = jest.fn() as jest.Mock<(data: unknown) => Promise<void>>;
            const output = new MeshStream<Uint8Array>({
                onWrite: mockWrite
            });

            BinaryStreamTransformer.pipeBinary(input, output);

            input.push('chunk-a');
            
            // Wait for event propagation
            await new Promise(resolve => setTimeout(resolve, 50));


            expect(output.status).toBe('OPEN');
            expect(mockWrite).toHaveBeenCalled();
            const calledData = mockWrite.mock.calls[0][0];
            expect(calledData).toBeInstanceOf(Uint8Array);
        });



        it('should propagate end and error events', async () => {
            const input = new MeshStream({});
            const output = new MeshStream({
                onEnd: jest.fn() as jest.Mock<() => Promise<void>>
            });

            BinaryStreamTransformer.pipeBinary(input, output);

            await input.end();
            expect(output.status).toBe('CLOSED');

            const errorInput = new MeshStream({});
            const errorOutput = new MeshStream({ onError: jest.fn() as jest.Mock<(err: any) => Promise<void>> });
            BinaryStreamTransformer.pipeBinary(errorInput, errorOutput);
            
            const err = { message: 'boom', code: 'BOOM', status: 500 };
            await errorInput.error(err as any);
            expect(errorOutput.status).toBe('ERROR');
        });
    });

});
