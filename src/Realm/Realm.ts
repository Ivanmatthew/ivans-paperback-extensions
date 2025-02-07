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
    SourceStateManager,
    TagSection
} from '@paperback/types'

import { RealmParser } from './RealmParser'
import { URLBuilder } from '../UrlBuilder'

import * as cheerio from 'cheerio'

import { getSourceRequestManager } from './components/SourceRequestManager'
import { Configuration as SourceConfiguration } from './components/Configuration'
import {
    Source,
    Metadata,
    ComicResult,
    HomeSectionData,
    DefaultHomeSectionData,
    AltHomeSectionHandler,
    ChapterObject,
    SeriesObject
} from './components/Types'
import {
    createHomeSection,
    getFilterTagsBySection,
    getIncludedTagBySection,
    getPrefixSlug,
    generateSeriesLink,
    generateChapterLink
} from './components/Helper'

export const RealmInfo: SourceInfo = {
    version: '3.0.1',
    name: 'Realm',
    description: 'Extension that pulls manga from the Realm scanlation group.',
    author: 'IvanMatthew',
    authorWebsite: 'http://github.com/Ivanmatthew',
    icon: 'icon.png',
    contentRating: ContentRating.MATURE,
    websiteBaseURL: SourceConfiguration.baseUrl,
    intents:
        SourceIntents.MANGA_CHAPTERS |
        SourceIntents.HOMEPAGE_SECTIONS |
        SourceIntents.CLOUDFLARE_BYPASS_REQUIRED |
        SourceIntents.SETTINGS_UI,
    sourceTags: []
}

export class Realm extends SourceConfiguration implements Source {
    requestManager: RequestManager = getSourceRequestManager(Realm.baseUrl)
    stateManager: SourceStateManager = App.createSourceStateManager()
    parser: RealmParser = new RealmParser()

    constructor() {
        super()

        this.configureSections()
    }

    // We have to figure out how to cache this and when it is invalidated!
    async getDynamicSiteSlug(): Promise<string> {
        const request = App.createRequest({
            url: Realm.baseUrl,
            method: 'GET'
        })

        const response = await this.requestManager.schedule(request, 1)
        this.checkResponseError(response)
        const $ = cheerio.load(response.data as string)

        const prefixSlug = getPrefixSlug($)
        if (prefixSlug === '') {
            throw new Error('Unable to find prefix slug')
        }

        return prefixSlug
    }

    // ----HOMESCREEN SELECTORS----
    /**
     * Enable or disable the "Popular Today" section on the homescreen
     * Some sites don't have this section on this homescreen, if they don't disable this.
     * Enabled Default = true
     * Selector Default = "h2:contains(Popular Today)"
     */

    configureSections(): void {
        return
    }

    homescreen_sections: Record<
        'popular_today' | 'latest_update',
        HomeSectionData | AltHomeSectionHandler
    > = {
        popular_today: {
            ...DefaultHomeSectionData,
            section: createHomeSection(
                'popular_today',
                'Popular Today',
                false,
                HomeSectionType.featured
            ),
            selectorFunc: ($: cheerio.CheerioAPI) =>
                $('div.bsx', $('h2:contains(Popular Today)')?.parent()?.next()),
            titleSelectorFunc: (
                $: cheerio.CheerioAPI,
                element: cheerio.Element
            ) => $('a', element).attr('title'),
            subtitleSelectorFunc: (
                $: cheerio.CheerioAPI,
                element: cheerio.Element
            ) => $('div.epxs', element).text().trim(),
            getViewMoreItemsFunc: (page: number) =>
                `${Realm.directoryPath}/?page=${page}&order=popular`,
            sortIndex: 0
        },
        latest_update: {
            enabled: true,
            sortIndex: 1,
            section: createHomeSection(
                'latest_update',
                'Latest Update',
                true,
                HomeSectionType.singleRowNormal
            ),
            getFunc: async () => {
                const request = App.createRequest({
                    url: `${Realm.baseUrl}/load-more-series`,
                    method: 'POST',
                    data: new URLBuilder('')
                        .addQueryParameter('offset', '0')
                        .addQueryParameter('limit', '12')
                        .buildQueryParameters()
                })

                const response = await this.requestManager.schedule(request, 1)
                this.checkResponseError(response)

                const items: SeriesObject[] = JSON.parse(
                    response.data as string
                )

                return items
            },
            // Offset being the length of the array (amount of items in it)
            getMoreFunc: async (offset: number) => {
                const urlBuilder = new URLBuilder(Realm.baseUrl)
                    .addPathComponent('/load-more-series')
                    .addQueryParameter('offset', offset.toString())
                    .addQueryParameter('limit', '3')
                const request = App.createRequest({
                    url: `${Realm.baseUrl}/load-more-series`,
                    method: 'POST',
                    headers: {
                        'Content-Type':
                            'application/x-www-form-urlencoded; charset=UTF-8'
                    },
                    data: urlBuilder.buildQueryParameters()
                })

                const response = await this.requestManager.schedule(request, 1)
                this.checkResponseError(response)

                const items: SeriesObject[] = JSON.parse(
                    response.data as string
                )

                return {
                    series: items,
                    hasMore: items.length === 3
                }
            }
        }
    }

    // @ts-ignore Apparently this is supported but not relayed in types.
    async getMangaShareUrl(mangaId: string): Promise<string> {
        return await generateSeriesLink(
            await this.getDynamicSiteSlug(),
            mangaId
        )
    }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        const request = App.createRequest({
            url: await generateSeriesLink(
                await this.getDynamicSiteSlug(),
                mangaId
            ),
            method: 'GET'
        })

        const response = await this.requestManager.schedule(request, 1)
        this.checkResponseError(response)
        const $ = cheerio.load(response.data as string)

        return this.parser.parseMangaDetails($, mangaId)
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const request = App.createRequest({
            url: generateSeriesLink(await this.getDynamicSiteSlug(), mangaId),
            method: 'GET'
        })

        const response = await this.requestManager.schedule(request, 1)
        this.checkResponseError(response)
        const $ = cheerio.load(response.data as string)

        return this.parser.parseChapterList($, mangaId)
    }

    async getChapterDetails(
        mangaId: string,
        chapterId: string
    ): Promise<ChapterDetails> {
        // Request the chapter page
        const _request = App.createRequest({
            url: await generateChapterLink(
                await this.getDynamicSiteSlug(),
                mangaId,
                chapterId
            ),
            method: 'GET'
        })

        const _response = await this.requestManager.schedule(_request, 1)
        this.checkResponseError(_response)
        const _$ = cheerio.load(_response.data as string)

        return this.parser.parseChapterDetails(_$, mangaId, chapterId)
    }

    async getSearchTags(): Promise<TagSection[]> {
        const request = App.createRequest({
            url: `${Realm.baseUrl}/${Realm.filterPath}/`,
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
        const searchResultData: ComicResult[] = JSON.parse(
            response.data as string
        )

        const results: PartialSourceManga[] = []
        for (const manga of searchResultData) {
            results.push(
                App.createPartialSourceManga({
                    mangaId: manga.id,
                    image: `${Realm.baseAssetUrl}/${manga.image_url}`,
                    title: manga.title,
                    subtitle: `Chapter ${manga.latest_chapter_title}`
                })
            )
        }

        // Results are single page, unpaged, therefore no metadata for next page is required
        return App.createPagedResults({
            results: results
        })
    }

    async constructSearchRequest(
        page: number,
        query: SearchRequest
    ): Promise<Request> {
        let searchUrl: URLBuilder = new URLBuilder(Realm.baseUrl)
        const headers: Record<string, string> = {
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
        }
        const formData: Record<string, string> = {}

        if (query?.title) {
            searchUrl = searchUrl.addPathComponent(Realm.searchEndpoint)
            formData['search_value'] =
                query?.title.replace(/[’–][a-z]*/g, '') ?? ''
        } else {
            searchUrl = searchUrl.addPathComponent(Realm.filterEndpoint)

            const statusValue = getIncludedTagBySection(
                'status',
                query?.includedTags
            )
            const typeValue = getIncludedTagBySection(
                'type',
                query?.includedTags
            )
            const orderValue = getIncludedTagBySection(
                'order',
                query?.includedTags
            )

            formData['genres_checked[]'] = getFilterTagsBySection(
                'genres',
                query?.includedTags,
                true
            ).join('&genre[]=')
            formData['StatusValue'] = statusValue !== '' ? statusValue : 'all'
            formData['TypeValue'] = typeValue !== '' ? typeValue : 'all'
            formData['OrderValue'] = orderValue !== '' ? orderValue : 'all'
        }

        return App.createRequest({
            url: searchUrl.build({
                addTrailingSlash: true,
                includeUndefinedParameters: false
            }),
            headers: headers,
            data: Object.entries(formData)
                .map(
                    ([key, value]) =>
                        `${encodeURIComponent(key)}=${encodeURIComponent(
                            value
                        )}`
                )
                .join('&'),
            method: 'POST'
        })
    }

    async supportsTagExclusion(): Promise<boolean> {
        return false
    }

    async getHomePageSections(
        sectionCallback: (section: HomeSection) => void
    ): Promise<void> {
        const request = App.createRequest({
            url: `${Realm.baseUrl}/`,
            method: 'GET'
        })

        const response = await this.requestManager.schedule(request, 1)
        this.checkResponseError(response)

        const $ = cheerio.load(response.data as string)

        const promises: Promise<void>[] = []
        const sectionValues = Object.values(this.homescreen_sections).sort(
            (n1, n2) => n1.sortIndex - n2.sortIndex
        )
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
            promises.push(
                new Promise(async () => {
                    section.section.items = await this.parser.parseHomeSection(
                        $,
                        section,
                        this
                    )
                    sectionCallback(section.section)
                })
            )
        }

        // Ensure the functions complete
        await Promise.all(promises)
    }

    async getViewMoreItems(
        homepageSectionId: string,
        metadata: Metadata | undefined
    ): Promise<PagedResults> {
        switch (homepageSectionId) {
            case 'latest_update': {
                // TODO: Give constant a better place
                let offset = 0

                // Note to self: if metadata is null, that is page 1 and page 1 is actually page 2 and so forth...
                if (metadata && metadata.page) {
                    offset = metadata.page * 3
                }

                const comicResults = await (
                    this.homescreen_sections[
                        homepageSectionId
                    ] as AltHomeSectionHandler
                ).getMoreFunc(offset)

                const items: PartialSourceManga[] = []

                for (const manga of comicResults.series) {
                    const subtitle = manga.chapters[0]?.chapter_title
                        ? `Chapter ${manga.chapters[0]?.chapter_title}`
                        : 'N/A'

                    items.push(
                        App.createPartialSourceManga({
                            mangaId: manga.id,
                            title: manga.title,
                            subtitle: subtitle,
                            image: `${Realm.baseAssetUrl}/${manga.image_url}`
                        })
                    )
                }

                return App.createPagedResults({
                    results: items,
                    metadata: comicResults.hasMore
                        ? { page: (offset + 3) / 3 }
                        : undefined
                })
            }
            default: {
                throw new Error(`Invalid homeSectionId '${homepageSectionId}'`)
            }
        }
    }

    async getCloudflareBypassRequestAsync(): Promise<Request> {
        this.requestManager?.cookieStore?.getAllCookies().forEach((x) => {
            this.requestManager?.cookieStore?.removeCookie(x)
        })

        return App.createRequest({
            url: `${Realm.bypassPage || Realm.baseUrl}/`,
            method: 'GET',
            headers: {
                referer: `${Realm.baseUrl}/`,
                origin: `${Realm.baseUrl}/`,
                'user-agent': await this.requestManager.getDefaultUserAgent()
            }
        })
    }

    checkResponseError(response: Response): void {
        const status = response.status

        switch (status) {
            case 403:
                throw new Error(
                    `[Forbidden] CLOUDFLARE BYPASS ERROR:\nPlease go to the homepage of <${Realm.baseUrl}> and press the cloud icon.`
                )
            case 503:
                throw new Error(
                    `[Service Unavailable] CLOUDFLARE BYPASS ERROR:\nPlease go to the homepage of <${Realm.baseUrl}> and press the cloud icon.`
                )
            case 404:
                throw new Error(
                    `[Not Found] The requested page ${response.request.url} was not found!`
                )
        }
    }
}
