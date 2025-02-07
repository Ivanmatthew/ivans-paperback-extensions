import {
    ChapterProviding,
    HomePageSectionsProviding,
    HomeSection,
    MangaProviding,
    SearchResultsProviding,
    Tag
} from '@paperback/types'

import * as cheerio from 'cheerio'

export interface Source
    extends ChapterProviding,
        HomePageSectionsProviding,
        MangaProviding,
        SearchResultsProviding {}

export interface Months {
    january: string
    february: string
    march: string
    april: string
    may: string
    june: string
    july: string
    august: string
    september: string
    october: string
    november: string
    december: string
}

export interface StatusTypes {
    ONGOING: string
    COMPLETED: string
}

export interface Slug {
    path: string | undefined
    slug: string | undefined
}

export interface Metadata {
    page: number | null
}

export interface TagSection {
    id: string
    label: string
    tags: Tag[]
}

// From search API
export interface ComicResult {
    id: string
    title: string
    image_url: string
    rating: string
    description: string
    upload_date: null | string
    update_date: string
    genre_id: string
    status: string
    type: string
    released: string
    serialization: string
    posted_by: null | string
    long_description: string
    artist: string
    author: string
    cover_img: string
    views: string
    chapter_title: null | string
    chapter_time: null | string
}
// From homepage API
export interface ChapterObject {
    id: string
    manga_id: string
    chapter_title: string
    chapter_time: string
}
export interface SeriesObject {
    id: string
    title: string
    image_url: string
    status: string
    chapters: ChapterObject[]
}

export interface HomeSectionData {
    selectorFunc: ($: cheerio.CheerioAPI) => cheerio.Cheerio<cheerio.Element>
    titleSelectorFunc?: (
        $: cheerio.CheerioAPI,
        element: cheerio.Element
    ) => string | undefined
    subtitleSelectorFunc: (
        $: cheerio.CheerioAPI,
        element: cheerio.Element
    ) => string
    getViewMoreItemsFunc: (page: number) => string
    section: HomeSection
    enabled: boolean
    sortIndex: number
}
export const DefaultHomeSectionData = {
    titleSelectorFunc: ($: cheerio.CheerioAPI, element: cheerio.Element) =>
        $('h2', element).text().trim(),
    subtitleSelectorFunc: ($: cheerio.CheerioAPI, element: cheerio.Element) =>
        $('span a', element)
            .toArray()
            .map((x) => $(x).text().trim())
            .join(', '),
    getViewMoreItemsFunc: () => '',
    enabled: true
}
export interface AltHomeSectionHandler {
    getFunc: () => Promise<SeriesObject[]>
    getMoreFunc: (offset: number) => Promise<{
        series: SeriesObject[]
        hasMore: boolean
    }>
    section: HomeSection
    enabled: boolean
    sortIndex: number
}
