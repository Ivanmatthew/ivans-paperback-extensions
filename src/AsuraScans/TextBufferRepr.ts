export class TextBufferRepr {
    private buffer: string
    private isLocked: boolean
    private bufferArray: string[]

    constructor(initialText: string = '') {
        this.buffer = initialText
        this.isLocked = false
        this.bufferArray = []
    }

    public append(text: string): void {
        if (this.isLocked) {
            throw new Error('TextBufferRepr is locked')
        }
        this.buffer += text
    }

    private processSerializedBufferLine(line: string): void {
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

    public finalize(): void {
        this.isLocked = true

        let currentChunk = ''
        let expectedLength = 0
        let accumulatedLength = 0
        this.buffer.split('\n').forEach((line) => {
            if (expectedLength === 0) {
                currentChunk += line

                const strSplitIndex = currentChunk.indexOf(':')
                if (strSplitIndex === -1) {
                    return
                }
                if (currentChunk[strSplitIndex + 1] !== 'T') {
                    this.processSerializedBufferLine(currentChunk)
                    currentChunk = ''
                    return
                } else {
                    const commaIndex = currentChunk.indexOf(',')
                    const length = currentChunk.match(/T(\d+),/)?.[1]
                    if (length && commaIndex !== -1) {
                        expectedLength = parseInt(length, 16)
                        const countableChunk = currentChunk.slice(
                            commaIndex + 1
                        )

                        if (countableChunk.length === expectedLength) {
                            this.processSerializedBufferLine(line)
                            currentChunk = ''
                            expectedLength = 0
                        } else if (countableChunk.length > expectedLength) {
                            throw new Error(
                                `An error occurred while processing '${countableChunk}' (${countableChunk.length}), found length: '${length}', commaIndex: '${commaIndex}'`
                            )
                        } else {
                            accumulatedLength = line.length - (commaIndex + 1)
                        }
                    } else {
                        throw new Error(
                            `An error occurred while processing '${currentChunk}', found length: '${length}', commaIndex: '${commaIndex}'`
                        )
                    }
                }
            } else {
                accumulatedLength += line.length
                if (accumulatedLength === expectedLength) {
                    this.processSerializedBufferLine(currentChunk)
                    currentChunk = ''
                    expectedLength = 0
                    accumulatedLength = 0
                } else if (accumulatedLength > expectedLength) {
                    const strSplitIndex = line.indexOf(':')
                    if (strSplitIndex !== -1 && strSplitIndex < 10) {
                        const newChunkStartMatch = line.match(
                            /^.*?([0-9a-fA-F]*:).*/
                        )
                        if (!newChunkStartMatch) {
                            throw new Error(
                                `An error occurred while processing ${line}`
                            )
                        }

                        const newChunkStart = newChunkStartMatch[1]
                        if (!newChunkStart) {
                            throw new Error(
                                `An error occurred while processing ${line}`
                            )
                        }
                        const newChunkStartIndex = line.indexOf(newChunkStart)
                        const newChunk = line.slice(newChunkStartIndex)

                        currentChunk += line.slice(0, newChunkStartIndex)
                        // Process the second part of the line which is the next chunk. Edgecase would be when two html chunk lines are after each other and are merged together.
                        // Though no such case has been observed so we'll see it when it happens ;-)
                        this.processSerializedBufferLine(currentChunk)
                        this.processSerializedBufferLine(newChunk)

                        currentChunk = ''
                        expectedLength = 0
                        accumulatedLength = 0
                    } else {
                        throw new Error(
                            `An error occurred while processing ${currentChunk} (${accumulatedLength}), expected length: ${expectedLength}`
                        )
                    }
                } else {
                    currentChunk += line
                }
            }
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

    public bufferArrayAsHex(): { [key: string]: string } {
        const bufferArrayHex: { [key: string]: string } = {}
        this.bufferArray.forEach((value: any, index: number) => {
            if (value) {
                bufferArrayHex[index.toString(16)] = value
            }
        })

        return bufferArrayHex
    }

    private replacePointers(text: string): string {
        const pointerRegex = /\$[0-9a-fA-F]+/g

        let json: any
        try {
            json = JSON.parse(text)
        } catch (error) {}

        if (json) {
            return JSON.stringify(json, (key, value) => {
                if (typeof value === 'string') {
                    return this.replacePointers(value)
                }

                return value
            })
        }

        return text.replace(pointerRegex, (match) => {
            const hexIndex = match.slice(1)
            const value = this.getWithHex(hexIndex)
            if (value?.match(pointerRegex)) {
                return this.replacePointers(value)
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
