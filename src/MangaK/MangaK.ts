import {
    Chapter,
    ChapterDetails,
    ChapterProviding,
    ContentRating,
    HomePageSectionsProviding,
    HomeSection,
    MangaProviding,
    PagedResults,
    Tag,
    Response,
    SearchRequest,
    SearchResultsProviding,
    SourceInfo,
    SourceIntents,
    SourceManga,
    TagSection,
    SearchField,
    RequestManager,
    HomeSectionType,
    PartialSourceManga
} from '@paperback/types'
import type {
    HomeResponse,
    VersionResponse,
    Pagination as PaginationMetadata,
    GenresResponse,
    SearchResponse,
    MangaResponse,
    ChapterResponse,
    TrendingDayResponse,
    LatestResponse,
    ChaptersResponse
} from './interfaces'
import { URLBuilder } from '../UrlBuilder'

const BASE_URL = 'https://mangak.io'
const API_URL = `${BASE_URL}/api`
const API_DOMAIN_URL = 'https://api.mangak.io'

export const MangaKInfo: SourceInfo = {
    version: '0.1.0',
    name: 'MangaK',
    description: 'Extension that pulls manga from MangaK',
    author: 'IvanMatthew',
    authorWebsite: 'https://github.com/Ivanmatthew',
    icon: 'icon.png',
    contentRating: ContentRating.MATURE,
    websiteBaseURL: BASE_URL,
    intents: SourceIntents.MANGA_CHAPTERS | SourceIntents.HOMEPAGE_SECTIONS,
    sourceTags: []
}
const TAG_SECTIONS = [
    // <option value="newest">Recently Added</option><option value="popular">Most Followed</option><option value="rating">Highest Rating</option><option value="views_today">Most Viewed: Today</option><option value="views_7days">Most Viewed: 7 Days</option><option value="views_30days">Most Viewed: 30 Days</option><option value="views">Most Viewed: All Time</option><option value="chapters">Most Chapters</option><option value="alphabetical">A-Z</option>
    {
        id: 'sortBy',
        label: 'Sort By',
        tags: [
            // { // This one is the default
            //     id: 'best_match',
            //     label: 'Best Match'
            // }
            {
                id: 'latest',
                label: 'Latest'
            },
            {
                id: 'newest',
                label: 'Newest'
            },
            {
                id: 'popular',
                label: 'Most Followed'
            },
            {
                id: 'rating',
                label: 'Highest Rating'
            },
            {
                id: 'views_today',
                label: 'Most Viewed: Today'
            },
            {
                id: 'views_7days',
                label: 'Most Viewed: 7 Days'
            },
            {
                id: 'views_30days',
                label: 'Most Viewed: 30 Days'
            },
            {
                id: 'views',
                label: 'Most Viewed: All Time'
            },
            {
                id: 'chapters',
                label: 'Most Chapters'
            },
            {
                id: 'alphabetical',
                label: 'A-Z'
            }
        ]
    },
    // <option value="">Any</option><option value="safe">Safe</option><option value="suggestive">Suggestive</option><option value="erotica">Erotica</option><option value="pornographic">Pornographic</option>
    {
        id: 'contentRating',
        label: 'Content Rating',
        tags: [
            {
                id: 'safe',
                label: 'Safe'
            },
            {
                id: 'suggestive',
                label: 'Suggestive'
            },
            {
                id: 'erotica',
                label: 'Erotica'
            },
            {
                id: 'pornographic',
                label: 'Pornographic'
            }
        ]
    },
    // <option value="">Any</option><option value="manga">Manga</option><option value="manhwa">Manhwa</option><option value="manhua">Manhua</option>
    {
        id: 'type',
        label: 'Type',
        tags: [
            {
                id: 'manga',
                label: 'Manga'
            },
            {
                id: 'manhwa',
                label: 'Manhwa'
            },
            {
                id: 'manhua',
                label: 'Manhua'
            }
        ]
    },
    // <option value="">Any</option><option value="__group_boy__">Boy (Shounen + Seinen)</option><option value="__group_girl__">Girl (Shoujo + Josei)</option><option value="shounen">Shounen</option><option value="shoujo">Shoujo</option><option value="seinen">Seinen</option><option value="josei">Josei</option>
    {
        id: 'demographic',
        label: 'Demographic',
        tags: [
            {
                id: 'shounen',
                label: 'Shounen (Boy)'
            },
            {
                id: 'shoujo',
                label: 'Shoujo (Boy)'
            },
            {
                id: 'seinen',
                label: 'Seinen (Girl)'
            },
            {
                id: 'josei',
                label: 'Josei (Girl)'
            }
        ]
    },
    // <option value="">Any</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option><option value="hiatus">Hiatus</option><option value="cancelled">Cancelled</option>
    {
        id: 'status',
        label: 'Status',
        tags: [
            {
                id: 'ongoing',
                label: 'Ongoing'
            },
            {
                id: 'completed',
                label: 'Completed'
            },
            {
                id: 'hiatus',
                label: 'Hiatus'
            },
            {
                id: 'cancelled',
                label: 'Cancelled'
            }
        ]
    }
] as const
const SEARCH_FIELDS = [
    {
        id: 'min_ch',
        name: 'Minimum Chapter Count',
        placeholder: 'e.g. 50'
    },
    {
        id: 'author',
        name: 'Authors',
        placeholder: 'e.g. RomanticKat NIGYEONG'
    }
]

export class MangaK
    implements
        MangaProviding,
        ChapterProviding,
        SearchResultsProviding,
        HomePageSectionsProviding
{
    buildId: string | null = null
    sections = {
        hero: {
            extractor: (
                data: HomeResponse['pageProps']
            ): PartialSourceManga[] => {
                return data.heroItems.map((item) =>
                    App.createPartialSourceManga({
                        mangaId: item.slug,
                        title: item.name,
                        image: item.cover
                    })
                )
            },
            section: App.createHomeSection({
                id: 'hero',
                type: HomeSectionType.featured,
                title: 'Hot This Week',
                containsMoreItems: false
            }),
            viewMore: undefined
        },
        trending: {
            extractor: (
                data: HomeResponse['pageProps']
            ): PartialSourceManga[] => {
                return data.trendingItems.map((item) =>
                    App.createPartialSourceManga({
                        mangaId: item.slug,
                        title: item.name,
                        image: item.cover,
                        subtitle: `⭐ ${item.displayRating} 🔥 ${item.displayViews}`
                    })
                )
            },
            section: App.createHomeSection({
                id: 'trending',
                type: HomeSectionType.singleRowNormal,
                title: 'Trending Today',
                containsMoreItems: true
            }),
            viewMore: {
                craftUrl: async (
                    _metadata?: PaginationMetadata
                ): Promise<string> => {
                    return `${await this.craftNextDataUrl('/top/day.json')}?type=day`
                },
                extractor: (data: any): PagedResults => {
                    const items = (data as TrendingDayResponse).pageProps
                        .initialItems
                    return App.createPagedResults({
                        results: items.map((item) =>
                            App.createPartialSourceManga({
                                mangaId: item.slug,
                                title: item.name,
                                image: item.cover,
                                subtitle: `⭐ ${item.displayRating} 🔥 ${item.displayViews}`
                            })
                        ),
                        metadata: undefined
                    })
                }
            }
        },
        popular: {
            extractor: (
                data: HomeResponse['pageProps']
            ): PartialSourceManga[] => {
                return data.popularItems.map((item) =>
                    App.createPartialSourceManga({
                        mangaId: item.slug,
                        title: item.name,
                        image: item.cover,
                        subtitle: item.displayUpdatedShort
                    })
                )
            },
            section: App.createHomeSection({
                id: 'popular',
                type: HomeSectionType.singleRowNormal,
                title: 'Popular Updates',
                containsMoreItems: false // use search with sort by Most Followed
            }),
            viewMore: undefined
        },
        latest: {
            extractor: (
                data: HomeResponse['pageProps']
            ): PartialSourceManga[] => {
                return data.latest.items.map((item) =>
                    App.createPartialSourceManga({
                        mangaId: item.slug,
                        title: item.name,
                        image: item.cover,
                        subtitle: `${item.displayUpdatedShort} Ch. ${item.latestChapters[0]?.slug.split('-')[1] ?? 'N/A'}`
                    })
                )
            },
            section: App.createHomeSection({
                id: 'latest',
                type: HomeSectionType.singleRowNormal,
                title: 'Recently Updated',
                containsMoreItems: true
            }),
            viewMore: {
                craftUrl: async (
                    _metadata?: PaginationMetadata
                ): Promise<string> => {
                    return await this.craftNextDataUrl('latest.json')
                },
                extractor: (data: any): PagedResults => {
                    const items = (data as LatestResponse).pageProps.items
                    return App.createPagedResults({
                        results: items.map((item) =>
                            App.createPartialSourceManga({
                                mangaId: item.slug,
                                title: item.name,
                                image: item.cover,
                                subtitle: `${item.displayUpdatedShort} Ch. ${item.latestChapters[0]?.slug.split('-')[1] ?? 'N/A'}`
                            })
                        ),
                        metadata: undefined
                    })
                }
            }
        }
    } as const
    SEARCH_FIELDS: SearchField[] = SEARCH_FIELDS.map(App.createSearchField)
    TAG_SECTIONS: TagSection[] = TAG_SECTIONS.map((section) =>
        App.createTagSection({
            id: section.id,
            label: section.label,
            tags: section.tags.map(App.createTag)
        })
    )

    requestManager: RequestManager = App.createRequestManager({
        requestsPerSecond: 5,
        requestTimeout: 15000,
        interceptor: {
            interceptRequest: async (request) => {
                request.headers = {
                    ...request.headers,
                    referer: `${BASE_URL}/`
                }
                return request
            },
            interceptResponse: async (response) => response
        }
    })

    async fetchBuildId(): Promise<string> {
        if (this.buildId) {
            return this.buildId
        }

        return await this.requestManager
            .schedule(
                App.createRequest({
                    url: `${API_URL}/version`,
                    method: 'GET'
                }),
                1
            )
            .then((res: Response) => {
                const data: VersionResponse = JSON.parse(res.data ?? '{}')
                if (data.buildId) {
                    this.buildId = data.buildId
                    return this.buildId
                } else {
                    throw new Error('Failed to fetch buildId')
                }
            })
    }
    async craftNextDataUrl(route: string): Promise<string> {
        return `${BASE_URL}/_next/data/${await this.fetchBuildId()}/${route}`
    }

    async fetchNextData<T>(route: string): Promise<T> {
        const response = await this.requestManager.schedule(
            App.createRequest({
                url: await this.craftNextDataUrl(route),
                method: 'GET',
                headers: {
                    origin: BASE_URL,
                    referer: `${BASE_URL}/`
                }
            }),
            1
        )

        return JSON.parse(response.data ?? '{}') as T
    }

    getMangaShareUrl(mangaId: string): string {
        return `${MangaKInfo.websiteBaseURL}/${mangaId}`
    }
    async getHomePageSections(
        sectionCallback: (section: HomeSection) => void
    ): Promise<void> {
        Object.values(this.sections).forEach((sectionObj) => {
            sectionCallback(sectionObj.section)
        })
        const request = App.createRequest({
            url: await this.craftNextDataUrl('home.json'),
            method: 'GET'
        })

        await this.requestManager.schedule(request, 1).then((res: Response) => {
            const data: HomeResponse = JSON.parse(res.data ?? '{}')
            Object.values(this.sections).forEach((sectionObj) => {
                sectionObj.section.items = sectionObj.extractor(data.pageProps)
                sectionCallback(sectionObj.section)
            })
        })
    }
    async getViewMoreItems(
        homepageSectionId: string,
        metadata?: PaginationMetadata
    ): Promise<PagedResults> {
        switch (homepageSectionId) {
            case this.sections.popular.section.id:
                throw new Error(
                    'The Popular Updates section does not support view more. Please use search with the "Most Followed" sort option to see more popular manga.'
                )
            default:
                const sectionObj = Object.values(this.sections).find(
                    (section) => section.section.id === homepageSectionId
                )
                if (!sectionObj || !sectionObj.viewMore) {
                    throw new Error('Invalid homepage section ID')
                }
                return await this.requestManager
                    .schedule(
                        App.createRequest({
                            url: await sectionObj.viewMore.craftUrl(metadata),
                            method: 'GET'
                        }),
                        1
                    )
                    .then((res: Response) => {
                        const data = JSON.parse(res.data ?? '{}')
                        return sectionObj!.viewMore!.extractor(data)
                    })
        }
    }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        const data = await this.fetchNextData<MangaResponse>(`${mangaId}.json`)
        const manga = data.pageProps.initialManga

        const titles = [manga.name]
        for (const altName of manga.altNames) {
            if (!titles.includes(altName.name)) {
                titles.push(altName.name)
            }
        }

        const tagSections: TagSection[] = []

        if (manga.genres.length > 0) {
            tagSections.push(
                App.createTagSection({
                    id: 'genres',
                    label: 'Genres',
                    tags: manga.genres.map((genre) =>
                        App.createTag({
                            id: genre.slug,
                            label: genre.name
                        })
                    )
                })
            )
        }

        if (manga.tags.length > 0) {
            tagSections.push(
                App.createTagSection({
                    id: 'tags',
                    label: 'Tags',
                    tags: manga.tags.map((tag) =>
                        App.createTag({
                            id: tag.slug,
                            label: tag.name
                        })
                    )
                })
            )
        }

        if (manga.formats.length > 0) {
            tagSections.push(
                App.createTagSection({
                    id: 'formats',
                    label: 'Formats',
                    tags: manga.formats.map((format) =>
                        App.createTag({
                            id: format.slug,
                            label: format.name
                        })
                    )
                })
            )
        }

        if (manga.type) {
            tagSections.push(
                App.createTagSection({
                    id: 'type',
                    label: 'Type',
                    tags: [
                        App.createTag({
                            id: manga.type.slug,
                            label: manga.type.name
                        })
                    ]
                })
            )
        }

        if (manga.contentRating) {
            tagSections.push(
                App.createTagSection({
                    id: 'contentRating',
                    label: 'Content Rating',
                    tags: [
                        App.createTag({
                            id: manga.contentRating,
                            label:
                                manga.contentRating.charAt(0).toUpperCase() +
                                manga.contentRating.slice(1)
                        })
                    ]
                })
            )
        }

        return App.createSourceManga({
            id: mangaId,
            mangaInfo: App.createMangaInfo({
                titles,
                image: manga.cover,
                author:
                    manga.authors.length > 0
                        ? manga.authors.map((author) => author.name).join(', ')
                        : 'Unknown',
                artist:
                    manga.artists.length > 0
                        ? manga.artists.map((artist) => artist.name).join(', ')
                        : 'Unknown',
                desc: manga.summary,
                status: manga.status,
                tags: tagSections,
                covers: [manga.cover],
                hentai:
                    manga.contentRating === 'erotica' ||
                    manga.contentRating === 'pornographic'
            })
        })
    }
    async getChapters(mangaId: string): Promise<Chapter[]> {
        const data = await this.fetchNextData<MangaResponse>(`${mangaId}.json`)
        const manga = data.pageProps.initialManga

        if (manga.chapters.length === 50) {
            // Fetch the others from the chapter list endpoint
            console.log(
                `${API_DOMAIN_URL}/titles/${data.pageProps.initialManga.id}/chapters`
            )
            const chapterListResponse = await this.requestManager.schedule(
                App.createRequest({
                    method: 'GET',
                    url: `${API_DOMAIN_URL}/titles/${data.pageProps.initialManga.id}/chapters`
                }),
                1
            )
            const chapterList: ChaptersResponse = JSON.parse(
                chapterListResponse.data ?? '[]'
            )
            return chapterList.data.chapters.map((chapter) =>
                App.createChapter({
                    id: chapter.slug,
                    name: chapter.name,
                    chapNum: chapter.chapter_number,
                    time: new Date(chapter.updated_at),
                    langCode: '🇬🇧'
                })
            )
        }

        return manga.chapters.map((chapter) =>
            App.createChapter({
                id: chapter.slug,
                name: chapter.name,
                chapNum: chapter.chapterNumber,
                time: new Date(chapter.updatedAt),
                langCode: '🇬🇧'
            })
        )
    }
    async getChapterDetails(
        mangaId: string,
        chapterId: string
    ): Promise<ChapterDetails> {
        const data = await this.fetchNextData<ChapterResponse>(
            `${mangaId}/${chapterId}.json`
        )
        const chapter = data.pageProps.initialChapter

        return App.createChapterDetails({
            id: chapter.slug,
            mangaId,
            pages: chapter.images
        })
    }
    async getSearchResults(
        query: SearchRequest,
        metadata?: PaginationMetadata
    ): Promise<PagedResults> {
        const page = metadata?.page ?? 1
        const urlBuilder = new URLBuilder(API_DOMAIN_URL)
            .addPathComponent('titles')
            .addPathComponent('search')
            .addQueryParameter('page', page.toString())
            .addQueryParameter('limit', '24')

        const tagSectionsById = this.TAG_SECTIONS.reduce(
            (sections, section) => {
                sections[section.id] = new Set(
                    section.tags.map((tag) => tag.id)
                )
                return sections
            },
            {} as Record<string, Set<string>>
        )
        const knownStaticTagIds = new Set(
            Object.values(tagSectionsById).flatMap((tagIds) => [...tagIds])
        )

        const getTagIdsForSection = (
            tags: Tag[],
            sectionId: string
        ): string[] => {
            const sectionTagIds = tagSectionsById[sectionId]
            if (!sectionTagIds) {
                return []
            }

            return tags
                .map((tag) => tag.id)
                .filter((tagId) => sectionTagIds.has(tagId))
        }
        // TODO: Fix this if there will be more dynamically fetched tag sections in the future.
        const getGenreTagIds = (tags: Tag[]): string[] => {
            return tags
                .map((tag) => tag.id)
                .filter((tagId) => !knownStaticTagIds.has(tagId))
        }

        const sortBy = getTagIdsForSection(query.includedTags, 'sortBy')[0]
        if (sortBy) {
            urlBuilder.addQueryParameter('sort', sortBy)
        }

        const contentRating = getTagIdsForSection(
            query.includedTags,
            'contentRating'
        )[0]
        if (contentRating) {
            urlBuilder.addQueryParameter('content_rating', contentRating)
        }

        const types = getTagIdsForSection(query.includedTags, 'type')
        if (types.length > 0) {
            urlBuilder.addQueryParameter('type', types.join(','))
        }

        const demographics = getTagIdsForSection(
            query.includedTags,
            'demographic'
        )
        if (demographics.length > 0) {
            urlBuilder.addQueryParameter('demographic', demographics.join(','))
        }

        const statuses = getTagIdsForSection(query.includedTags, 'status')
        if (statuses.length > 0) {
            urlBuilder.addQueryParameter('status', statuses.join(','))
        }

        const includedGenres = getGenreTagIds(query.includedTags)
        if (includedGenres.length > 0) {
            urlBuilder.addQueryParameter('genres', includedGenres.join(','))
        }

        const excludedGenres = getGenreTagIds(query.excludedTags)
        if (excludedGenres.length > 0) {
            urlBuilder.addQueryParameter('exclude', excludedGenres.join(','))
        }

        const minChapterCount = query.parameters.min_ch
        if (minChapterCount !== undefined && minChapterCount !== '') {
            const parsedMinChapterCount = Number(minChapterCount)
            if (Number.isNaN(parsedMinChapterCount)) {
                throw new Error(
                    'Invalid input for Minimum Chapter Count. Please enter a valid number.'
                )
            }

            urlBuilder.addQueryParameter(
                'min_ch',
                parsedMinChapterCount.toString()
            )
        }

        const author = query.parameters.author?.toString().trim()
        if (author) {
            urlBuilder.addQueryParameter('author', encodeURIComponent(author))
        }

        // Explicitly reduce to 200 characters to prevent serverside error constraint of max 200 character query (but it really is 52 characters???)
        const title = query.title?.trim().slice(0, 50)
        if (title) {
            urlBuilder.addQueryParameter('q', encodeURIComponent(title))
        }

        const response = await this.requestManager.schedule(
            App.createRequest({
                method: 'GET',
                url: urlBuilder.build(),
                headers: {
                    origin: BASE_URL,
                    referer: `${BASE_URL}/search`
                }
            }),
            1
        )
        const data: SearchResponse = JSON.parse(response.data ?? '{}')
        if (response.status === 400) {
            throw new Error(data.message || 'Unknown error.')
        }

        const pagination = data.data.pagination

        return App.createPagedResults({
            results: data.data.items.map((item) =>
                App.createPartialSourceManga({
                    mangaId: item.slug,
                    title: item.name,
                    image: item.cover,
                    subtitle: item.latest_chapters[0]
                        ? `Ch. ${item.latest_chapters[0].chapter_number}`
                        : item.status
                })
            ),
            metadata: pagination.has_next
                ? {
                      ...pagination,
                      page: pagination.page + 1
                  }
                : undefined
        })
    }
    async getSearchTags?(): Promise<TagSection[]> {
        const tagSections: TagSection[] = [...this.TAG_SECTIONS]
        /// Genres
        const genresResponse = await this.requestManager.schedule(
            App.createRequest({
                method: 'GET',
                url: `${API_DOMAIN_URL}/genres`
            }),
            1
        )
        const genresData: GenresResponse = JSON.parse(
            genresResponse.data ?? '{}'
        )
        const genreTags: Tag[] = []
        genresData.data.items.forEach((genre) => {
            // check if tag is already present in tagSections, skip it
            if (
                tagSections.some((section) =>
                    section.tags.some((tag) => tag.id === genre.slug)
                )
            ) {
                return
            }
            genreTags.push(
                App.createTag({
                    id: genre.slug,
                    label: genre.name
                })
            )
        })
        tagSections.push(
            App.createTagSection({
                id: 'genres',
                label: 'Genres',
                tags: genreTags
            })
        )
        ///
        return tagSections
    }
    async getSearchFields?(): Promise<SearchField[]> {
        return this.SEARCH_FIELDS
    }
    async supportsTagExclusion?(): Promise<boolean> {
        return true
    }
    async supportsSearchOperators?(): Promise<boolean> {
        return false
    }
}
