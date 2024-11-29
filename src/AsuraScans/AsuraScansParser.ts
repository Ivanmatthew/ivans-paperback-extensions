import {
    Chapter,
    ChapterDetails,
    SourceManga,
    PartialSourceManga,
    TagSection,
    Tag,
    HomeSectionType,
    HomeSection
} from '@paperback/types'

import { decode as decodeHTMLEntity } from 'html-entities'
import { CheerioAPI } from 'cheerio'

import { getFilter, getMangaId } from './AsuraScansUtils'

import { Filters } from './interface/Filters'
import { RSCDataProcessor } from './RSCDataProcessor'
import { recurseParseJSON } from './AsuraScansHelper'

import * as cheerio from 'cheerio'

export const parseNextJSData = ($: CheerioAPI): RSCDataProcessor => {
    const scriptsWithData = $('script')
        .toArray()
        .filter((script) => {
            const scriptContent = $(script).html()
            return scriptContent?.includes('self.__next_f.push')
        })

    if (scriptsWithData.length === 0) {
        throw new Error('Could not find script with data')
    }

    const rscDataProcessor: RSCDataProcessor = new RSCDataProcessor()

    for (const scriptWithData of scriptsWithData) {
        const self = {
            __next_f: []
        }
        const scriptContent = $(scriptWithData).text()
        if (!scriptContent) continue
        eval(scriptContent)

        self.__next_f.forEach((val: [number, undefined | null | string]) => {
            if (val[0] === 1) {
                rscDataProcessor.append(val[1] as unknown as string)
            }
        })
    }

    rscDataProcessor.process()

    return rscDataProcessor
}

export const parseMangaDetails = async (
    source: any,
    $: CheerioAPI,
    mangaId: string
): Promise<SourceManga> => {
    const textBufferRepr = parseNextJSData($)

    const rawMangaDetailsObjectIdx = textBufferRepr.findByString(
        ['comic', 'chapters'],
        true
    )

    if (!rawMangaDetailsObjectIdx) {
        throw new Error(`Couldn't find manga details for mangaId: ${mangaId}!`)
    }

    const rawMangaDetailsObject = textBufferRepr.resolveIndexWithHex(
        rawMangaDetailsObjectIdx,
        (inp) => recurseParseJSON(inp)
    )
    const mangaDetailsObject = rawMangaDetailsObject[3].comic

    const title = mangaDetailsObject.name ?? ''
    const image = mangaDetailsObject.cover ?? ''
    const uncleanDescription = cheerio.load(
        mangaDetailsObject.summary ?? '',
        null,
        false
    )
    let description = uncleanDescription('div').text().trim() ?? ''
    if (description === '') {
        description = uncleanDescription.text().trim() ?? ''
    }

    const author = mangaDetailsObject.author ?? ''
    const artist = mangaDetailsObject.artist ?? ''

    const arrayTags: Tag[] = []
    for (const tag of mangaDetailsObject.genres ?? []) {
        const label = tag.name
        const filterName = label.toLocaleUpperCase()

        // const id = tag.id // TODO: Transfer to new ID system (Maybe?)
        const id = await getFilter(source, filterName)

        if (!id || !label) continue
        arrayTags.push({ id: `genres:${id}`, label: label })
    }
    const tagSections: TagSection[] = [
        App.createTagSection({
            id: '0',
            label: 'genres',
            tags: arrayTags.map((x) => App.createTag(x))
        })
    ]

    const status = mangaDetailsObject.status?.name ?? ''

    return App.createSourceManga({
        id: mangaId,
        mangaInfo: App.createMangaInfo({
            titles: [decodeHTMLEntity(title)],
            image: image,
            status: status,
            author: decodeHTMLEntity(author),
            artist: decodeHTMLEntity(artist),
            tags: tagSections,
            desc: decodeHTMLEntity(description)
        })
    })
}

export const parseChapters = ($: CheerioAPI, mangaId: string): Chapter[] => {
    const textBufferRepr = parseNextJSData($)

    const rawMangaChaptersObjectIdx = textBufferRepr.findByString(
        ['comic', 'chapters'],
        true
    )
    if (!rawMangaChaptersObjectIdx) {
        throw new Error(`Couldn't find chapters for mangaId: ${mangaId}!`)
    }

    const rawMangaChaptersObject = textBufferRepr.resolveIndexWithHex(
        rawMangaChaptersObjectIdx,
        (inp) => recurseParseJSON(inp)
    )

    const chapters: Chapter[] = []
    let sortingIndex = 0

    for (const chapter of rawMangaChaptersObject[3].chapters) {
        const id = String(chapter.name) // TODO: This is not the actual chapter ID, but rather the chapter name (e.g. "Chapter 1"). This was from the previous implementation, so I'm keeping it as is for now for backwards compatibility.

        if (!id || isNaN(Number(id))) continue

        // const rawDate = $('h3', chapter).last().text().trim() ?? ''
        // const date = new Date(rawDate.replace(/\b(\d+)(st|nd|rd|th)\b/g, '$1'))
        const date = new Date(chapter.published_at)

        chapters.push({
            id: id,
            name: `Chapter ${id}`,
            langCode: '🇬🇧',
            chapNum: Number(id),
            volume: 0,
            time: date,
            sortingIndex,
            group: ''
        })
        sortingIndex--
    }

    if (chapters.length == 0) {
        throw new Error(`Couldn't find any chapters for mangaId: ${mangaId}!`)
    }

    return chapters.map((chapter) => {
        chapter.sortingIndex = chapters.indexOf(chapter)
        return App.createChapter(chapter)
    })
}

export const parseChapterDetails = async (
    $: CheerioAPI,
    mangaId: string,
    chapterId: string
): Promise<ChapterDetails> => {
    const textBufferRepr = parseNextJSData($)

    let toParse: any[] = []
    const rawPagesObjectIdx = textBufferRepr.findByString(
        ['initialChapter', 'pages'],
        true
    )

    if (!rawPagesObjectIdx) {
        throw new Error(`Couldn't find pages for chapterId: ${chapterId}!`)
    }

    const stableRawPagesObject = textBufferRepr.resolveIndexWithHex(
        rawPagesObjectIdx,
        (inp) => recurseParseJSON(inp)
    )
    let rawPagesObject
    try {
        rawPagesObject =
            stableRawPagesObject[3].children[9][3].children[3].initialChapter
                .pages
    } catch (e) {
        throw new Error('Could not find page images for chapter ' + e)
    }
    if (Array.isArray(rawPagesObject) === false) {
        toParse = rawPagesObject.pages
    } else {
        toParse = rawPagesObject
    }

    const pages: string[] = []
    toParse.forEach((page: { order: number; url: string }) => {
        pages.push(page.url)
    })

    const chapterDetails = App.createChapterDetails({
        id: chapterId,
        mangaId: mangaId,
        pages: pages
    })

    return chapterDetails
}

export const parseHomeSections = async (
    source: any,
    $: CheerioAPI,
    sectionCallback: (section: HomeSection) => void
): Promise<void> => {
    const featuedSection = App.createHomeSection({
        id: 'featured',
        title: 'Featured',
        containsMoreItems: false,
        type: HomeSectionType.singleRowLarge
    })

    const updateSection = App.createHomeSection({
        id: 'latest_updates',
        title: 'Latest Updates',
        containsMoreItems: true,
        type: HomeSectionType.singleRowNormal
    })

    const popularSection = App.createHomeSection({
        id: 'popular_today',
        title: 'Popular Today',
        containsMoreItems: false,
        type: HomeSectionType.singleRowNormal
    })

    // Featured
    const featuredSection_Array: PartialSourceManga[] = []
    for (const manga of $('li.slide', 'ul.slider.animated').toArray()) {
        const slug =
            $('a', manga).attr('href')?.replace(/\/$/, '')?.split('/').pop() ??
            ''
        if (!slug) continue

        const id = await getMangaId(source, slug)

        // Fix ID later, remove hash
        const image: string = $('img', manga).first().attr('src') ?? ''
        const title: string = $('a', manga).first().text().trim() ?? ''

        if (!id || !title) continue
        featuredSection_Array.push(
            App.createPartialSourceManga({
                image: image,
                title: decodeHTMLEntity(title),
                mangaId: id
            })
        )
    }
    featuedSection.items = featuredSection_Array
    sectionCallback(featuedSection)

    // Latest Updates
    const updateSection_Array: PartialSourceManga[] = []
    for (const manga of $('div.w-full', 'div.grid.grid-rows-1').toArray()) {
        const slug =
            $('a', manga).attr('href')?.replace(/\/$/, '')?.split('/').pop() ??
            ''
        if (!slug) continue

        const id = await getMangaId(source, slug)

        const image: string = $('img', manga).first().attr('src') ?? ''
        const title: string =
            $('.col-span-9 > .font-medium > a', manga).first().text().trim() ??
            ''
        const subtitle: string =
            $('.flex.flex-col .flex-row a', manga).first().text().trim() ?? ''

        if (!id || !title) continue
        updateSection_Array.push(
            App.createPartialSourceManga({
                image: image,
                title: decodeHTMLEntity(title),
                mangaId: id,
                subtitle: decodeHTMLEntity(subtitle)
            })
        )
    }
    updateSection.items = updateSection_Array
    sectionCallback(updateSection)

    // Popular Today
    const popularSection_Array: PartialSourceManga[] = []
    for (const manga of $('a', 'div.flex-wrap.hidden').toArray()) {
        const slug =
            $(manga).attr('href')?.replace(/\/$/, '')?.split('/').pop() ?? ''
        if (!slug) continue

        const id = await getMangaId(source, slug)

        const image: string = $('img', manga).first().attr('src') ?? ''
        const title: string =
            $('span.block.font-bold', manga).first().text().trim() ?? ''
        const subtitle: string =
            $('span.block.font-bold', manga).first().next().text().trim() ?? ''

        if (!id || !title) continue
        popularSection_Array.push(
            App.createPartialSourceManga({
                image: image,
                title: decodeHTMLEntity(title),
                mangaId: id,
                subtitle: decodeHTMLEntity(subtitle)
            })
        )
    }
    popularSection.items = popularSection_Array
    sectionCallback(popularSection)
}

export const parseViewMore = async (
    source: any,
    $: CheerioAPI
): Promise<PartialSourceManga[]> => {
    const manga: PartialSourceManga[] = []
    const collectedIds: string[] = []

    for (const item of $('a', 'div.grid.grid-cols-2').toArray()) {
        const slug =
            $(item).attr('href')?.replace(/\/$/, '')?.split('/').pop() ?? ''
        if (!slug) continue

        const id = await getMangaId(source, slug)

        const image: string = $('img', item).first().attr('src') ?? ''
        const title: string =
            $('span.block.font-bold', item).first().text().trim() ?? ''
        const subtitle: string =
            $('span.block.font-bold', item).first().next().text().trim() ?? ''

        if (!id || !title || collectedIds.includes(id)) continue
        manga.push(
            App.createPartialSourceManga({
                image: image,
                title: decodeHTMLEntity(title),
                mangaId: id,
                subtitle: decodeHTMLEntity(subtitle)
            })
        )
        collectedIds.push(id)
    }
    return manga
}

export const parseTags = (filters: Filters): TagSection[] => {
    const createTags = (filterItems: any, prefix: string): Tag[] => {
        return filterItems.map((item: { id: any; value: any; name: any }) => ({
            id: `${prefix}:${item.id ?? item.value}`,
            label: item.name
        }))
    }

    const tagSections: TagSection[] = [
        // Tag section for genres
        App.createTagSection({
            id: '0',
            label: 'genres',
            tags: createTags(filters.genres, 'genres').map((x) =>
                App.createTag(x)
            )
        }),
        // Tag section for status
        App.createTagSection({
            id: '1',
            label: 'status',
            tags: createTags(filters.statuses, 'status').map((x) =>
                App.createTag(x)
            )
        }),
        // Tag section for types
        App.createTagSection({
            id: '2',
            label: 'type',
            tags: createTags(filters.types, 'type').map((x) => App.createTag(x))
        }),
        // Tag section for order
        App.createTagSection({
            id: '3',
            label: 'order',
            tags: createTags(
                filters.order.map((order) => ({
                    id: order.value,
                    name: order.name
                })),
                'order'
            ).map((x) => App.createTag(x))
        })
    ]
    return tagSections
}

export const parseSearch = async (
    source: any,
    $: CheerioAPI
): Promise<PartialSourceManga[]> => {
    const collectedIds: string[] = []
    const itemArray: PartialSourceManga[] = []

    for (const item of $('a', 'div.grid.grid-cols-2').toArray()) {
        const slug =
            $(item).attr('href')?.replace(/\/$/, '')?.split('/').pop() ?? ''
        if (!slug) continue

        const id = await getMangaId(source, slug)

        const image: string = $('img', item).first().attr('src') ?? ''
        const title: string =
            $('span.block.font-bold', item).first().text().trim() ?? ''
        const subtitle: string =
            $('span.block.font-bold', item).first().next().text().trim() ?? ''

        itemArray.push(
            App.createPartialSourceManga({
                image: image,
                title: decodeHTMLEntity(title),
                mangaId: id,
                subtitle: subtitle
            })
        )

        collectedIds.push(id)
    }

    return itemArray
}

export const isLastPage = ($: CheerioAPI): boolean => {
    let isLast = true
    const hasItems = $('a', 'div.grid.grid-cols-2').toArray().length > 0

    if (hasItems) isLast = false
    return isLast
}
