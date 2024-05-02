
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
    ComicResult,
    HomeSectionData,
    DefaultHomeSectionData
} from './components/Types'
import {
    cleanId,
    createHomeSection,
    getFilterTagsBySection,
    getIncludedTagBySection,
    getSlugFromTitle
} from './components/Helper'

export const RizzFablesInfo: SourceInfo = {
    version: '2.0.1',
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
            selectorFunc: ($: cheerio.CheerioAPI) => $('div.uta'),
            titleSelectorFunc: ($: cheerio.CheerioAPI, element: cheerio.Element) => $('a', element).attr('title'),
            subtitleSelectorFunc: ($: cheerio.CheerioAPI, element: cheerio.Element) => $('li > a, div.epxs', $('div.luf, div.bigor', element)).first().text().trim(),
            getViewMoreItemsFunc: (page: string) => `${RizzFables.directoryPath}/?page=${page}&order=update`,
            sortIndex: 20
        },
        'top_alltime': {
            ...DefaultHomeSectionData,
            section: createHomeSection('top_alltime', 'Top All Time', false),
            selectorFunc: ($: cheerio.CheerioAPI) => $('li', $('div.serieslist.pop.wpop.wpop-alltime')),
            sortIndex: 40
        },
        'top_monthly': {
            ...DefaultHomeSectionData,
            section: createHomeSection('top_monthly', 'Top Monthly', false),
            selectorFunc: ($: cheerio.CheerioAPI) => $('li', $('div.serieslist.pop.wpop.wpop-monthly')),
            sortIndex: 50
        },
        'top_weekly': {
            ...DefaultHomeSectionData,
            section: createHomeSection('top_weekly', 'Top Weekly', false),
            selectorFunc: ($: cheerio.CheerioAPI) => $('li', $('div.serieslist.pop.wpop.wpop-weekly')),
            sortIndex: 60
        }
    }

    stateManager = App.createSourceStateManager()
    parser = new MangaStreamParser()

    getMangaShareUrl(mangaTitle: string): string {
        return `${RizzFables.baseUrl}/${RizzFables.directoryPath}/${getSlugFromTitle(mangaTitle)}/`
    }

    async getMangaDetails(mangaTitle: string): Promise<SourceManga> {
        const mangaId = getSlugFromTitle(mangaTitle)
        const request = App.createRequest({
            url: `${RizzFables.baseUrl}/${RizzFables.directoryPath}/${mangaId}/`,
            method: 'GET'
        })

        const response = await this.requestManager.schedule(request, 1)
        this.checkResponseError(response)
        const $ = cheerio.load(response.data as string)

        return this.parser.parseMangaDetails($, mangaTitle)
    }

    async getChapters(mangaTitle: string): Promise<Chapter[]> {

        const mangaId = getSlugFromTitle(mangaTitle)
        const request = App.createRequest({
            url: `${RizzFables.baseUrl}/${RizzFables.directoryPath}/${mangaId}/`,
            method: 'GET'
        })

        const response = await this.requestManager.schedule(request, 1)
        this.checkResponseError(response)
        const $ = cheerio.load(response.data as string)

        return this.parser.parseChapterList($, mangaTitle)
    }

    async getChapterDetails(mangaTitle: string, chapterId: string): Promise<ChapterDetails> {
        const mangaId = getSlugFromTitle(mangaTitle)
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
        if (!id || id === '') {
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

        return this.parser.parseChapterDetails(_$, mangaTitle, chapterId)
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
                mangaId: cleanId(manga.title),
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
                        mangaId: cleanId(manga.title),
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
                    throw new Error(`Invalid homeSectionId: ${homepageSectionId}`)
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