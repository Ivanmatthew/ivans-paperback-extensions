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
    TagSection,
    SearchField,
    DUISection
} from '@paperback/types'
import {
    HOME_SECTIONS,
    TAG_SECTION_IDS,
    parseChapterDetails,
    parseChapters,
    parseHomeSections,
    parseMangaDetails,
    parseTags
} from './AsuraScansParser'

import { decode as decodeHTMLEntity } from 'html-entities'

import * as cheerio from 'cheerio'
import { CreatorsData, SeriesData } from './interfaces'

import { URLBuilder } from './utils/URLBuilder'
import { cleanTagId, getTagsOfSection, pickTag } from './utils/TagsHelper'

const AS_DOMAIN_NAME = 'asurascans.com'
const AS_DOMAIN = `https://${AS_DOMAIN_NAME}`
const AS_API_DOMAIN = `https://api.${AS_DOMAIN_NAME}/api`

const PAGE_SIZE = 20

export const AsuraScansInfo: SourceInfo = {
    version: '6.1.1',
    name: 'AsuraScans',
    description: 'Extension that pulls manga from AsuraScans',
    author: 'IvanMatthew',
    authorWebsite: 'https://github.com/Ivanmatthew',
    icon: 'icon.png',
    contentRating: ContentRating.MATURE,
    websiteBaseURL: AS_DOMAIN,
    intents:
        SourceIntents.MANGA_CHAPTERS |
        SourceIntents.SETTINGS_UI |
        SourceIntents.HOMEPAGE_SECTIONS |
        SourceIntents.CLOUDFLARE_BYPASS_REQUIRED,
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
                    ...request.headers,
                    'user-agent':
                        await this.requestManager.getDefaultUserAgent()
                }
                return request
            },
            interceptResponse: async (
                response: Response
            ): Promise<Response> => {
                this.CloudFlareError(response.status)

                return response
            }
        }
    })

    stateManager = App.createSourceStateManager()

    async getLatestUpdatesViewMoreState(): Promise<boolean> {
        return (await this.stateManager.retrieve('luvm')) ?? false
    }

    // State for 0.9 compatibility
    async get09CompatState(): Promise<boolean> {
        return (await this.stateManager.retrieve('09cst')) ?? false
    }

    async getSourceMenu(): Promise<DUISection> {
        return App.createDUISection({
            id: 'settings',
            header: 'Source Settings',
            isHidden: false,
            rows: async () => [
                App.createDUISwitch({
                    id: 'luvmsw',
                    label: 'Toggle View More For Latest Updates',
                    value: App.createDUIBinding({
                        get: () => this.getLatestUpdatesViewMoreState(),
                        set: async (value: boolean) =>
                            await this.stateManager.store('luvm', value)
                    })
                }),
                App.createDUISwitch({
                    id: '09cst',
                    label: '(Only for users on Paperback app version 0.9!!!) Toggle 0.9 Compatibility',
                    value: App.createDUIBinding({
                        get: () => this.get09CompatState(),
                        set: async (value: boolean) =>
                            await this.stateManager.store('09cst', value)
                    })
                })
            ]
        })
    }

    async getTagIdSeparator(): Promise<string> {
        return (await this.get09CompatState()) ? ':09C:' : '|'
    }

    getMangaShareUrl(mangaId: string): string {
        return `${AS_DOMAIN}/comics/${mangaId}`
    }

    async getHomePageSections(
        sectionCallback: (section: HomeSection) => void
    ): Promise<void> {
        const request = App.createRequest({
            url: AS_DOMAIN,
            method: 'GET'
        })
        const response = await this.requestManager.schedule(request, 1)

        const $ = cheerio.load(response.data as string)
        return await parseHomeSections(this, $, sectionCallback)
    }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        const request = App.createRequest({
            url: `${AS_DOMAIN}/comics/${mangaId}`,
            method: 'GET'
        })

        const response = await this.requestManager.schedule(request, 1)
        this.CloudFlareError(response.status)

        const $ = cheerio.load(response.data as string)
        return await parseMangaDetails(
            $,
            mangaId,
            await this.getTagIdSeparator()
        )
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const request = App.createRequest({
            url: `${AS_DOMAIN}/comics/${mangaId}`,
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
            url: `${AS_DOMAIN}/comics/${mangaId}/chapter/${chapterId}`,
            method: 'GET'
        })

        const response = await this.requestManager.schedule(request, 1)
        this.CloudFlareError(response.status)
        const $ = cheerio.load(response.data as string)
        return parseChapterDetails($, mangaId, chapterId)
    }

    async getViewMoreItems(
        homepageSectionId: string,
        metadata?: { lastPage: boolean }
    ): Promise<PagedResults> {
        if (homepageSectionId === 'latest_updates') {
            if (metadata?.lastPage) {
                return App.createPagedResults({})
            }
            metadata = {
                lastPage: true
            }

            const request = App.createRequest({
                url: AS_DOMAIN,
                method: 'GET'
            })
            const response = await this.requestManager.schedule(request, 1)

            const $ = cheerio.load(response.data as string)

            return App.createPagedResults({
                results: HOME_SECTIONS[1]!.parser($)
            })
        } else {
            throw new Error('Not implemented for ' + homepageSectionId)
        }
    }

    async getSearchTags(): Promise<TagSection[]> {
        try {
            const genresRequest = App.createRequest({
                url: `${AS_DOMAIN}/browse`,
                method: 'GET'
            })
            const creatorsRequest = App.createRequest({
                url: `${AS_API_DOMAIN}/creators`,
                headers: {
                    origin: AS_DOMAIN,
                    referer: `${AS_DOMAIN}/`
                },
                method: 'GET'
            })

            const [genresResponse, creatorsResponse] = await Promise.all([
                this.requestManager.schedule(genresRequest, 1),
                this.requestManager.schedule(creatorsRequest, 1)
            ])
            this.CloudFlareError(genresResponse.status)
            this.CloudFlareError(creatorsResponse.status)

            const $ = cheerio.load(genresResponse.data as string)

            return parseTags(
                $,
                JSON.parse(creatorsResponse.data ?? '{}') as CreatorsData,
                await this.getTagIdSeparator()
            )
        } catch (error) {
            throw new Error(error as string)
        }
    }

    async supportsTagExclusion(): Promise<boolean> {
        return false
    }

    async getSearchFields(): Promise<SearchField[]> {
        return [
            App.createSearchField({
                id: 'min_chapters',
                name: 'Minimum Chapters',
                placeholder: 'e.g. 10'
            })
        ]
    }

    async getSearchResults(
        query: SearchRequest,
        metadata:
            | (SeriesData['meta'] & { page: number; lastPage: boolean })
            | undefined
    ): Promise<PagedResults> {
        if (metadata?.lastPage) {
            console.log('DEBUG: LAST PAGE')
            return App.createPagedResults({})
        }

        const page: number = metadata?.page ?? 1

        let urlBuilder: URLBuilder = new URLBuilder(
            AS_API_DOMAIN
        ).addPathComponent('series')

        if (query?.title) {
            urlBuilder.addQueryParameter(
                'search',
                encodeURIComponent(query.title)
            )
        }
        const separator = await this.getTagIdSeparator()

        const typeTag = pickTag(
            query.includedTags,
            TAG_SECTION_IDS.TYPES,
            separator,
            1,
            'Type'
        )
        if (typeTag) {
            urlBuilder.addQueryParameter('type', cleanTagId(typeTag.id))
        }

        const statusTag = pickTag(
            query.includedTags,
            TAG_SECTION_IDS.STATUS,
            separator,
            1,
            'Status'
        )
        if (statusTag) {
            urlBuilder.addQueryParameter('status', cleanTagId(statusTag.id))
        }

        urlBuilder
            .addQueryParameter('sort', 'latest')
            .addQueryParameter(
                'order',
                cleanTagId(
                    pickTag(
                        query.includedTags,
                        TAG_SECTION_IDS.ORDER,
                        separator
                    )?.id ?? 'desc'
                )
            )
            .addQueryParameter('limit', PAGE_SIZE)
            .addQueryParameter('offset', (page - 1) * PAGE_SIZE)

        const genreTags = getTagsOfSection(
            query.includedTags,
            TAG_SECTION_IDS.GENRES,
            separator
        )
        if (genreTags.length > 0) {
            const genreIds = genreTags.map((tag) => cleanTagId(tag.id))
            urlBuilder.addQueryParameter('genres', genreIds.join(','))
        }

        const authorTag = pickTag(
            query.includedTags,
            TAG_SECTION_IDS.AUTHORS,
            separator,
            1,
            'Authors'
        )
        const artistTag = pickTag(
            query.includedTags,
            TAG_SECTION_IDS.ARTISTS,
            separator,
            1,
            'Artists'
        )
        if (authorTag && artistTag) {
            throw new Error(
                'Please select either Author or Artist tags, not both.'
            )
        } else if (authorTag) {
            urlBuilder.addQueryParameter('author', cleanTagId(authorTag.id))
        } else if (artistTag) {
            urlBuilder.addQueryParameter('artist', cleanTagId(artistTag.id))
        }

        if (query.parameters.min_chapters) {
            const minChapters = Number(query.parameters.min_chapters)
            if (isNaN(minChapters)) {
                throw new Error(
                    'Invalid input for Minimum Chapters. Please enter a valid number.'
                )
            }

            urlBuilder.addQueryParameter('min_chapters', minChapters)
        }

        const request = App.createRequest({
            url: urlBuilder.buildUrl(),
            method: 'GET',
            headers: {
                origin: AS_DOMAIN,
                referer: `${AS_DOMAIN}/`
            }
        })

        const response = await this.requestManager.schedule(request, 1)
        const seriesData = JSON.parse(response.data as string) as SeriesData
        if (seriesData.data === null) {
            console.log('DEBUG: LAST PAGE')
            return App.createPagedResults({})
        }

        metadata = {
            ...seriesData.meta,
            page: seriesData.meta.has_more ? page + 1 : page,
            lastPage: !seriesData.meta.has_more
        }

        return App.createPagedResults({
            results: seriesData.data
                .map((series) => {
                    const sortedLatestChapters = series.latest_chapters.sort(
                        (a, b) =>
                            new Date(b.published_at).getTime() -
                            new Date(a.published_at).getTime()
                    )
                    const latestChapter =
                        sortedLatestChapters.length > 0
                            ? sortedLatestChapters[0]
                            : undefined

                    const isEarlyAccess = latestChapter
                        ? latestChapter.early_access_until
                            ? new Date(latestChapter.early_access_until) >
                              new Date()
                            : latestChapter.is_premium
                        : false

                    return App.createPartialSourceManga({
                        mangaId: series.slug,
                        title: series.title,
                        image: series.cover,
                        subtitle: latestChapter
                            ? `${isEarlyAccess ? '[Early Access] ' : ''}Ch. ${latestChapter.number}${latestChapter.title ? ` - ${decodeHTMLEntity(latestChapter.title)}` : ''}`
                            : 'No chapters'
                    })
                })
                // (To make migration user-friendly)
                // Prioritize search results with exact title matches by sorting them to the top
                .sort((a, b) => {
                    if (query.title) {
                        const titleA = a.title.toLowerCase()
                        const titleB = b.title.toLowerCase()
                        const queryTitle = query.title.toLowerCase()

                        const isExactMatchA = titleA === queryTitle
                        const isExactMatchB = titleB === queryTitle

                        if (isExactMatchA && !isExactMatchB) {
                            return -1
                        } else if (!isExactMatchA && isExactMatchB) {
                            return 1
                        }
                    }
                    return 0
                }),
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
