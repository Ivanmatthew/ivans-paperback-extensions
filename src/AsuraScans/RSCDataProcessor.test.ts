import { describe, it, expect, beforeEach } from 'bun:test'
import { RSCDataProcessor } from './RSCDataProcessor'

describe('General TextBufferRepr', async () => {
    let textBuffer: RSCDataProcessor

    beforeEach(() => {
        textBuffer = new RSCDataProcessor()
    })

    it('should initialize with an empty buffer', () => {
        expect(textBuffer.getBuffer()).toBe('')
    })

    it('should append text to the buffer', () => {
        textBuffer.append('Hello')
        expect(textBuffer.getBuffer()).toBe('Hello')
    })

    it('should return the correct length of the buffer', () => {
        textBuffer.append('Hello')
        expect(textBuffer.getBuffer().length).toBe(5)
    })
})

function recurseParseJSON(value: string | object): string | object {
    if (typeof value === 'string') {
        try {
            const json = JSON.parse(value)
            return recurseParseJSON(json)
        } catch (error) {
            return value
        }
    } else if (typeof value === 'object') {
        for (const key in value) {
            ;(value as { [key: string]: any })[key] = recurseParseJSON(
                (value as { [key: string]: any })[key]
            )
        }
    } else if (Array.isArray(value)) {
        ;(value as []).forEach((element, index) => {
            ;(value as any[])[index] = recurseParseJSON(element)
        })
    }

    return value
}

describe.each([
    ['1', 124],
    ['2', 240],
    ['3', 214],
    ['4', 194],
    ['5', 244],
    ['6', 169]
])('RSCDataProcessor Test Case %s', async (casenumstr, expected) => {
    let textBuffer: RSCDataProcessor
    let caseData: string = await Bun.file(
        `./testmaterials/case${casenumstr}.txt`
    ).text()

    beforeEach(async () => {
        textBuffer = new RSCDataProcessor(caseData)
        textBuffer.process()
    })

    it('should append text to the buffer', () => {
        expect(textBuffer.getBuffer()).toBe(caseData)
    })

    it('should return the correct length of the buffer', () => {
        expect(textBuffer.getBuffer().length).toBe(caseData.length)
    })

    it('should not process the buffer properly', () => {
        expect(() => {
            textBuffer.process()
        }).toThrowError()
    })

    it('should have a comic and chapter idx', () => {
        expect(
            textBuffer.findByString(['comic', 'chapters'], true)
        ).not.toBeNull()
    })

    it('should have a non-error comic and chapter containing data line', () => {
        expect(() => {
            textBuffer.resolveIndexWithHex(
                textBuffer.findByString(['comic', 'chapters'], true) as string
            )
        }).not.toThrowError()
    })

    it('should have a proper populated comic and chapter containing data line', () => {
        // console.log(`${JSON.stringify(textBuffer.bufferArrayAsHex())}`)
        const hexIdx = textBuffer.findByString(
            ['comic', 'chapters'],
            true
        ) as string
        const comicChapterData = textBuffer.resolveIndexWithHex(hexIdx, (inp) =>
            recurseParseJSON(inp)
        )

        // console.log(
        //     `Shortened summary of ${casenumstr}: ${comicChapterData[3]?.comic?.summary.slice(
        //         0,
        //         15
        //     )}`
        // )
        console.log(`Summary: ${comicChapterData[3]?.comic?.summary}`)
        expect(comicChapterData[3]?.comic?.id).toBe(expected)
        expect(comicChapterData[3]?.comic?.summary).not.toStartWith('T')
        expect(comicChapterData[3]?.comic?.summary).not.toEndWith('{')
    })
})
