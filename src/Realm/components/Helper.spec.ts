import { generateLink, extractLink } from './Helper'
import { Configuration } from './Configuration'
import { describe, it, expect, beforeAll } from 'bun:test'
import * as cheerio from 'cheerio'

const url = 'https://realmoasis.com'

describe('extractLink', () => {
    let listOfSeriesUrls: string[] = []
    let listOfChapterUrls: string[] = []
    let responsePrefixSlug: string = ''

    beforeAll(async () => {
        const initialResponse = await Bun.fetch(url, {
            method: 'GET',
            redirect: 'follow'
        })
        const dom = cheerio.load(await initialResponse.text(), {
            xml: {
                xmlMode: false
            }
        })
        dom('#content script').each((i, elem) => {
            const text = dom(elem).text()
            if (text.includes('var base = "')) {
                const prefixSlugRegex = /var base = \"\/(.*)\/\"/
                const match = text.match(prefixSlugRegex)
                if (match) {
                    responsePrefixSlug = match[1] ?? ''
                }
            }
        })
        dom('.listupd a[href]:not([href=""])').each((i, elem) => {
            const href = dom(elem).attr('href')
            if (href && href.includes(url + '/' + responsePrefixSlug)) {
                listOfSeriesUrls.push(href.replace(url, '').trim())
            }
        })
        const randomSeriesUrl =
            listOfSeriesUrls[
                Math.floor(Math.random() * listOfSeriesUrls.length)
            ]
        const seriesResponse = await Bun.fetch(url + randomSeriesUrl, {
            method: 'GET'
        })
        const chapterdom = cheerio.load(await seriesResponse.text(), {
            xml: {
                xmlMode: false
            }
        })
        chapterdom('#chapterlist a[href]:not([href=""])').each((i, elem) => {
            const href = chapterdom(elem).attr('href')
            if (href && href.includes('/' + responsePrefixSlug)) {
                listOfChapterUrls.push(href.replace(url, '').trim())
            }
        })
    })

    it('should have an equal prefixSlug as is internally recorded', () => {
        expect(responsePrefixSlug).toBe(Configuration.prefixSlug)
    })

    it('should extract contentType and seriesId from a series link', () => {
        expect(listOfSeriesUrls.length).toBeGreaterThan(0)

        for (const link of listOfSeriesUrls) {
            const { contentType, seriesId, chapterId } = extractLink(link)

            expect(contentType.length).toBe(1)
            expect(seriesId.length).toBe(5)
            expect(chapterId.length).toBe(6)
            expect(chapterId).not.toMatch(/^\d+$/)
            expect(contentType).toMatch(/s|c/)
        }
    })

    it('should extract contentType, seriesId and chapterId from a chapter link', () => {
        expect(listOfChapterUrls.length).toBeGreaterThan(0)

        for (const link of listOfChapterUrls) {
            const { contentType, seriesId, chapterId } = extractLink(link)

            expect(contentType.length).toBe(1)
            expect(seriesId.length).toBe(5)
            expect(chapterId.length).toBe(6)
            expect(chapterId).toMatch(/^\d+$/)
            expect(contentType).toMatch(/s|c/)
        }
    })
})
