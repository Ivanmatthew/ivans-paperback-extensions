/* eslint-disable linebreak-style */
import {
    Chapter,
    ChapterDetails,
    ChapterProviding,
    ContentRating,
    HomePageSectionsProviding,
    HomeSection,
    MangaProviding,
    PagedResults,
    Request,
    Response,
    SearchRequest,
    SearchResultsProviding,
    SourceInfo,
    SourceIntents,
    SourceManga,
    TagSection
} from '@paperback/types'

import * as cheerio from 'cheerio'

import {
    isLastPage,
    parseChapterDetails,
    parseChapters,
    parseHomeSections,
    parseMangaDetails,
    parseSearch,
    parseTags,
    parseViewMore
} from './AsuraScansParser'

import {
    getFilterTagsBySection,
    getIncludedTagBySection
} from './AsuraScansHelper'
import { URLBuilder } from '../UrlBuilder'
import { setFilters } from './AsuraScansUtils'

const AS_DOMAIN = 'https://asuracomic.net'
const AS_API_DOMAIN = 'https://gg.asuracomic.net'

export const AsuraScansInfo: SourceInfo = {
    version: '5.0.0',
    name: 'AsuraScans',
    description: 'Extension that pulls manga from AsuraScans',
    author: 'IvanMatthew',
    authorWebsite: 'https://github.com/Ivanmatthew',
    icon: 'icon.png',
    contentRating: ContentRating.MATURE,
    websiteBaseURL: AS_DOMAIN,
    intents:
        SourceIntents.MANGA_CHAPTERS |
        SourceIntents.HOMEPAGE_SECTIONS |
        SourceIntents.CLOUDFLARE_BYPASS_REQUIRED |
        SourceIntents.SETTINGS_UI,
    sourceTags: []
}

export class AsuraScans
    implements
        ChapterProviding,
        HomePageSectionsProviding,
        MangaProviding,
        SearchResultsProviding
{
    // ----REQUEST MANAGER----
    requestManager = App.createRequestManager({
        requestsPerSecond: 4,
        requestTimeout: 15000,
        interceptor: {
            interceptRequest: async (request: Request): Promise<Request> => {
                request.headers = {
                    ...(request.headers ?? {}),
                    ...{
                        referer: `${AS_DOMAIN}/`,
                        'user-agent':
                            await this.requestManager.getDefaultUserAgent()
                    }
                }

                return request
            },
            interceptResponse: async (
                response: Response
            ): Promise<Response> => {
                return response
            }
        }
    })

    stateManager = App.createSourceStateManager()

    getMangaShareUrl(mangaId: string): string {
        return `${AS_DOMAIN}/series/${mangaId}`
    }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        const request = App.createRequest({
            url: `${AS_DOMAIN}/series/${mangaId}`,
            method: 'GET'
        })

        const response = await this.requestManager.schedule(request, 1)
        this.CloudFlareError(response.status)
        const $ = cheerio.load(response.data as string)
        return await parseMangaDetails(this, $, mangaId)
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const request = App.createRequest({
            url: `${AS_DOMAIN}/series/${mangaId}`,
            method: 'GET'
        })

        const response = await this.requestManager.schedule(request, 1)
        this.CloudFlareError(response.status)
        const $ = cheerio.load(response.data as string)
        return parseChapters($, mangaId)
    }

    async getChapterDetails(
        mangaId: string,
        chapterId: string
    ): Promise<ChapterDetails> {
        const request = App.createRequest({
            url: `${AS_DOMAIN}/series/${mangaId}/chapter/${chapterId}`,
            method: 'GET'
        })

        const response = await this.requestManager.schedule(request, 1)
        this.CloudFlareError(response.status)
        const $ = cheerio.load(response.data as string)
        return parseChapterDetails($, mangaId, chapterId)
    }

    async getHomePageSections(
        sectionCallback: (section: HomeSection) => void
    ): Promise<void> {
        const request = App.createRequest({
            url: AS_DOMAIN,
            method: 'GET'
        })

        const response = await this.requestManager.schedule(request, 1)
        this.CloudFlareError(response.status)
        const $ = cheerio.load(response.data as string)
        await parseHomeSections(this, $, sectionCallback)
    }

    async getViewMoreItems(
        homepageSectionId: string,
        metadata: any
    ): Promise<PagedResults> {
        if (metadata?.completed) return metadata

        const page: number = metadata?.page ?? 1
        let param = ''

        switch (homepageSectionId) {
            case 'latest_updates':
                param = `series?page=${page}`
                break
            default:
                throw new Error(
                    "Requested to getViewMoreItems for a section ID which doesn't exist"
                )
        }

        const request = App.createRequest({
            url: `${AS_DOMAIN}/${param}`,
            method: 'GET'
        })

        const response = await this.requestManager.schedule(request, 1)
        this.CloudFlareError(response.status)
        const $ = cheerio.load(response.data as string)
        const manga = await parseViewMore(this, $)

        metadata = !isLastPage($) ? { page: page + 1 } : undefined
        return App.createPagedResults({
            results: manga,
            metadata
        })
    }

    async getSearchTags(): Promise<TagSection[]> {
        try {
            const request = App.createRequest({
                url: `${AS_API_DOMAIN}/api/series/filters`,
                method: 'GET'
            })

            const response = await this.requestManager.schedule(request, 1)
            this.CloudFlareError(response.status)
            const data = JSON.parse(response.data as string)

            // Set filters for mangaDetails
            await setFilters(this, data)

            return parseTags(data)
        } catch (error) {
            throw new Error(error as string)
        }
    }

    async supportsTagExclusion(): Promise<boolean> {
        return false
    }

    async getSearchResults(
        query: SearchRequest,
        metadata: any
    ): Promise<PagedResults> {
        const page: number = metadata?.page ?? 1

        let urlBuilder: URLBuilder = new URLBuilder(AS_DOMAIN)
            .addPathComponent('series')
            .addQueryParameter('page', page.toString())

        if (query?.title) {
            urlBuilder = urlBuilder.addQueryParameter(
                'name',
                encodeURIComponent(
                    query?.title.replace(/[’‘´`'-][a-z]*/g, '%') ?? ''
                )
            )
        }

        urlBuilder = urlBuilder
            .addQueryParameter(
                'genres',
                getFilterTagsBySection('genres', query?.includedTags)
            )
            .addQueryParameter(
                'status',
                getIncludedTagBySection('status', query?.includedTags)
            )
            .addQueryParameter(
                'types',
                getIncludedTagBySection('type', query?.includedTags)
            )
            .addQueryParameter(
                'order',
                getIncludedTagBySection('order', query?.includedTags)
            )

        const request = App.createRequest({
            url: urlBuilder.buildUrl(),
            method: 'GET'
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = cheerio.load(response.data as string)

        const items = await parseSearch(this, $)
        metadata = !isLastPage($) ? { page: page + 1 } : undefined
        return App.createPagedResults({
            results: items,
            metadata
        })
    }

    CloudFlareError(status: number): void {
        if (status == 503 || status == 403) {
            throw new Error(
                `CLOUDFLARE BYPASS ERROR:\nPlease go to the homepage of <${AsuraScans.name}> and press the cloud icon.`
            )
        }
    }

    async getCloudflareBypassRequestAsync(): Promise<Request> {
        return App.createRequest({
            url: AS_DOMAIN,
            method: 'GET',
            headers: {
                referer: `${AS_DOMAIN}/`,
                'user-agent': await this.requestManager.getDefaultUserAgent()
            }
        })
    }
}
