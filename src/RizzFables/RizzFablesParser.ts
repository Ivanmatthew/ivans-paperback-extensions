
import {
    Chapter,
    ChapterDetails,
    PartialSourceManga,
    SourceManga,
    Tag,
    TagSection
} from '@paperback/types'

import { convertDate } from './components/LanguageUtils'

import { HomeSectionData } from './components/Types'

import entities = require('entities')

import * as cheerio from 'cheerio'
import { cleanId, extractVariableValues, trimUrl } from './components/Helper'
import { Configuration as Source } from './components/Configuration'
import { RizzFables } from './RizzFables'

const source = Source
export class MangaStreamParser {
    parseMangaDetails($: cheerio.CheerioAPI, mangaTitle: string): SourceManga {
        const titles: string[] = []
        titles.push(entities.decodeHTML($('h1.entry-title').text().trim()))

        const altTitles = $(`span:contains(${source.manga_selector_AlternativeTitles}), b:contains(${source.manga_selector_AlternativeTitles})+span, .imptdt:contains(${source.manga_selector_AlternativeTitles}) i, h1.entry-title+span`).contents().remove().last().text().split(',') // Language dependant
        for (const title of altTitles) {
            if (title == '') {
                continue
            }
            titles.push(entities.decodeHTML(title.trim()))
        }

        const author = $(`span:contains(${source.manga_selector_author}), .fmed b:contains(${source.manga_selector_author})+span, .imptdt:contains(${source.manga_selector_author}) i, .tsinfo > div:nth-child(4) > i`).contents().remove().last().text().trim() // Language dependant
        const artist = $(`span:contains(${source.manga_selector_artist}), .fmed b:contains(${source.manga_selector_artist})+span, .imptdt:contains(${source.manga_selector_artist}) i, .tsinfo > div:nth-child(5) > i`).contents().remove().last().text().trim() // Language dependant
        const image = this.getImageSrc($('img', 'div[itemprop="image"]'))

        // TODO: Simplify this by concatenating the description out of the html, not the script tag
        const scriptSelection = $('div[itemprop="description"] script')
        if (!scriptSelection) {
            throw new Error(`Could not find description script when getting manga details for title: ${mangaTitle}`)
        }
        const selectedScript = scriptSelection.get()
        if (selectedScript.length == 0) {
            throw new Error(`Could not parse out description script when getting manga details for title: ${mangaTitle}`)
        }
        // @ts-expect-error - This is a valid check, as the selectedScript will always exist.
        const descriptionScriptContent = selectedScript[0].children[0].data
        const description = extractVariableValues(descriptionScriptContent)?.description ?? 'N/A'

        // RealmScans uses markdown to create their descriptions, the following code is meant to disassemble the markdown and create a clean description
        const cleanedDescription = description
            // remove first character of string (it'll be matched as "content")
            .slice(1, -1)
            .replace(/\\r/g, '')
            .replace(/> /g, '')
            .replace(/\\n/g, '\n')
            .replace(/\\u[\dA - F]{ 4} /gi, match => String.fromCharCode(parseInt(match.slice(2), 16)))

        const arrayTags: Tag[] = []
        for (const tag of $('a', source.manga_tag_selector_box).toArray()) {
            const label = $(tag).text().trim()
            const id = trimUrl($(tag).attr('href') ?? '')
            if (!id || !label) {
                continue
            }
            arrayTags.push({ id, label })
        }

        const rawStatus = $(`span:contains(${source.manga_selector_status}), .fmed b:contains(${source.manga_selector_status})+span, .imptdt:contains(${source.manga_selector_status}) i`).contents().remove().last().text().trim()
        let status
        switch (rawStatus.toLowerCase()) {
            case source.manga_StatusTypes.ONGOING.toLowerCase():
                status = 'Ongoing'
                break
            case source.manga_StatusTypes.COMPLETED.toLowerCase():
                status = 'Completed'
                break
            default:
                status = 'Ongoing'
                break
        }

        const tagSections: TagSection[] = [
            App.createTagSection({
                id: '0',
                label: 'genres',
                tags: arrayTags.map((x) => App.createTag(x))
            })
        ]

        return App.createSourceManga({
            id: mangaTitle,
            mangaInfo: App.createMangaInfo({
                titles,
                image: image,
                status,
                author: author == '' ? 'Unknown' : author,
                artist: artist == '' ? 'Unknown' : artist,
                tags: tagSections,
                desc: cleanedDescription
            })
        })
    }

    parseChapterList($: cheerio.CheerioAPI, mangaTitle: string): Chapter[] {
        const chapters: Chapter[] = []
        let sortingIndex = 0
        let language = source.language

        for (const chapter of $('li', 'div#chapterlist').toArray()) {
            const title = $('span.chapternum', chapter).text().trim()
            const date = convertDate($('span.chapterdate', chapter).text().trim())
            const id = chapter.attribs['data-num'] ?? '' // Set data-num attribute as id
            const chapterNumberRegex = id.match(/(\d+\.?\d?)+/)
            let chapterNumber = 0
            if (chapterNumberRegex && chapterNumberRegex[1]) {
                chapterNumber = Number(chapterNumberRegex[1])
            }

            if (!id || typeof id === 'undefined') {
                throw new Error(`Could not parse out ID when getting chapters for title :${mangaTitle}`)
            }

            chapters.push({
                id: id, // Store chapterNumber as id
                langCode: language,
                chapNum: chapterNumber,
                name: title,
                time: date,
                sortingIndex,
                volume: 0,
                group: ''
            })
            sortingIndex--
        }

        // If there are no chapters, throw error to avoid losing progress
        if (chapters.length == 0) {
            throw new Error(`Couldn't find any chapters for title: ${mangaTitle}!`)
        }

        return chapters.map((chapter) => {
            chapter.sortingIndex += chapters.length
            return App.createChapter(chapter)
        })
    }

    parseChapterDetails($: cheerio.CheerioAPI, mangaTitle: string, chapterId: string): ChapterDetails {
        const pages: string[] = []

        $('#readerarea > img').toArray().forEach(page => {
            const selectorPage = $(page)
            pages.push(selectorPage.attr('src') ?? selectorPage.attr('data-cfsrc') ?? selectorPage.attr('data-src') ?? '')
        })

        return App.createChapterDetails({
            id: chapterId,
            mangaId: mangaTitle,
            pages: pages
        })
    }

    parseTags($: cheerio.CheerioAPI): TagSection[] {
        const tagSections: TagSection[] = [
            { id: '0', label: 'genres', tags: [] },
            { id: '1', label: 'status', tags: [] },
            { id: '2', label: 'type', tags: [] },
            { id: '3', label: 'order', tags: [] }
        ]

        const sectionDropDowns = $('ul.dropdown-menu.c4.genrez, ul.dropdown-menu.c1').toArray()
        for (let i = 0; i < tagSections.length; ++i) {
            const sectionDropdown = sectionDropDowns[i]
            if (!sectionDropdown) {
                continue
            }

            for (const tag of $('li', sectionDropdown).toArray()) {
                const label = $('label', tag).text().trim()
                const id = `${tagSections[i]?.label}:${$('input', tag).attr('value')}`

                if (!id || !label) {
                    continue
                }

                tagSections[i]?.tags.push(App.createTag({ id, label }))
            }
        }

        return tagSections.map((x) => App.createTagSection(x))
    }

    async parseViewMore($: cheerio.CheerioAPI, sourceInstance: RizzFables): Promise<PartialSourceManga[]> {
        const items: PartialSourceManga[] = []

        for (const manga of $('div.bs', 'div.listupd').toArray()) {
            const title = $('a', manga).attr('title')
            const image = this.getImageSrc($('img', manga))
            const subtitle = $('div.epxs', manga).text().trim()

            const mangaId: string = cleanId($('a', manga).attr('href') ?? '')

            if (!mangaId || !title) {
                console.log(`Failed to parse homepage sections for ${source.baseUrl}`)
                continue
            }

            items.push(App.createPartialSourceManga({
                mangaId,
                image: image,
                title: entities.decodeHTML(title),
                subtitle: entities.decodeHTML(subtitle)
            }))
        }

        return items
    }

    async parseHomeSection($: cheerio.CheerioAPI, section: HomeSectionData, sourceInstance: RizzFables): Promise<PartialSourceManga[]> {
        const items: PartialSourceManga[] = []

        const mangas = section.selectorFunc($)
        if (!mangas.length || !section.titleSelectorFunc) {
            console.log(`Unable to parse valid ${section.section.title} section!`)
            return items
        }

        for (const manga of mangas.toArray()) {
            const title = section.titleSelectorFunc($, manga)

            const image = this.getImageSrc($('img', manga)) ?? ''
            const subtitle = section.subtitleSelectorFunc($, manga) ?? ''

            const mangaId: string = cleanId($('a', manga).attr('href') ?? '')
            if (mangaId === '' || !title) {
                console.log(`Failed to parse homepage sections for ${source.baseUrl} title (${title}) mangaId (${mangaId})`)
                continue
            }

            items.push(App.createPartialSourceManga({
                mangaId,
                image: image,
                title: entities.decodeHTML(title),
                subtitle: entities.decodeHTML(subtitle)
            }))
        }

        return items
    }

    isLastPage = ($: cheerio.CheerioAPI, id: string): boolean => {
        let isLast = true
        if (id == 'view_more') {
            const hasNext = Boolean($('a.r')[0])
            if (hasNext) {
                isLast = false
            }
        }

        if (id == 'search_request') {
            const hasNext = Boolean($('a.next.page-numbers')[0])
            if (hasNext) {
                isLast = false
            }
        }

        return isLast
    }

    getImageSrc(imageObj: cheerio.Cheerio<cheerio.Element> | undefined): string {
        let image: string | undefined
        if ((typeof imageObj?.attr('data-src')) != 'undefined') {
            image = imageObj?.attr('data-src')
        }
        else if ((typeof imageObj?.attr('data-lazy-src')) != 'undefined') {
            image = imageObj?.attr('data-lazy-src')
        }
        else if ((typeof imageObj?.attr('srcset')) != 'undefined') {
            image = imageObj?.attr('srcset')?.split(' ')[0] ?? ''
        }
        else if ((typeof imageObj?.attr('src')) != 'undefined') {
            image = imageObj?.attr('src')
        }
        else if ((typeof imageObj?.attr('data-cfsrc')) != 'undefined') {
            image = imageObj?.attr('data-cfsrc')
        } else {
            image = ''
        }

        image = image?.split('?resize')[0] ?? ''

        if (!image?.startsWith('http')) {
            if (!source.baseUrl) {
                throw new Error(`Unable to parse image source, image src does not have full address, and base url is not supplied!\nImage url: ${image}`)
            }

            image = `${source.baseUrl}${image}` // in this form, it is expected the baseUrl has NO trailing slash, and the image DOES have a leading slash
        } else {
            image = image.replace(/^\/\//, 'https://')
            image = image.replace(/^\//, 'https:/')
        }

        return encodeURI(decodeURI(entities.decodeHTML(image?.trim() ?? '')))
    }
}