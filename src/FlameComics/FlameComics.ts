import {
    BadgeColor,
    Chapter,
    ChapterDetails,
    ChapterProviding,
    ContentRating,
    HomePageSectionsProviding,
    HomeSection,
    HomeSectionType,
    MangaProviding,
    PagedResults,
    RequestManager,
    SearchField,
    SearchRequest,
    SearchResultsProviding,
    SourceInfo,
    SourceIntents,
    SourceManga,
    SourceStateManager,
    TagSection,
    Request,
    Response
} from '@paperback/types'
import * as cheerio from 'cheerio'
import { URLBuilder } from '../UrlBuilder'

const FLAMECOMICS_DOMAIN = 'https://flamecomics.xyz'
const FLAMECOMICS_CDN_DOMAIN = 'https://cdn.flamecomics.xyz'
const IMAGE_CDN_SLUG = 'uploads/images/series'
const IMAGE_CAROUSEL_SLUG = 'uploads/images/carousel'

export const FlameComicsInfo: SourceInfo = {
    version: '1.2.2',
    name: 'FlameComics',
    description: 'Flame comics source for 0.8',
    author: 'IvanMatthew',
    authorWebsite: 'http://github.com/Ivanmatthew',
    icon: 'icon.png',
    contentRating: ContentRating.EVERYONE,
    websiteBaseURL: FLAMECOMICS_DOMAIN,
    sourceTags: [
        {
            text: 'English',
            type: BadgeColor.GREY
        }
    ],
    intents:
        SourceIntents.MANGA_CHAPTERS |
        SourceIntents.HOMEPAGE_SECTIONS |
        SourceIntents.CLOUDFLARE_BYPASS_REQUIRED
}

type FlameComicsChapterImageObject = {
    size: number
    type: string[] // first idx being the mime type
    name: string
    modified: string // ISO8601 timestamp
    width: number
    height: number
}
type FlameComicsChapterObject = {
    series_id: number
    chapter_id: number
    chapter: string
    chapter_title: string | null
    images: FlameComicsChapterImageObject[]
    language: string
    draft: number
    hidden: number
    token: string
    release_date: number // timestamp
    edit_time: number // timestamp
    unix_timestamp: number
    title: string
    altTitles: string[]
    tags: string[]
    description: string // richtext html
    cover: string
}
type FlameComicsChapterPreviewObject = {
    chapter_id: number
    series_id: number
    chapter: string
    title: string
    cover: {
        cover: string
    }
    release_date: number // timestamp
    token: string
    edit_time: number // timestamp
}
type FlameComicsComicObject = {
    series_id: number
    title: string
    altTitles: string[]
    description: string
    language: string
    type: string
    tags: string[]
    country: string
    author: string
    artist: string
    publisher: string
    year: number
    status: string
    schedule: string
    likes?: number | null
    cover: string // as json object, FLAMECOMICS_CDN_DOMAIN + "/${IMAGE_CDN_SLUG}/" + series_id + cover
    draft?: number | null
    last_edit: string // timestamp
    time: number // also timestamp
}
// Separate object for Browse (FlameComics devs what are you doing???)
type FlameComicsComicSeriesObject = {
    series_id: number
    title: string
    description: string
    language: string
    type: string
    categories: string[] // tags: string[]
    country: string
    author: string[]
    artist: string[]
    publisher: string[]
    year: number
    status: string
    likes: number
    cover: string // as json object, FLAMECOMICS_CDN_DOMAIN + "/${IMAGE_CDN_SLUG}/" + series_id + cover
    last_edit: string // timestamp
    time: number // also timestamp
}
type FlameComicsSectionComicObject = {
    series_id: number
    title: string
    language: string
    type: string
    tags: string[]
    country: string
    author: string[]
    artist: string[]
    publisher: string[]
    status: string
    likes: number
    cover: string
    last_edit: string
    time: number
}
type FlameComicsCarouselComicObject = {
    id: number
    series_id: number
    novel_id: number | null
    title: string
    categories: string[]
    language: string
    image: string // as filename, FLAMECOMICS_CDN_DOMAIN + "/${IMAGE_CAROUSEL_SLUG}/" + image
    link: null
}
type FlameComicsSectionObject = {
    title: string
    showChapters: boolean
    carousel: boolean
    series: FlameComicsSectionComicObject[]
}
type FlameComicsEntriesObject = {
    blocks: FlameComicsSectionObject[]
}
type FlameComicsIndexObject = {
    cookies: {}
    __N_SSG: boolean
    pageProps: {
        carousel: FlameComicsCarouselComicObject[]
        popularEntries: FlameComicsEntriesObject
        latestEntries: FlameComicsEntriesObject
    }
}
type FlameComicsMangaDetailsObject = {
    cookies: {}
    __N_SSG: boolean
    pageProps: {
        series: FlameComicsComicObject
        chapters: FlameComicsChapterPreviewObject[]
    }
}
type FlameComicsMangaChapterDetailsObject = {
    cookies: {}
    __N_SSG: boolean
    pageProps: {
        chapter: FlameComicsChapterObject
        chapterList: FlameComicsChapterPreviewObject[]
    }
}
type FlameComicsBrowseObject = {
    cookies: {}
    __N_SSG: boolean
    pageProps: {
        series: FlameComicsComicSeriesObject[]
    }
}

export class FlameComics
    implements
        SearchResultsProviding,
        MangaProviding,
        ChapterProviding,
        HomePageSectionsProviding
{
    requestManager: RequestManager
    stateManager: SourceStateManager
    buildId: string = ''

    constructor() {
        this.requestManager = App.createRequestManager({
            requestsPerSecond: 2,
            requestTimeout: 30000,
            interceptor: {
                interceptRequest: async (
                    request: Request
                ): Promise<Request> => {
                    request.headers = {
                        ...(request.headers ?? {}),
                        ...{
                            referer: `${FLAMECOMICS_DOMAIN}/`,
                            origin: `${FLAMECOMICS_DOMAIN}/`,
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
        this.stateManager = App.createSourceStateManager()
    }

    private refreshBuildId = async (deleteCache: boolean = false) => {
        if (!deleteCache) {
            const cachedBuildId = await this.stateManager.retrieve('buildId')
            if (cachedBuildId) {
                this.buildId = cachedBuildId
                return
            }
        }

        const response = await this.requestManager.schedule(
            App.createRequest({
                url: `${FLAMECOMICS_DOMAIN}`,
                method: 'GET'
            }),
            1
        )

        if (response.status != 200 || !response.data) {
            throw new Error(
                `Failed to fetch build id, site unavailable. Response code: ${
                    response.status
                }, with request - response cookies: ${response.request.cookies.join(
                    ', '
                )} - ${JSON.stringify(response.headers['set-cookie'])}`
            )
        }

        const $ = cheerio.load(response.data)
        const nextData = $('script#__NEXT_DATA__')
        if (!nextData) {
            throw new Error(
                'Failed to parse script containing build id, site changed'
            )
        }
        const nextDataJson = JSON.parse(nextData.text() || '')
        if (!nextDataJson) {
            throw new Error(
                'Failed to parse nextdata containing build id, site changed'
            )
        }

        const buildId = nextDataJson.buildId
        if (!buildId) {
            throw new Error('Failed to parse build id')
        }

        this.buildId = buildId
    }

    private checkResponse = (response: Response) => {
        if (response.status != 200) {
            throw new Error(
                `Failed to fetch for ${response.request.url}, status code: ${response.status}`
            )
        }
    }
    private scheduleRequest = async (
        request: Request,
        retries = 2
    ): Promise<Response> => {
        await this.refreshBuildId()

        const response = await this.requestManager.schedule(request, retries)
        this.checkResponse(response)

        return response
    }

    private convertLanguageNameToCode = (languageName: string): string => {
        switch (languageName) {
            case 'English':
                return '🇬🇧'
            // case 'Japanese':
            //     return '🇯🇵'
            // case 'Korean':
            //     return '🇰🇷'
            // case 'Chinese':
            //     return '🇨🇳'
            default:
                return '🌐'
        }
    }

    /// Main screen
    async getHomePageSections(
        sectionCallback: (section: HomeSection) => void
    ): Promise<void> {
        await this.refreshBuildId()

        const indexRequest = App.createRequest({
            url: `${FLAMECOMICS_DOMAIN}/_next/data/${this.buildId}/index.json`,
            method: 'GET'
        })
        let indexResponse = await this.scheduleRequest(indexRequest, 0)
        if (indexResponse.status === 404) {
            await this.refreshBuildId(true)
            indexResponse = await this.scheduleRequest(indexRequest, 0)
        }

        let indexResponseData

        try {
            indexResponseData = JSON.parse(
                indexResponse.data as string
            ) as FlameComicsIndexObject
        } catch {
            throw new Error(
                'FlameComics could not load, please contact IvanMatthew.'
            )
        }

        // Carrousel
        const carrouselSection = App.createHomeSection({
            id: 'featured',
            title: 'Featured',
            type: HomeSectionType.featured,
            containsMoreItems: false,
            items: indexResponseData.pageProps.carousel.map((comic) => {
                return App.createPartialSourceManga({
                    mangaId: comic.series_id.toString(),
                    image: `${FLAMECOMICS_CDN_DOMAIN}/${IMAGE_CAROUSEL_SLUG}/${comic.image}`,
                    title: comic.title
                })
            })
        })
        sectionCallback(carrouselSection)

        // Popular
        const popularSection = App.createHomeSection({
            id: 'popular',
            title: 'Popular',
            type: HomeSectionType.singleRowLarge,
            containsMoreItems: false,
            items: indexResponseData.pageProps.popularEntries.blocks?.[0]?.series.map(
                (comic) => {
                    return App.createPartialSourceManga({
                        mangaId: comic.series_id.toString(),
                        image: `${FLAMECOMICS_CDN_DOMAIN}/${IMAGE_CDN_SLUG}/${comic.series_id}/${comic.cover}`,
                        title: comic.title,
                        subtitle: `${comic.likes} likes | ${comic.status}`
                    })
                }
            )
        })
        sectionCallback(popularSection)

        // Latest
        const latestSection = App.createHomeSection({
            id: 'latest',
            title: 'Latest',
            type: HomeSectionType.singleRowNormal,
            containsMoreItems: false,
            items: indexResponseData.pageProps.latestEntries.blocks?.[0]?.series.map(
                (comic) => {
                    return App.createPartialSourceManga({
                        mangaId: comic.series_id.toString(),
                        image: `${FLAMECOMICS_CDN_DOMAIN}/${IMAGE_CDN_SLUG}/${comic.series_id}/${comic.cover}`,
                        title: comic.title,
                        subtitle: comic.status
                    })
                }
            )
        })
        sectionCallback(latestSection)
    }
    async getViewMoreItems(
        homepageSectionId: string,
        metadata: any
    ): Promise<PagedResults> {
        throw new Error('Should not be implemented.')
    }

    /// Manga fetching
    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        await this.refreshBuildId()

        const mangaDetailsPageProps = (
            JSON.parse(
                (
                    await this.scheduleRequest(
                        App.createRequest({
                            url: `${FLAMECOMICS_DOMAIN}/_next/data/${this.buildId}/series/${mangaId}.json?id=${mangaId}`,
                            method: 'GET'
                        }),
                        0
                    )
                ).data as string
            ) as FlameComicsMangaDetailsObject
        ).pageProps

        return App.createSourceManga({
            id: mangaId,
            mangaInfo: App.createMangaInfo({
                image: `${FLAMECOMICS_CDN_DOMAIN}/${IMAGE_CDN_SLUG}/${mangaId}/${mangaDetailsPageProps.series.cover}`,
                artist: mangaDetailsPageProps.series.artist,
                author: mangaDetailsPageProps.series.author,
                desc: cheerio
                    .load(mangaDetailsPageProps.series.description)
                    .text(),
                status: mangaDetailsPageProps.series.status,
                hentai: false,
                titles: [
                    mangaDetailsPageProps.series.title,
                    ...mangaDetailsPageProps.series.altTitles.map(
                        (title: string) => cheerio.load(title).text()
                    )
                ],
                tags: [
                    App.createTagSection({
                        id: '0',
                        label: 'Genres',
                        tags: mangaDetailsPageProps.series.tags.map(
                            (tag: string) => {
                                return App.createTag({
                                    id: tag.toLowerCase(),
                                    label: tag
                                })
                            }
                        )
                    })
                ],
                covers: [
                    `${FLAMECOMICS_CDN_DOMAIN}/${IMAGE_CDN_SLUG}/${mangaId}/${mangaDetailsPageProps.series.cover}`
                ]
            })
        })
    }
    getMangaShareUrl?(mangaId: string): string {
        return `${FLAMECOMICS_DOMAIN}/series/${mangaId}`
    }
    async getChapters(mangaId: string): Promise<Chapter[]> {
        await this.refreshBuildId()

        const mangaDetailsPageProps = (
            JSON.parse(
                (
                    await this.scheduleRequest(
                        App.createRequest({
                            url: `${FLAMECOMICS_DOMAIN}/_next/data/${this.buildId}/series/${mangaId}.json?id=${mangaId}`,
                            method: 'GET'
                        }),
                        0
                    )
                ).data as string
            ) as FlameComicsMangaDetailsObject
        ).pageProps

        return mangaDetailsPageProps.chapters.map((chapter) => {
            const chapterNumber = parseFloat(chapter.chapter)
            return App.createChapter({
                id: chapter.chapter_id.toString(),
                chapNum: chapterNumber,
                langCode: '🇬🇧',
                name:
                    chapter.title != null &&
                    chapter.title !== '' &&
                    chapter.title !== 'null'
                        ? `Ch. ${chapterNumber} - ${chapter.title}`
                        : `Ch. ${chapterNumber}`,
                time: new Date(Number(chapter.release_date) * 1000)
            })
        })
    }
    async getChapterDetails(
        mangaId: string,
        chapterId: string
    ): Promise<ChapterDetails> {
        await this.refreshBuildId()

        const mangaDetailsPageProps = (
            JSON.parse(
                (
                    await this.scheduleRequest(
                        App.createRequest({
                            url: `${FLAMECOMICS_DOMAIN}/_next/data/${this.buildId}/series/${mangaId}.json?id=${mangaId}`,
                            method: 'GET'
                        }),
                        0
                    )
                ).data as string
            ) as FlameComicsMangaDetailsObject
        ).pageProps
        const chapterPreview = mangaDetailsPageProps.chapters.find(
            (chapter) => chapter.chapter_id.toString() === chapterId
        )
        if (!chapterPreview) {
            throw new Error('Chapter not found')
        }
        const token = chapterPreview.token

        const mangaChapterDetailsUrlBuilder = new URLBuilder(
            `${FLAMECOMICS_DOMAIN}/_next/data/${this.buildId}/series/${mangaId}/${token}.json`
        )
            .addQueryParameter('id', mangaId)
            .addQueryParameter('token', token)
        const mangaChapterDetailsPageProps = (
            JSON.parse(
                (
                    await this.scheduleRequest(
                        App.createRequest({
                            url: mangaChapterDetailsUrlBuilder.build(),
                            method: 'GET'
                        }),
                        0
                    )
                ).data as string
            ) as FlameComicsMangaChapterDetailsObject
        ).pageProps

        // images is an object with keys as index and values as image object
        // re-cast iamges
        const images = Object.entries(
            mangaChapterDetailsPageProps.chapter.images
        ).map(([index, image]) => {
            return `${FLAMECOMICS_CDN_DOMAIN}/${IMAGE_CDN_SLUG}/${mangaId}/${token}/${image.name}`
        })

        return App.createChapterDetails({
            id: mangaChapterDetailsPageProps.chapter.chapter_id.toString(),
            mangaId: mangaId,
            pages: images
        })
    }

    /// Searching
    async getSearchResults(
        query: SearchRequest,
        metadata: unknown | undefined
    ): Promise<PagedResults> {
        await this.refreshBuildId()

        const browseResponseData = JSON.parse(
            (
                await this.scheduleRequest(
                    App.createRequest({
                        url: `${FLAMECOMICS_DOMAIN}/_next/data/${this.buildId}/browse.json?search=${query.title}`,
                        method: 'GET'
                    }),
                    0
                )
            ).data as string
        ) as FlameComicsBrowseObject
        // They send everything over, so you filter clientside

        return App.createPagedResults({
            // export interface SearchRequest {
            //     readonly title?: string;
            //     readonly includedTags: Tag[];
            //     readonly excludedTags: Tag[];
            //     /*
            //     * internalName: _includeOperator
            //     */
            //     readonly includeOperator?: string;
            //     /*
            //     * internalName: _excludeOperator
            //     */
            //     readonly excludeOperator?: string;
            //     readonly parameters: Record<string, any>;
            // }

            results: browseResponseData.pageProps.series
                .filter((comic) => {
                    if (query.includedTags.length > 0) {
                        const includedTags = query.includedTags.map(
                            (tag) => tag.label
                        )
                        const comicTags = comic.categories
                        return includedTags.some((tag) =>
                            comicTags.includes(tag)
                        )
                    }

                    return true
                })
                .filter((comic) => {
                    if (query.excludedTags.length > 0) {
                        const excludedTags = query.excludedTags.map(
                            (tag) => tag.label
                        )
                        const comicTags = comic.categories
                        return !excludedTags.some((tag) =>
                            comicTags.includes(tag)
                        )
                    }

                    return true
                })
                .filter((comic) => {
                    if (query.title !== undefined) {
                        return comic.title
                            .toLowerCase()
                            .includes(query.title.toLowerCase())
                    }

                    return true
                })
                .map((comic) => {
                    return App.createPartialSourceManga({
                        mangaId: comic.series_id.toString(),
                        image: `${FLAMECOMICS_CDN_DOMAIN}/${IMAGE_CDN_SLUG}/${comic.series_id}/${comic.cover}`,
                        title: comic.title,
                        subtitle: comic.status
                    })
                })
        })
    }
    async getSearchTags?(): Promise<TagSection[]> {
        return []
    }
    async getSearchFields?(): Promise<SearchField[]> {
        return []
    }
    // Search config
    async supportsTagExclusion?(): Promise<boolean> {
        return false
    }
    async supportsSearchOperators?(): Promise<boolean> {
        return false
    }

    async getCloudflareBypassRequestAsync(): Promise<Request> {
        return App.createRequest({
            url: FLAMECOMICS_DOMAIN,
            method: 'GET',
            headers: {
                referer: `${FLAMECOMICS_DOMAIN}/`,
                origin: `${FLAMECOMICS_DOMAIN}/`,
                'user-agent': await this.requestManager.getDefaultUserAgent()
            }
        })
    }
}
