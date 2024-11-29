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
    private amntCalled: number = 0

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
        // console.log('HEY!')
        // console.log(
        //     `The line is: ${line.length}, the expected length is: ${this.expectedByteArrayLength}, the current chunk is: ${this.currentChunk.length}, the current chunk in byte array is: ${this.currentChunkInByteArray.length}`
        // )
        this.amntCalled++
        line += '\n'
        // Initiation, starting chunk, we considerr expectedLength the control variable from which we can tell if this is the "first chunk"
        if (this.expectedByteArrayLength === 0) {
            // console.log(`Supposedly first encounter, no byte array length yet!`)
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
                // console.log('hmm?')
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
                        // console.log(
                        //     `The expected length is: ${this.expectedByteArrayLength}\n The length of the line is: ${line.length}, the length of countable is ${countableByteArray.length}, with length of ${this.currentChunkInByteArray.length}\n currentChunk: ${this.currentChunk}`
                        // )

                        const toTraverseLength =
                            this.expectedByteArrayLength -
                            this.currentChunkInByteArray.length
                        // console.log(
                        //     `Legnth to traverse (146): ${toTraverseLength}`
                        // )
                        // console.log(
                        //     `Your toTraverseLength: ${toTraverseLength}, expectedLength: ${
                        //         this.expectedByteArrayLength
                        //     }, accumulatedLength: ${
                        //         this.currentChunkInByteArray.length
                        //     }, amount of newLine characters: ${
                        //         line.match(/\n/g)?.length
                        //     }`
                        // )
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
                        // console.log(
                        //     `So it has actually become ${actualChunk}, ${otherChunk}`
                        // )
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
            // console.log(
            //     `Follow up of byte array encounter! ${this.currentChunk.slice(
            //         0,
            //         15
            //     )}`
            // )
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
                // console.log(`Length to traverse (221): ${toTraverseLength}`)
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
                // console.log(
                //     `Actual chunk: ${actualChunk}\nOther chunk: ${otherChunk}`
                // )
                const strSplitIndex = this.currentChunk.indexOf(':')
                this.processSerializedBufferLine(
                    actualChunk,
                    parseInt(this.currentChunk.slice(0, strSplitIndex), 16)
                )
                this.expectedByteArrayLength = 0
                this.currentChunk = ''
                this.currentChunkInByteArray = []
                // console.log('I call transform last branch!')
                this.transformSerializedBufferLine(otherChunk)
            }
            // else {
            //     console.log(
            //         `lol less than! ${this.currentChunkInByteArray.length}, ${this.expectedByteArrayLength}, ${this.currentChunk}`
            //     )
            // }
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
            // console.log(`I call from the foreach ${idx}`)
            this.transformSerializedBufferLine(line)
        })
        // console.log(`Amount of times called: ${this.amntCalled}`)
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
        returnAsHex: boolean = false
    ): string | null {
        // Find whether the findStrings are contained in a bufferarray entry and if so, return the entry
        if (returnAsHex) {
            const hexBufferArray = this.bufferArrayAsHex()
            for (const [index, entry] of Object.entries(hexBufferArray)) {
                if (entry && findString.every((str) => entry.includes(str))) {
                    return index
                }
            }
        } else {
            for (const [index, entry] of this.bufferArray.entries()) {
                if (entry && findString.every((str) => entry.includes(str))) {
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
