import {
    Chapter,
    ChapterDetails,
    SourceManga,
    PartialSourceManga,
    TagSection,
    Tag,
    HomeSectionType,
    HomeSection,
    SourceStateManager
} from '@paperback/types'

import { decode as decodeHTMLEntity } from 'html-entities'
import type { CheerioAPI } from 'cheerio'

import { reviveProps } from './utils/PropsReviver'
import {
    FeaturedProps,
    LatestUpdatesProps,
    TrendingProps,
    ChapterListProps,
    ChapterReaderProps,
    BrowseFiltersProps,
    CreatorsData
} from './interfaces'

function retrieveProps($: CheerioAPI, selector: string): any | undefined {
    const rawProps = $(selector).attr('props')
    if (!rawProps) {
        console.warn(`Couldn't find props for selector: ${selector}`)
        return undefined
    }
    const props = reviveProps(rawProps)
    if (!props) {
        console.warn(`Invalid props for selector: ${selector}`)
        return undefined
    }

    return props
}

export const HOME_SECTIONS = [
    {
        id: 'featured',
        title: 'Featured',
        containsMoreItems: false,
        type: HomeSectionType.singleRowLarge,
        parser: ($: CheerioAPI): PartialSourceManga[] => {
            const selector = `astro-island[opts='{"name":"HeroCarouselEmbla","value":true}']`
            const items: PartialSourceManga[] = []

            const props: FeaturedProps | undefined = retrieveProps($, selector)
            if (!props) {
                console.warn(`Failed to retrieve props for featured section.`)
                return items
            }

            for (const item of props.items) {
                // if public_url, then
                // const slug = cleanSlug(item.public_url)

                items.push(
                    App.createPartialSourceManga({
                        mangaId: item.slug,
                        title: decodeHTMLEntity(item.title),
                        subtitle: `★ ${item.rating}`,
                        image: item.cover_url
                    })
                )
            }

            return items
        }
    },
    {
        id: 'latest_updates',
        title: 'Latest Updates',
        containsMoreItems: false,
        type: HomeSectionType.singleRowNormal,
        parser: ($: CheerioAPI): PartialSourceManga[] => {
            const selector = `astro-island[opts='{"name":"LatestUpdates","value":true}']`
            const items: PartialSourceManga[] = []

            const props: LatestUpdatesProps | undefined = retrieveProps(
                $,
                selector
            )
            if (!props) {
                console.warn(
                    `Failed to retrieve props for latest updates section.`
                )
                return items
            }
            // The list contains 3 chapters containing the same comic info.
            // It needs to be de-duplicated based on the comic slug.
            // This is the same for all 3 chapters.
            const comics = new Map<
                string,
                LatestUpdatesProps['chapters'][number]
            >()
            for (const chapter of props.chapters) {
                if (!comics.has(chapter.comic_slug)) {
                    comics.set(chapter.comic_slug, chapter)
                } else {
                    const existingChapter = comics.get(chapter.comic_slug)!
                    if (chapter.number > existingChapter.number) {
                        comics.set(chapter.comic_slug, chapter)
                    }
                }
            }

            for (const chapter of comics.values()) {
                const isEarlyAccess = chapter.early_access_until
                    ? new Date(chapter.early_access_until) > new Date()
                    : chapter.is_premium

                items.push(
                    App.createPartialSourceManga({
                        mangaId: chapter.comic_slug,
                        title: decodeHTMLEntity(chapter.comic_name),
                        subtitle: `${isEarlyAccess ? '[Early Access] ' : ''}Ch. ${chapter.number}${chapter.title ? ` - ${decodeHTMLEntity(chapter.title)}` : ''}`,
                        image: chapter.comic_cover
                    })
                )
            }

            return items
        }
    },
    {
        id: 'trending_today',
        title: 'Trending Today',
        containsMoreItems: false,
        type: HomeSectionType.singleRowNormal,
        parser: ($: CheerioAPI): PartialSourceManga[] => {
            const selector = `astro-island[opts='{"name":"TrendingSection","value":true}']`
            const items: PartialSourceManga[] = []

            const props: TrendingProps | undefined = retrieveProps($, selector)
            if (!props) {
                console.warn(
                    `Failed to retrieve props for popular today section.`
                )
                return items
            }

            for (const item of props.items) {
                const formattedViewCount = Intl.NumberFormat('en-US', {
                    notation: 'compact',
                    maximumFractionDigits: 1
                }).format(item.view_count)

                items.push(
                    App.createPartialSourceManga({
                        mangaId: item.slug,
                        title: decodeHTMLEntity(item.title),
                        subtitle: `${formattedViewCount} views`,
                        image: item.cover_url
                    })
                )
            }

            return items
        }
    }
]

export const parseHomeSections = async (
    source: { getLatestUpdatesViewMoreState: () => Promise<boolean> },
    $: CheerioAPI,
    sectionCallback: (section: HomeSection) => void
): Promise<void> => {
    HOME_SECTIONS.forEach(async (section) => {
        const { parser, ...homeSectionInfo } = section

        const homeSection = App.createHomeSection(homeSectionInfo)
        sectionCallback(homeSection)
        homeSection.items = parser($)
        if (homeSection.id === 'latest_updates') {
            if (homeSection.items.length !== 0) {
                homeSection.containsMoreItems =
                    await source.getLatestUpdatesViewMoreState()

                sectionCallback(homeSection)
            }
        } else {
            sectionCallback(homeSection)
        }
    })
}

export const parseMangaDetails = async (
    $: CheerioAPI,
    mangaId: string
): Promise<SourceManga> => {
    const title = decodeHTMLEntity(
        $(
            "h1[class='text-xl lg:text-[32px] font-semibold leading-tight']"
        ).text()
    )
    const altTitles = $('#alt-titles')
        .text()
        .split('•')
        .map((t) => decodeHTMLEntity(t.trim()))
    const titles = altTitles.length > 0 ? [title, ...altTitles] : [title]

    const image =
        $("div[class*='z-0'] img[class='w-full h-full object-cover']").attr(
            'src'
        ) ?? ''

    const rawStatus = $('.text-base.capitalize').text().trim()
    const statusTagInfo = Object.values(STATUS_TAGS_INFO).find(
        (status) => status.label.toLowerCase() === rawStatus.toLowerCase()
    )
    if (!statusTagInfo) {
        // Could be one that can not be searched with i.e. "seasonal" so no error
        console.warn(`Unknown status "${rawStatus}" for mangaId: ${mangaId}`)
    }
    const statusTagSection = statusTagInfo
        ? App.createTagSection({
              id: TAG_SECTION_IDS.STATUS,
              label: 'Status',
              tags: [App.createTag(statusTagInfo)]
          })
        : undefined

    const author = $(
        'html > body > div > main > div > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div > div:nth-of-type(3) > div:nth-of-type(1) > a'
    )
        .text()
        .trim()
    const authorTagSection = App.createTagSection({
        id: TAG_SECTION_IDS.AUTHORS,
        label: 'Authors',
        tags: [
            App.createTag({
                id: TAG_SECTION_IDS.AUTHORS + '|' + encodeURIComponent(author),
                label: author
            })
        ]
    })

    const artist = $(
        'html > body > div > main > div > div:nth-of-type(4) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div > div:nth-of-type(3) > div:nth-of-type(2) > a'
    )
        .text()
        .trim()
    const artistTagSection = App.createTagSection({
        id: TAG_SECTION_IDS.ARTISTS,
        label: 'Artists',
        tags: [
            App.createTag({
                id: TAG_SECTION_IDS.ARTISTS + '|' + encodeURIComponent(artist),
                label: artist
            })
        ]
    })

    const description = $('#description-text').text().trim()

    // Children are anchor tags with genre names.
    const genres = $("div[class='hidden lg:flex max-w-full gap-2 flex-wrap'] a")
        .map((i, el) => {
            const genre = $(el).text().trim()
            const genreId = el.attribs['href']?.split('=').pop() ?? genre
            return App.createTag({
                id: TAG_SECTION_IDS.GENRES + '|' + encodeURIComponent(genreId),
                label: genre
            })
        })
        .get()
    const genresTagSection = App.createTagSection({
        id: TAG_SECTION_IDS.GENRES,
        label: 'Genres',
        tags: genres
    })

    const rawType = $('.text-base.uppercase').text().trim()
    const typeTagInfo = TYPE_TAGS_INFO.find(
        (type) => type.label.toLowerCase() === rawType.toLowerCase()
    )
    if (!typeTagInfo) {
        throw new Error(`Unknown type "${rawType}" for mangaId: ${mangaId}`)
    }
    const typeTagSection = App.createTagSection({
        id: TAG_SECTION_IDS.TYPES,
        label: 'Types',
        tags: [App.createTag(typeTagInfo)]
    })

    const tagSections = [genresTagSection]
    if (statusTagSection) {
        tagSections.push(statusTagSection)
    }
    tagSections.push(typeTagSection, authorTagSection, artistTagSection)

    return App.createSourceManga({
        id: mangaId,
        mangaInfo: App.createMangaInfo({
            titles: titles,
            image: image,
            status:
                statusTagInfo?.label ??
                rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1),
            author: decodeHTMLEntity(author),
            artist: decodeHTMLEntity(artist),
            tags: tagSections,
            desc: decodeHTMLEntity(description)
        })
    })
}

export const parseChapters = ($: CheerioAPI, mangaId: string): Chapter[] => {
    const props: ChapterListProps | undefined = retrieveProps(
        $,
        `astro-island[opts='{"name":"ChapterListReact","value":true}']`
    )

    if (!props) {
        throw new Error(`Couldn't find chapters for mangaId: ${mangaId}!`)
    }

    const chapters: Chapter[] = []
    for (const chapter of props.chapters) {
        const isEarlyAccess = chapter.early_access_until
            ? new Date(chapter.early_access_until) > new Date()
            : chapter.is_locked
        if (isEarlyAccess) {
            continue
        }

        chapters.push(
            App.createChapter({
                id: String(chapter.number),
                name: `Ch. ${chapter.number}${chapter.title ? ` - ${decodeHTMLEntity(chapter.title)}` : ''}`,
                chapNum: chapter.number,
                time: new Date(chapter.published_at),
                langCode: '🇺🇸'
            })
        )
    }
    return chapters
}

export const parseChapterDetails = async (
    $: CheerioAPI,
    mangaId: string,
    chapterId: string
): Promise<ChapterDetails> => {
    const props: ChapterReaderProps | undefined = retrieveProps(
        $,
        `astro-island[opts='{"name":"ChapterReader","value":true}']`
    )

    if (!props) {
        throw new Error(
            `Couldn't find chapter details for mangaId: ${mangaId}, chapterId: ${chapterId}!`
        )
    }

    return App.createChapterDetails({
        id: chapterId,
        mangaId: mangaId,
        pages: props.pages.map((page) => page.url)
    })
}

export const TAG_SECTION_IDS = {
    GENRES: '0',
    STATUS: '1',
    TYPES: '2',
    ORDER: '3',
    ARTISTS: '4',
    AUTHORS: '5'
}

function parseGenres($: CheerioAPI): Tag[] {
    const props: BrowseFiltersProps | undefined = retrieveProps(
        $,
        `astro-island[opts='{"name":"BrowseFilters","value":true}']`
    )

    if (!props) {
        throw new Error(`Couldn't find genres tags!`)
    }

    return props.availableGenres.map((genre) =>
        App.createTag({
            id: TAG_SECTION_IDS.GENRES + '|' + genre.slug,
            label: genre.name
        })
    )
}

const STATUS_TAGS_INFO = [
    {
        id: TAG_SECTION_IDS.STATUS + '|' + 'ongoing',
        label: 'Ongoing'
    },
    {
        id: TAG_SECTION_IDS.STATUS + '|' + 'completed',
        label: 'Completed'
    },
    {
        id: TAG_SECTION_IDS.STATUS + '|' + 'hiatus',
        label: 'Hiatus'
    },
    {
        id: TAG_SECTION_IDS.STATUS + '|' + 'dropped',
        label: 'Dropped'
    }
]
const TYPE_TAGS_INFO = [
    {
        id: TAG_SECTION_IDS.TYPES + '|' + 'manga',
        label: 'Manga'
    },
    {
        id: TAG_SECTION_IDS.TYPES + '|' + 'manhwa',
        label: 'Manhwa'
    },
    {
        id: TAG_SECTION_IDS.TYPES + '|' + 'manhua',
        label: 'Manhua'
    }
]
const ORDER_TAGS_INFO = [
    {
        id: TAG_SECTION_IDS.ORDER + '|' + 'asc',
        label: 'Ascending'
    },
    {
        id: TAG_SECTION_IDS.ORDER + '|' + 'desc',
        label: 'Descending'
    }
]

export const parseTags = (
    $genresResponse: CheerioAPI,
    creators: CreatorsData
): TagSection[] => {
    const genresTags = parseGenres($genresResponse)
    const artistsTags = creators.data.artists.map((artist) =>
        App.createTag({
            id: TAG_SECTION_IDS.ARTISTS + '|' + encodeURIComponent(artist),
            label: artist
        })
    )
    const authorTags = creators.data.authors.map((author) =>
        App.createTag({
            id: TAG_SECTION_IDS.AUTHORS + '|' + encodeURIComponent(author),
            label: author
        })
    )
    const statusTags = STATUS_TAGS_INFO.map((status) => App.createTag(status))
    const typeTags = TYPE_TAGS_INFO.map((type) => App.createTag(type))
    const orderTags = ORDER_TAGS_INFO.map((order) => App.createTag(order))

    const tagSections: TagSection[] = [
        // Tag section for genres
        App.createTagSection({
            id: TAG_SECTION_IDS.GENRES,
            label: 'Genres',
            tags: genresTags
        }),
        // Tag section for status
        App.createTagSection({
            id: TAG_SECTION_IDS.STATUS,
            label: 'Status',
            tags: statusTags
        }),
        // Tag section for types
        App.createTagSection({
            id: TAG_SECTION_IDS.TYPES,
            label: 'Types',
            tags: typeTags
        }),
        // Tag section for order
        App.createTagSection({
            id: TAG_SECTION_IDS.ORDER,
            label: 'Order',
            tags: orderTags
        }),
        // Tag section for artists
        App.createTagSection({
            id: TAG_SECTION_IDS.ARTISTS,
            label: 'Artists',
            tags: artistsTags
        }),
        // Tag section for authors
        App.createTagSection({
            id: TAG_SECTION_IDS.AUTHORS,
            label: 'Authors',
            tags: authorTags
        })
    ]

    return tagSections
}
