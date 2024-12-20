// @ts-ignore
import { TextEncoder, TextDecoder } from '@sinonjs/text-encoding'

export class RSCDataProcessor {
    private textEncoder: TextEncoder
    private textDecoder: TextDecoder
    private buffer: string
    private isLocked: boolean
    private bufferArray: string[]
    private currentChunk: string
    private currentChunkInByteArray: number[]
    private expectedByteArrayLength: number

    constructor(initialText: string = '') {
        this.textEncoder = new TextEncoder()
        this.textDecoder = new TextDecoder()

        this.buffer = initialText
        this.isLocked = false
        this.bufferArray = []

        this.currentChunk = ''
        this.currentChunkInByteArray = []
        this.expectedByteArrayLength = 0
    }

    public append(text: string): void {
        if (this.isLocked) {
            throw new Error('TextBufferRepr is locked')
        }
        this.buffer += text
    }

    private processSerializedBufferLine(line: string, idx?: number): void {
        if (idx !== undefined) {
            this.bufferArray[idx] = line
            return
        }
        // This should only process a line which has been preprocessed to ensure it is a valid buffer line
        // Therefore, this method does not check for validity and trusts the input
        const strSplitIndex = line.indexOf(':')
        if (strSplitIndex === -1) {
            return
        }

        const hexIndex = line.slice(0, strSplitIndex)
        const intIndex = parseInt(hexIndex, 16)
        const value = line.slice(strSplitIndex + 1)

        this.bufferArray[intIndex] = value
    }

    private transformSerializedBufferLine(line: string): void {
        line += '\n'
        if (this.expectedByteArrayLength === 0) {
            const strSplitIndex = line.indexOf(':')
            if (strSplitIndex === -1) {
                console.log(
                    `Hi, this is the edgecase: ${line}; ${this.currentChunk}, ${this.currentChunkInByteArray.length}, ${this.expectedByteArrayLength}`
                )
                throw new Error(
                    'Uncaught edgecase, please report to get this fixed!'
                )
            }
            if (line[strSplitIndex + 1] !== 'T') {
                this.processSerializedBufferLine(line)
            } else {
                const commaIndex = line.indexOf(',')
                const length = line.match(/T([0-9a-fA-F]+),/)?.[1]
                if (length && commaIndex !== -1) {
                    this.expectedByteArrayLength = parseInt(length, 16)
                    const countableChunk = line.slice(commaIndex + 1)
                    const countableByteArray: Uint8Array =
                        this.textEncoder.encode(countableChunk)
                    if (
                        countableByteArray.length ===
                        this.expectedByteArrayLength
                    ) {
                        const idx = parseInt(line.slice(0, strSplitIndex), 16)
                        this.processSerializedBufferLine(countableChunk, idx)
                        this.currentChunk = ''
                        this.currentChunkInByteArray = []
                        this.expectedByteArrayLength = 0
                    } else if (
                        countableByteArray.length > this.expectedByteArrayLength
                    ) {
                        this.currentChunkInByteArray =
                            this.currentChunkInByteArray.concat(
                                Array.from(countableByteArray)
                            )
                        this.currentChunk += line

                        const toTraverseLength =
                            this.expectedByteArrayLength -
                            this.currentChunkInByteArray.length
                        const actualChunkByteArray =
                            this.currentChunkInByteArray.slice(
                                0,
                                toTraverseLength
                            )
                        const actualChunk = this.textDecoder.decode(
                            Uint8Array.from(actualChunkByteArray)
                        )
                        const otherChunk = this.textDecoder.decode(
                            Uint8Array.from(
                                this.currentChunkInByteArray.slice(
                                    toTraverseLength
                                )
                            )
                        )
                        this.processSerializedBufferLine(
                            actualChunk,
                            parseInt(
                                this.currentChunk.slice(0, strSplitIndex),
                                16
                            )
                        )
                        this.transformSerializedBufferLine(otherChunk)
                    } else {
                        this.currentChunk = line
                        this.currentChunkInByteArray =
                            this.currentChunkInByteArray.concat(
                                Array.from(
                                    this.textEncoder.encode(countableChunk)
                                )
                            )
                    }
                } else {
                    throw new Error(
                        `An error occurred while processing '${this.currentChunk}', found length: '${length}', commaIndex: '${commaIndex}'`
                    )
                }
            }
        } else {
            this.currentChunkInByteArray = this.currentChunkInByteArray.concat(
                Array.from(this.textEncoder.encode(line))
            )
            this.currentChunk += line
            if (
                this.currentChunkInByteArray.length ===
                this.expectedByteArrayLength
            ) {
                this.processSerializedBufferLine(
                    this.textDecoder.decode(
                        Uint8Array.from(this.currentChunkInByteArray)
                    )
                )
                this.currentChunk = ''
                this.expectedByteArrayLength = 0
                this.currentChunkInByteArray = []
            } else if (
                this.currentChunkInByteArray.length >
                this.expectedByteArrayLength
            ) {
                const toTraverseLength =
                    this.expectedByteArrayLength -
                    this.currentChunkInByteArray.length
                const actualChunkByteArray = this.currentChunkInByteArray.slice(
                    0,
                    toTraverseLength
                )
                const actualChunk = this.textDecoder.decode(
                    Uint8Array.from(actualChunkByteArray)
                )
                const otherChunk = this.textDecoder.decode(
                    Uint8Array.from(
                        this.currentChunkInByteArray.slice(toTraverseLength)
                    )
                )
                const strSplitIndex = this.currentChunk.indexOf(':')
                this.processSerializedBufferLine(
                    actualChunk,
                    parseInt(this.currentChunk.slice(0, strSplitIndex), 16)
                )
                this.expectedByteArrayLength = 0
                this.currentChunk = ''
                this.currentChunkInByteArray = []
                this.transformSerializedBufferLine(otherChunk)
            }
        }
    }

    public process(): void {
        if (this.isLocked) {
            throw new Error('RSCDataProcessor instance is locked')
        }
        this.isLocked = true

        this.buffer.split('\n').forEach((line, idx) => {
            if (line === '') {
                return
            }
            this.transformSerializedBufferLine(line)
        })
    }

    public get(index: number): string | null {
        return this.bufferArray[index] ?? null
    }

    public getWithHex(hexIndex: string): string | null {
        const intIndex = parseInt(hexIndex, 16)
        return this.get(intIndex)
    }

    public findByString(
        findString: string[],
        exludeString: string[],
        returnAsHex: boolean = false
    ): string | null {
        // Find whether the findStrings are contained in a bufferarray entry and if so, return the entry
        if (returnAsHex) {
            const hexBufferArray = this.bufferArrayAsHex()
            for (const [index, entry] of Object.entries(hexBufferArray)) {
                if (
                    entry &&
                    findString.every(
                        (str) =>
                            entry.includes(str) &&
                            !exludeString.some((exStr) => entry.includes(exStr))
                    )
                ) {
                    return index
                }
            }
        } else {
            for (const [index, entry] of this.bufferArray.entries()) {
                if (
                    entry &&
                    findString.every(
                        (str) =>
                            entry.includes(str) &&
                            !exludeString.some((exStr) => entry.includes(exStr))
                    )
                ) {
                    return index.toString()
                }
            }
        }

        return null
    }

    public getBuffer(): string {
        return this.buffer
    }

    public bufferArrayAsHex(): { [key: string]: string } {
        const bufferArrayHex: { [key: string]: string } = {}
        this.bufferArray.forEach((value: any, index: number) => {
            if (value) {
                bufferArrayHex[index.toString(16)] = value
            }
        })

        return bufferArrayHex
    }

    private replacePointers(
        text: string,
        maxDepth: number = 64,
        _currentDepth: number = 0
    ): string {
        const pointerRegex = /\$[0-9a-fA-F]+/g

        let json: any
        try {
            json = JSON.parse(text)
        } catch (error) {}

        if (json) {
            return JSON.stringify(json, (key, value) => {
                if (
                    typeof value === 'string' &&
                    _currentDepth < maxDepth &&
                    value.match(pointerRegex)
                ) {
                    _currentDepth++
                    const replaceVal = this.replacePointers(
                        value,
                        maxDepth,
                        _currentDepth
                    )
                    return replaceVal
                }

                return value
            })
        }

        return text.replace(pointerRegex, (match) => {
            const hexIndex = match.slice(1)
            const value = this.getWithHex(hexIndex)
            if (value?.match(pointerRegex) && _currentDepth < maxDepth) {
                _currentDepth++
                return this.replacePointers(value, maxDepth, _currentDepth)
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
