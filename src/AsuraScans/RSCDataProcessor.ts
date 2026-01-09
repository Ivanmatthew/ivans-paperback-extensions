// @ts-ignore
import { TextEncoder, TextDecoder } from '@sinonjs/text-encoding'

// Pre-compiled regex - avoids recreation on each call (was O(n) per replacePointers call)
const POINTER_REGEX = /\$[0-9a-fA-F]+/g
const LENGTH_REGEX = /T([0-9a-fA-F]+),/

export class RSCDataProcessor {
    private textEncoder: TextEncoder
    private textDecoder: TextDecoder
    private bufferChunks: string[]  // O(1) append vs O(n) string concat
    private isLocked: boolean
    private bufferArray: string[]
    private currentChunkIndex: number  // Store index instead of rebuilding string
    private currentChunkByteArray: Uint8Array  // Pre-allocated typed array
    private byteArrayWritePos: number  // Track position for efficient writes
    private expectedByteArrayLength: number

    constructor(initialText: string = '') {
        this.textEncoder = new TextEncoder()
        this.textDecoder = new TextDecoder()

        this.bufferChunks = initialText ? [initialText] : []
        this.isLocked = false
        this.bufferArray = []

        this.currentChunkIndex = -1
        this.currentChunkByteArray = new Uint8Array(0)
        this.byteArrayWritePos = 0
        this.expectedByteArrayLength = 0
    }

    // O(1) amortized append instead of O(n) string concatenation
    public append(text: string): void {
        if (this.isLocked) {
            throw new Error('TextBufferRepr is locked')
        }
        this.bufferChunks.push(text)
    }

    private processSerializedBufferLine(line: string, idx?: number): void {
        if (idx !== undefined) {
            this.bufferArray[idx] = line
            return
        }
        const strSplitIndex = line.indexOf(':')
        if (strSplitIndex === -1) {
            return
        }

        const hexIndex = line.slice(0, strSplitIndex)
        const intIndex = parseInt(hexIndex, 16)
        const value = line.slice(strSplitIndex + 1)

        this.bufferArray[intIndex] = value
    }

    // Append bytes to the pre-allocated buffer, growing if needed
    private appendToByteArray(bytes: Uint8Array): void {
        const requiredLength = this.byteArrayWritePos + bytes.length
        if (requiredLength > this.currentChunkByteArray.length) {
            // Grow buffer with some headroom to reduce reallocations
            const newSize = Math.max(requiredLength, this.currentChunkByteArray.length * 2, 256)
            const newArray = new Uint8Array(newSize)
            newArray.set(this.currentChunkByteArray.subarray(0, this.byteArrayWritePos))
            this.currentChunkByteArray = newArray
        }
        this.currentChunkByteArray.set(bytes, this.byteArrayWritePos)
        this.byteArrayWritePos += bytes.length
    }

    private resetChunkState(): void {
        this.currentChunkIndex = -1
        this.byteArrayWritePos = 0
        this.expectedByteArrayLength = 0
    }

    private transformSerializedBufferLine(line: string): void {
        line += '\n'
        if (this.expectedByteArrayLength === 0) {
            const strSplitIndex = line.indexOf(':')
            if (strSplitIndex === -1) {
                console.log(
                    `Hi, this is the edgecase: ${line}; idx=${this.currentChunkIndex}, ${this.byteArrayWritePos}, ${this.expectedByteArrayLength}`
                )
                throw new Error(
                    'Uncaught edgecase, please report to get this fixed!'
                )
            }
            if (line[strSplitIndex + 1] !== 'T') {
                this.processSerializedBufferLine(line)
            } else {
                const commaIndex = line.indexOf(',')
                const lengthMatch = LENGTH_REGEX.exec(line)
                const length = lengthMatch?.[1]
                if (length && commaIndex !== -1) {
                    this.expectedByteArrayLength = parseInt(length, 16)
                    const countableChunk = line.slice(commaIndex + 1)
                    const countableByteArray = this.textEncoder.encode(countableChunk)
                    
                    if (countableByteArray.length === this.expectedByteArrayLength) {
                        const idx = parseInt(line.slice(0, strSplitIndex), 16)
                        this.processSerializedBufferLine(countableChunk, idx)
                        this.resetChunkState()
                    } else if (countableByteArray.length > this.expectedByteArrayLength) {
                        // Store index for later use
                        this.currentChunkIndex = parseInt(line.slice(0, strSplitIndex), 16)
                        this.appendToByteArray(countableByteArray)
                        
                        // Decode only the needed portions using subarray (no copy)
                        const actualChunk = this.textDecoder.decode(
                            this.currentChunkByteArray.subarray(0, this.expectedByteArrayLength)
                        )
                        const otherChunk = this.textDecoder.decode(
                            this.currentChunkByteArray.subarray(this.expectedByteArrayLength, this.byteArrayWritePos)
                        )
                        
                        this.processSerializedBufferLine(actualChunk, this.currentChunkIndex)
                        this.resetChunkState()
                        this.transformSerializedBufferLine(otherChunk)
                    } else {
                        this.currentChunkIndex = parseInt(line.slice(0, strSplitIndex), 16)
                        this.appendToByteArray(countableByteArray)
                    }
                } else {
                    throw new Error(
                        `An error occurred while processing idx=${this.currentChunkIndex}, found length: '${length}', commaIndex: '${commaIndex}'`
                    )
                }
            }
        } else {
            const lineBytes = this.textEncoder.encode(line)
            this.appendToByteArray(lineBytes)
            
            if (this.byteArrayWritePos === this.expectedByteArrayLength) {
                this.processSerializedBufferLine(
                    this.textDecoder.decode(
                        this.currentChunkByteArray.subarray(0, this.byteArrayWritePos)
                    ),
                    this.currentChunkIndex
                )
                this.resetChunkState()
            } else if (this.byteArrayWritePos > this.expectedByteArrayLength) {
                const actualChunk = this.textDecoder.decode(
                    this.currentChunkByteArray.subarray(0, this.expectedByteArrayLength)
                )
                const otherChunk = this.textDecoder.decode(
                    this.currentChunkByteArray.subarray(this.expectedByteArrayLength, this.byteArrayWritePos)
                )
                
                this.processSerializedBufferLine(actualChunk, this.currentChunkIndex)
                this.resetChunkState()
                this.transformSerializedBufferLine(otherChunk)
            }
        }
    }

    public process(): void {
        if (this.isLocked) {
            throw new Error('RSCDataProcessor instance is locked')
        }
        this.isLocked = true

        // Join once at process time - O(n) total instead of O(n²) from repeated concat
        const buffer = this.bufferChunks.join('')
        // Store joined buffer for getBuffer() calls
        this.bufferChunks = [buffer]
        
        // Process lines without creating intermediate array
        let lineStart = 0
        for (let i = 0; i < buffer.length; i++) {
            if (buffer[i] === '\n') {
                if (i > lineStart) {
                    this.transformSerializedBufferLine(buffer.slice(lineStart, i))
                }
                lineStart = i + 1
            }
        }
        // Handle last line without newline
        if (lineStart < buffer.length) {
            this.transformSerializedBufferLine(buffer.slice(lineStart))
        }
    }

    public get(index: number): string | null {
        return this.bufferArray[index] ?? null
    }

    public getWithHex(hexIndex: string): string | null {
        const intIndex = parseInt(hexIndex, 16)
        return this.get(intIndex)
    }

    // Optimized: iterate without creating intermediate arrays/objects
    public findByString(
        findString: string[],
        excludeString: string[],
        returnAsHex: boolean = false,
        searchBackwards: boolean = true
    ): string | null {
        const arr = this.bufferArray
        const len = arr.length
        
        // Direct iteration - no array copy or reversal needed
        if (searchBackwards) {
            for (let i = len - 1; i >= 0; i--) {
                const entry = arr[i]
                if (entry && this.matchesFilters(entry, findString, excludeString)) {
                    return returnAsHex ? i.toString(16) : i.toString()
                }
            }
        } else {
            for (let i = 0; i < len; i++) {
                const entry = arr[i]
                if (entry && this.matchesFilters(entry, findString, excludeString)) {
                    return returnAsHex ? i.toString(16) : i.toString()
                }
            }
        }
        return null
    }

    private matchesFilters(entry: string, findString: string[], excludeString: string[]): boolean {
        for (const str of findString) {
            if (!entry.includes(str)) return false
        }
        for (const exStr of excludeString) {
            if (entry.includes(exStr)) return false
        }
        return true
    }

    public getBuffer(): string {
        return this.bufferChunks.join('')
    }

    public bufferArrayAsHex(): { [key: string]: string } {
        const bufferArrayHex: { [key: string]: string } = {}
        const arr = this.bufferArray
        for (let i = 0; i < arr.length; i++) {
            const value = arr[i]
            if (value) {
                bufferArrayHex[i.toString(16)] = value
            }
        }
        return bufferArrayHex
    }

    private replacePointers(text: string, _currentDepth: number = 0): string {
        // Detect circular dependency
        if (_currentDepth > this.bufferArray.length) {
            throw new Error('Circular dependency detected, please report!')
        }

        let json: any
        try {
            json = JSON.parse(text)
        } catch (error) {}

        if (json) {
            return JSON.stringify(json, (_key, value) => {
                if (
                    typeof value === 'string' &&
                    _currentDepth < this.bufferArray.length &&
                    POINTER_REGEX.test(value)
                ) {
                    // Reset lastIndex since we're reusing the global regex
                    POINTER_REGEX.lastIndex = 0
                    return this.replacePointers(value, _currentDepth + 1)
                }
                return value
            })
        }

        // Reset lastIndex before using global regex
        POINTER_REGEX.lastIndex = 0
        return text.replace(POINTER_REGEX, (match) => {
            const hexIndex = match.slice(1)
            const value = this.getWithHex(hexIndex)
            if (value && POINTER_REGEX.test(value) && _currentDepth < this.bufferArray.length) {
                POINTER_REGEX.lastIndex = 0
                return this.replacePointers(value, _currentDepth + 1)
            }
            return value ?? match
        })
    }

    public resolveIndex(
        index: number,
        transformerFunc?: (value: string) => any
    ): any {
        const bufferEntry = this.bufferArray[index]
        if (bufferEntry === undefined) {
            throw new Error(`Index ${index} not found`)
        }

        const endResult = this.replacePointers(bufferEntry)

        return transformerFunc ? transformerFunc(endResult) : endResult
    }

    public resolveIndexWithHex(
        hexIndex: string,
        transformerFunc?: (value: string) => any
    ): any {
        const intIndex = parseInt(hexIndex, 16)

        return this.resolveIndex(intIndex, transformerFunc)
    }
}
