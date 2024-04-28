
import {
    Chapter,
    ChapterDetails,
    ContentRating,
    HomeSection,
    HomeSectionType,
    PagedResults,
    PartialSourceManga,
    Request,
    RequestManager,
    Response,
    SearchRequest,
    SourceInfo,
    SourceIntents,
    SourceManga,
    TagSection
} from '@paperback/types'

import { MangaStreamParser } from './RizzFablesParser'
import { URLBuilder } from '../UrlBuilder'

import * as cheerio from 'cheerio'

import { getSourceRequestManager } from './components/SourceRequestManager'
import { Configuration as SourceConfiguration } from './components/Configuration'
import {
    Source,
    Metadata,
    Slug,
    ComicResult,
    HomeSectionData,
    DefaultHomeSectionData
} from './components/Types'
import {
    createHomeSection,
    getFilterTagsBySection,
    getIncludedTagBySection,
    getSlugFromTitle
} from './components/Helper'

export const RizzFablesInfo: SourceInfo = {
    version: '2.0.0',
    name: 'RizzFables',
    description: 'Extension that pulls manga from RizzFables',
    author: 'IvanMatthew',
    authorWebsite: 'http://github.com/Ivanmatthew',
    icon: 'icon.png',
    contentRating: ContentRating.MATURE,
    websiteBaseURL: SourceConfiguration.baseUrl, // CHANGEIT
    intents: SourceIntents.MANGA_CHAPTERS | SourceIntents.HOMEPAGE_SECTIONS | SourceIntents.CLOUDFLARE_BYPASS_REQUIRED | SourceIntents.SETTINGS_UI,
    sourceTags: []
}

export class RizzFables extends SourceConfiguration implements Source {
    requestManager: RequestManager

    constructor() {
        super()
        this.requestManager = getSourceRequestManager(RizzFables.baseUrl)

        this.configureSections()
    }

    // ----HOMESCREEN SELECTORS----
    /**
     * Enable or disable the "Popular Today" section on the homescreen
     * Some sites don't have this section on this homescreen, if they don't disable this.
     * Enabled Default = true
     * Selector Default = "h2:contains(Popular Today)"
     */

    configureSections(): void { return }

    homescreen_sections: Record<'popular_today' | 'latest_update' | 'top_alltime' | 'top_monthly' | 'top_weekly', HomeSectionData> = {
        'popular_today': {
            ...DefaultHomeSectionData,
            section: createHomeSection('popular_today', 'Popular Today', false, HomeSectionType.featured),
            selectorFunc: ($: cheerio.CheerioAPI) => $('div.bsx', $('h2:contains(Popular Today)')?.parent()?.next()),
            titleSelectorFunc: ($: cheerio.CheerioAPI, element: cheerio.Element) => $('a', element).attr('title'),
            subtitleSelectorFunc: ($: cheerio.CheerioAPI, element: cheerio.Element) => $('div.epxs', element).text().trim(),
            getViewMoreItemsFunc: (page: string) => `${RizzFables.directoryPath}/?page=${page}&order=popular`,
            sortIndex: 10
        },
        'latest_update': {
            ...DefaultHomeSectionData,
            section: createHomeSection('latest_update', 'Latest Updates'),
            selectorFunc: ($: cheerio.CheerioAPI) => $('div.uta', $('h2:contains(Latest Update)')?.parent()?.next()),
            titleSelectorFunc: ($: cheerio.CheerioAPI, element: cheerio.Element) => $('a', element).attr('title'),
            subtitleSelectorFunc: ($: cheerio.CheerioAPI, element: cheerio.Element) => $('li > a, div.epxs', $('div.luf, div.bigor', element)).first().text().trim(),
            getViewMoreItemsFunc: (page: string) => `${RizzFables.directoryPath}/?page=${page}&order=update`,
            sortIndex: 20
        },
        'top_alltime': {
            ...DefaultHomeSectionData,
            section: createHomeSection('top_alltime', 'Top All Time', false),
            selectorFunc: ($: cheerio.CheerioAPI) => $('li', $('div.serieslist.pop.wpop.wpop-alltime')),
            subtitleSelectorFunc: ($: cheerio.CheerioAPI, element: cheerio.Element) => $('span a', element).toArray().map(x => $(x).text().trim()).join(', '),
            sortIndex: 40
        },
        'top_monthly': {
            ...DefaultHomeSectionData,
            section: createHomeSection('top_monthly', 'Top Monthly', false),
            selectorFunc: ($: cheerio.CheerioAPI) => $('li', $('div.serieslist.pop.wpop.wpop-monthly')),
            subtitleSelectorFunc: ($: cheerio.CheerioAPI, element: cheerio.Element) => $('span a', element).toArray().map(x => $(x).text().trim()).join(', '),
            sortIndex: 50
        },
        'top_weekly': {
            ...DefaultHomeSectionData,
            section: createHomeSection('top_weekly', 'Top Weekly', false),
            selectorFunc: ($: cheerio.CheerioAPI) => $('li', $('div.serieslist.pop.wpop.wpop-weekly')),
            subtitleSelectorFunc: ($: cheerio.CheerioAPI, element: cheerio.Element) => $('span a', element).toArray().map(x => $(x).text().trim()).join(', '),
            sortIndex: 60
        }
    }

    stateManager = App.createSourceStateManager()
    parser = new MangaStreamParser()

    getMangaShareUrl(mangaId: string): string {
        return `${RizzFables.baseUrl}/${RizzFables.directoryPath}/${mangaId}/`
    }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        const request = App.createRequest({
            url: `${RizzFables.baseUrl}/${RizzFables.directoryPath}/${mangaId}/`,
            method: 'GET'
        })

        const response = await this.requestManager.schedule(request, 1)
        this.checkResponseError(response)
        const $ = cheerio.load(response.data as string)

        return this.parser.parseMangaDetails($, mangaId)
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const request = App.createRequest({
            url: `${RizzFables.baseUrl}/${RizzFables.directoryPath}/${mangaId}/`,
            method: 'GET'
        })

        const response = await this.requestManager.schedule(request, 1)
        this.checkResponseError(response)
        const $ = cheerio.load(response.data as string)

        return this.parser.parseChapterList($, mangaId)
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        // Request the manga page
        const request = App.createRequest({
            url: `${RizzFables.baseUrl}/${RizzFables.directoryPath}/${mangaId}/`,
            method: 'GET'
        })

        const response = await this.requestManager.schedule(request, 1)
        this.checkResponseError(response)
        const $ = cheerio.load(response.data as string)

        const chapter = $('div#chapterlist').find('li[data-num="' + chapterId + '"]')
        if (!chapter) {
            throw new Error(`Unable to fetch a chapter for chapter numer: ${chapterId}`)
        }

        // Fetch the ID (URL) of the chapter
        const id = $('a', chapter).attr('href') ?? ''
        if (!id) {
            throw new Error(`Unable to fetch id for chapter numer: ${chapterId}`)
        }
        // Request the chapter page
        const _request = App.createRequest({
            url: id,
            method: 'GET'
        })

        const _response = await this.requestManager.schedule(_request, 1)
        this.checkResponseError(_response)
        const _$ = cheerio.load(_response.data as string)

        return this.parser.parseChapterDetails(_$, mangaId, chapterId)
    }

    async getSearchTags(): Promise<TagSection[]> {
        const request = App.createRequest({
            url: `${RizzFables.baseUrl}/${RizzFables.filterPath}/`,
            method: 'GET'
        })

        const response = await this.requestManager.schedule(request, 1)
        this.checkResponseError(response)
        const $ = cheerio.load(response.data as string)

        return this.parser.parseTags($)
    }

    // We do not use metadata because the search results are single page
    async getSearchResults(query: SearchRequest): Promise<PagedResults> {
        const request = await this.constructSearchRequest(1, query)
        const response = await this.requestManager.schedule(request, 1)
        this.checkResponseError(response)
        const searchResultData: ComicResult[] = JSON.parse(response.data as string)

        const results: PartialSourceManga[] = []
        for (const manga of searchResultData) {
            results.push(App.createPartialSourceManga({
                mangaId: getSlugFromTitle(manga.title),
                title: manga.title,
                image: `${RizzFables.baseUrl}/assets/images/${manga.image_url}`
            }))
        }

        // Results are single page, unpaged, therefore no metadata for next page is required
        return App.createPagedResults({
            results: results
        })
    }

    async constructSearchRequest(page: number, query: SearchRequest): Promise<Request> {
        let searchUrl: URLBuilder = new URLBuilder(RizzFables.baseUrl)
        const headers: Record<string, string> = {
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
        }
        const formData: Record<string, string> = {}

        if (query?.title) {
            searchUrl = searchUrl.addPathComponent(RizzFables.searchEndpoint)
            formData['search_value'] = query?.title.replace(/[’–][a-z]*/g, '') ?? ''
        } else {
            searchUrl = searchUrl.addPathComponent(RizzFables.filterEndpoint)

            const statusValue = getIncludedTagBySection('status', query?.includedTags)
            const typeValue = getIncludedTagBySection('type', query?.includedTags)
            const orderValue = getIncludedTagBySection('order', query?.includedTags)

            formData['genres_checked[]'] = getFilterTagsBySection('genres', query?.includedTags, true).join('&genre[]=')
            formData['StatusValue'] = statusValue !== '' ? statusValue : 'all'
            formData['TypeValue'] = typeValue !== '' ? typeValue : 'all'
            formData['OrderValue'] = orderValue !== '' ? orderValue : 'all'
        }

        return App.createRequest({
            url: searchUrl.build({ addTrailingSlash: true, includeUndefinedParameters: false }),
            headers: headers,
            data: Object.entries(formData).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&'),
            method: 'POST'
        })
    }

    async supportsTagExclusion(): Promise<boolean> {
        return false
    }

    async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        const request = App.createRequest({
            url: `${RizzFables.baseUrl}/`,
            method: 'GET'
        })

        const response = await this.requestManager.schedule(request, 1)
        this.checkResponseError(response)

        const $ = cheerio.load(response.data as string)

        const promises: Promise<void>[] = []
        const sectionValues = Object.values(this.homescreen_sections).sort((n1, n2) => n1.sortIndex - n2.sortIndex)
        for (const section of sectionValues) {
            if (!section.enabled) {
                continue
            }
            // Let the app load empty sections
            sectionCallback(section.section)
        }

        for (const section of sectionValues) {
            if (!section.enabled) {
                continue
            }

            // eslint-disable-next-line no-async-promise-executor
            promises.push(new Promise(async () => {
                section.section.items = await this.parser.parseHomeSection($, section, this)
                sectionCallback(section.section)
            }))
        }

        // Make sure the function completes
        await Promise.all(promises)
    }

    async getViewMoreItems(homepageSectionId: string, metadata: Metadata | undefined): Promise<PagedResults> {
        switch(homepageSectionId) {
            case 'latest_update': {
                const headers: Record<string, string> = {
                    'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
                }
                const formData: Record<string, string> = {
                    'StatusValue': 'all',
                    'TypeValue': 'all',
                    'OrderValue': 'update'
                }
        
                const request = App.createRequest({
                    url: `${RizzFables.baseUrl}/${RizzFables.filterEndpoint}`,
                    headers: headers,
                    data: Object.entries(formData).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&'),
                    method: 'POST'
                })
        
                const response = await this.requestManager.schedule(request, 1)
                const pageData: ComicResult[] = JSON.parse(response.data as string)
        
                const items: PartialSourceManga[] = []
        
                for (const manga of pageData) {
                    items.push(App.createPartialSourceManga({
                        mangaId: getSlugFromTitle(manga.title),
                        title: manga.title,
                        image: `${RizzFables.baseUrl}/assets/images/${manga.image_url}`
                    }))
                }
        
                return App.createPagedResults({
                    results: items
                })
            }
            default: {
                const page: number = metadata?.page ?? 1

                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const param = this.homescreen_sections[homepageSectionId].getViewMoreItemsFunc(page) ?? undefined
                if (!param) {
                    throw new Error(`Invalid homeSectionId | ${homepageSectionId}`)
                }

                const request = App.createRequest({
                    url: `${RizzFables.baseUrl}/${param}`,
                    method: 'GET'
                })

                const response = await this.requestManager.schedule(request, 1)
                const $ = cheerio.load(response.data as string)

                const items: PartialSourceManga[] = await this.parser.parseViewMore($, this)
                metadata = !this.parser.isLastPage($, 'view_more') ? { page: page + 1 } : undefined
                return App.createPagedResults({
                    results: items,
                    metadata
                })
            }
        }
    }

    // Utility

    async slugToPostId(slug: string, path: string): Promise<string> {
        if ((await this.stateManager.retrieve(slug)) == null) {
            const postId = await this.convertSlugToPostId(slug, path) ?? ''

            const existingMappedSlug = await this.stateManager.retrieve(postId)
            if (existingMappedSlug != null) {
                await this.stateManager.store(slug, undefined)
            }

            await this.stateManager.store(postId, slug)
            await this.stateManager.store(slug, postId)
        }

        const postId = await this.stateManager.retrieve(slug)
        if (!postId) {
            throw new Error(`Unable to fetch postId for slug:${slug}`)
        }

        return postId
    }

    async convertPostIdToSlug(postId: number): Promise<Slug> {
        const request = App.createRequest({
            url: `${RizzFables.baseUrl}/?p=${postId}`,
            method: 'GET'
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = cheerio.load(response.data as string)

        let parseSlug: string | string[]
        // Step 1: Try to get slug from og-url
        parseSlug = String($('meta[property="og:url"]').attr('content'))

        // Step 2: Try to get slug from canonical
        if (!parseSlug.includes(RizzFables.baseUrl)) {
            parseSlug = String($('link[rel="canonical"]').attr('href'))
        }

        if (!parseSlug || !parseSlug.includes(RizzFables.baseUrl)) {
            throw new Error('Unable to parse slug!')
        }

        parseSlug = parseSlug.replace(/\/$/, '').split('/')

        const slug = parseSlug.slice(-1).pop()
        const path = parseSlug.slice(-2).shift()

        return {
            path,
            slug
        }
    }

    async convertSlugToPostId(slug: string, path: string): Promise<string | undefined> {
        // Credit to the MadaraDex team :-D
        const headRequest = App.createRequest({
            url: `${RizzFables.baseUrl}/${path}/${slug}/`,
            method: 'HEAD'
        })
        const headResponse = await this.requestManager.schedule(headRequest, 1)
        this.checkResponseError(headResponse)

        let postId: string | number | undefined

        const postIdRegex = headResponse?.headers.Link?.match(/\?p=(\d+)/)
        if (postIdRegex?.[1]) {
            postId = postIdRegex[1]
        }

        if (postId || !isNaN(Number(postId))) {
            return postId?.toString()
        }

        const request = App.createRequest({
            url: `${RizzFables.baseUrl}/${path}/${slug}/`,
            method: 'GET'
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = cheerio.load(response.data as string)

        // Step 1: Try to get postId from shortlink
        postId = Number($('link[rel="shortlink"]')?.attr('href')?.split('/?p=')[1])

        // Step 2: If no number has been found, try to parse from data-id
        if (isNaN(postId)) {
            postId = Number($('div.bookmark').attr('data-id'))
        }

        // Step 3: If no number has been found, try to parse from manga script
        if (isNaN(postId)) {
            const page = $.root().html()
            const match = page?.match(/postID.*\D(\d+)/)
            if (match != null && match[1]) {
                postId = Number(match[1]?.trim())
            }
        }

        if (!postId || isNaN(postId)) {
            throw new Error(`Unable to fetch numeric postId for this item! (path:${path} slug:${slug})`)
        }

        return postId.toString()
    }

    async getCloudflareBypassRequestAsync(): Promise<Request> {
        this.requestManager?.cookieStore?.getAllCookies().forEach(x => { this.requestManager?.cookieStore?.removeCookie(x) })
        
        return App.createRequest({
            url: `${RizzFables.bypassPage || RizzFables.baseUrl}/`,
            method: 'GET',
            headers: {
                'referer': `${RizzFables.baseUrl}/`,
                'origin': `${RizzFables.baseUrl}/`,
                'user-agent': await this.requestManager.getDefaultUserAgent()
            }
        })
    }

    checkResponseError(response: Response): void {
        const status = response.status

        switch (status) {
            case 403:
            case 503:
                throw new Error(`CLOUDFLARE BYPASS ERROR:\nPlease go to the homepage of <${RizzFables.baseUrl}> and press the cloud icon.`)
            case 404:
                throw new Error(`The requested page ${response.request.url} was not found!`)
        }
    }
}