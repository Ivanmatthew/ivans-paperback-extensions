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

    public finalize(): void {
        this.isLocked = true

        this.buffer.split('\n').forEach((line) => {
            const strSplitIndex = line.indexOf(':')
            if (strSplitIndex === -1) {
                return
            }

            const hexIndex = line.slice(0, strSplitIndex)
            const intIndex = parseInt(hexIndex, 16)
            const value = line.slice(strSplitIndex + 1)

            this.bufferArray[intIndex] = value
        })
    }

    public get(index: number): string | null {
        return this.bufferArray[index] ?? null
    }

    public getWithHex(hexIndex: string): string | null {
        const intIndex = parseInt(hexIndex, 16)
        return this.get(intIndex)
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
