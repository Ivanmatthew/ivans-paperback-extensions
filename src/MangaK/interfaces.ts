export interface VersionResponse {
    buildId: string
}

export interface Pagination {
    total: number
    page: number
    limit: number
    total_pages: number
    has_next: boolean
    has_previous: boolean
    next_cursor: string
    total_relation: string
}

interface NextJSInjectedPageProps {
    siteConfig: {
        ads: {
            enabled: boolean
            scripts: Array<any>
            placements: {}
        }
        apiUrl: string
        contentType: string
        content: {
            singular: string
            plural: string
            singularUpper: string
            pluralUpper: string
            unit: string
            unitPlural: string
            unitUpper: string
            unitPluralUpper: string
            action: string
            actionUpper: string
            actionPast: string
            reader: string
        }
        features: {
            hasChapters: boolean
            hasEpisodes: boolean
            hasImages: boolean
            hasText: boolean
            hasVideo: boolean
            hasDownload: boolean
            hasOfflineRead: boolean
            hasAudioBook: boolean
            hasSubtitles: boolean
            hasDubbed: boolean
        }
        path: {
            comic: string
            chapter: string
            read: string
            watch: any
            favoriteComic: string
            search: string
            category: string
        }
        resourcesPath: string
        siteName: string
        siteNameShort: string
        siteUrl: string
        siteLogo: string
        siteThumbnail: string
        seo: {
            title: string
            description: string
            keywords: string
            image: string
            url: string
            detailDescription: string
            ongoingDescription: string
            completedDescription: string
            readingDescription: string
            readingDescription2: string
            readingDescription3: string
            homeDescription: string
            readingTip: string
            chapterDescription: string
        }
        analytics: {
            gaId: string
            gtagId: string
        }
        footer: {
            termofservice: string
            dmca: string
            contact: string
            sitemap: string
            description: string
            copyright: string
        }
        i18n: {
            locales: Array<string>
            defaultLocale: string
            localeDetection: boolean
        }
        themeColor: string
        authHub: {
            hubUrl: string
        }
    }
    deviceType: string
    isClientNav: boolean
    _sentryTraceData: string
    _sentryBaggage: string
}
interface NextJSInjectedProps {
    __N_SSP: boolean
}

export interface HomeResponse extends NextJSInjectedProps {
    pageProps: NextJSInjectedPageProps & {
        latest: {
            items: Array<{
                id: string
                url: string
                name: string
                altName: string
                altNames?: Array<{
                    name: string
                }>
                displayAltName: string
                displayRating?: string
                displayViews?: string
                displayBookmarks?: string
                displayChapters?: string
                displayUpdated: string
                displayUpdatedShort: string
                slug: string
                cover: string
                status: string
                rating: number
                updatedAt: string
                addedAt: any
                latestChapters: Array<{
                    id: string
                    name: string
                    url: string
                    slug: string
                    date: string
                    cv: number
                }>
                stats: {
                    views: number
                    bookmarksCount: number
                    commentsCount: number
                    mangaOnlyCommentsCount: number
                    chaptersCount: number
                    ratingsCount: number
                    reviewsCount: number
                }
                isAdult: any
                isNew: boolean
                isHot: boolean
                isDeleted: boolean
                cv: number
                summary: string
                genres: Array<{
                    name: string
                    slug: string
                }>
            }>
            pagination: Pagination
        }
        popularItems: Array<{
            id: string
            url: string
            name: string
            altName: string
            altNames?: Array<{
                name: string
            }>
            displayAltName: string
            displayRating: string
            displayViews: string
            displayBookmarks: string
            displayChapters: string
            displayUpdated: string
            displayUpdatedShort: string
            slug: string
            cover: string
            status: string
            rating: number
            updatedAt: string
            addedAt: any
            latestChapters: Array<{
                id: string
                name: string
                url: string
                slug: string
                date: string
                cv: number
            }>
            stats: {
                views: number
                bookmarksCount: number
                commentsCount: number
                mangaOnlyCommentsCount: number
                chaptersCount: number
                ratingsCount: number
                reviewsCount: number
            }
            isAdult: any
            isNew: boolean
            isHot: boolean
            isDeleted: boolean
            cv: number
            summary: string
            genres: Array<{
                name: string
                slug: string
            }>
        }>
        historyItems: Array<any>
        categories: Array<any>
        trendingItems: Array<{
            id: string
            url: string
            name: string
            altName: string
            altNames?: Array<{ name: string }>
            displayAltName: string
            displayRating: string
            displayViews: string
            displayBookmarks: string
            displayChapters: string
            displayUpdated: string
            displayUpdatedShort: string
            slug: string
            cover: string
            status: string
            rating: number
            updatedAt: string
            addedAt: any
            latestChapters: Array<any>
            stats: {
                views: number
                bookmarksCount: number
                commentsCount: number
                mangaOnlyCommentsCount: number
                chaptersCount: number
                ratingsCount: number
                reviewsCount: number
            }
            isAdult: any
            isNew: boolean
            isHot: boolean
            isDeleted: boolean
            cv: number
            summary: string
        }>
        risingItems: Array<{
            id: string
            url: string
            name: string
            altName: string
            altNames?: Array<{ name: string }>
            displayAltName: string
            displayRating?: string
            displayViews: string
            displayBookmarks: string
            displayChapters: any
            displayUpdated: any
            displayUpdatedShort: any
            slug: string
            cover: string
            status: string
            rating: number
            updatedAt: any
            addedAt: any
            latestChapters: Array<any>
            stats: {
                views: number
                bookmarksCount: number
                commentsCount: number
                mangaOnlyCommentsCount: number
                chaptersCount: number
                ratingsCount: number
                reviewsCount: number
            }
            isAdult: any
            isNew: boolean
            isHot: boolean
            isDeleted: boolean
            cv: number
        }>
        heroItems: Array<{
            id: string
            url: string
            name: string
            altName: string
            altNames?: Array<{ name: string }>
            displayAltName: string
            displayRating: string
            displayViews: string
            displayBookmarks: string
            displayChapters: string
            displayUpdated: string
            displayUpdatedShort: string
            slug: string
            cover: string
            status: string
            rating: number
            updatedAt: string
            addedAt: any
            latestChapters: Array<any>
            stats: {
                views: number
                bookmarksCount: number
                commentsCount: number
                mangaOnlyCommentsCount: number
                chaptersCount: number
                ratingsCount: number
                reviewsCount: number
            }
            isAdult: any
            isNew: boolean
            isHot: boolean
            isDeleted: boolean
            cv: number
            summary: string
        }>
        topUpdateItems: Array<{
            id: string
            url: string
            name: string
            altName: string
            altNames?: Array<{ name: string }>
            displayAltName: string
            displayRating: any
            displayViews: string
            displayBookmarks: string
            displayChapters: string
            displayUpdated: any
            displayUpdatedShort: any
            slug: string
            cover: string
            status: string
            rating: any
            updatedAt: any
            addedAt: any
            latestChapters: Array<any>
            stats: {
                views: number
                bookmarksCount: number
                commentsCount: number
                mangaOnlyCommentsCount: number
                chaptersCount: number
                ratingsCount: number
                reviewsCount: number
            }
            isAdult: any
            isNew: boolean
            isHot: boolean
            isDeleted: boolean
            cv: number
        }>
    }
}

export interface LatestResponse extends NextJSInjectedProps {
    pageProps: NextJSInjectedPageProps & {
        isSSR: boolean
        items: Array<{
            id: string
            url: string
            name: string
            altName: string
            altNames?: Array<{
                name: string
            }>
            displayAltName: string
            displayRating?: string
            displayViews?: string
            displayBookmarks?: string
            displayChapters?: string
            displayUpdated: string
            displayUpdatedShort: string
            slug: string
            cover: string
            status: string
            rating: number
            updatedAt: string
            addedAt: any
            latestChapters: Array<{
                id: string
                name: string
                url: string
                slug: string
                date: string
                cv: number
            }>
            stats: {
                views: number
                bookmarksCount: number
                commentsCount: number
                mangaOnlyCommentsCount: number
                chaptersCount: number
                ratingsCount: number
                reviewsCount: number
            }
            isAdult: any
            isNew: boolean
            isHot: boolean
            isDeleted: boolean
            cv: number
            summary: string
            genres: Array<{
                name: string
                slug: string
            }>
        }>
        pagination: Pagination
    }
}

export interface TrendingDayResponse extends NextJSInjectedProps {
    pageProps: NextJSInjectedPageProps & {
        type: string
        initialItems: Array<{
            id: string
            url: string
            name: string
            altName: string
            altNames?: Array<{
                name: string
            }>
            displayAltName: string
            displayRating?: string
            displayViews: string
            displayBookmarks: string
            displayChapters: string
            displayUpdated: string
            displayUpdatedShort: string
            slug: string
            cover: string
            status: string
            rating: number
            updatedAt: string
            addedAt: any
            latestChapters: Array<{
                id: string
                name: string
                url: string
                slug: string
                date: string
                cv: number
            }>
            stats: {
                views: number
                bookmarksCount: number
                commentsCount: number
                mangaOnlyCommentsCount: number
                chaptersCount: number
                ratingsCount: number
                reviewsCount: number
            }
            isAdult: any
            isNew: boolean
            isHot: boolean
            isDeleted: boolean
            cv: number
            summary: string
            genres?: Array<{
                name: string
                slug: string
            }>
        }>
        initialPagination: Pagination
    }
}

export interface MangaResponse extends NextJSInjectedProps {
    pageProps: NextJSInjectedPageProps & {
        initialManga: {
            id: string
            url: string
            name: string
            altName: string
            altNames?: Array<{
                name: string
                language: string
            }>
            displayAltName: string
            displayRating: string
            displayViews: string
            displayBookmarks: string
            displayChapters: string
            displayUpdated: string
            displayUpdatedShort: string
            slug: string
            cover: string
            status: string
            rating: number
            updatedAt: string
            addedAt: any
            latestChapters: Array<{
                id: string
                name: string
                url: string
                slug: string
                date: string
                cv: number
            }>
            stats: {
                views: number
                bookmarksCount: number
                commentsCount: number
                mangaOnlyCommentsCount: number
                chaptersCount: number
                ratingsCount: number
                reviewsCount: number
            }
            isAdult: boolean
            isNew: boolean
            isHot: boolean
            isDeleted: boolean
            cv: number
            summary: string
            authors: Array<{
                name: string
                slug: string
            }>
            genres: Array<{
                name: string
                slug: string
                titles_count: number
            }>
            tags: Array<{
                name: string
                slug: string
            }>
            type: {
                name: string
                slug: string
            }
            releaseDate: string
            contentRating: string
            demographic: any
            demographics: Array<any>
            formats: Array<{
                name: string
                slug: string
            }>
            themes: Array<any>
            artists: Array<{
                name: string
                slug: string
            }>
            volumes: Array<any>
            ratingsCount: number
            ratingStats: {
                average: number
                total: number
                distribution: Array<{
                    rating: number
                    count: number
                    percentage: number
                }>
            }
            chapters: Array<{
                id: string
                realId: string
                name: string
                slug: string
                url: string
                updatedAt: string
                group: any
                views: number
                commentsCount: number
                uploader: any
                cv: number
                chapterNumber: number
            }>
            firstChapter: {
                id: string
                name: string
                url: string
                slug: string
                date: string
                cv: number
            }
            userBookmark: any
            userHistory: any
            userReview: any
        }
        initialError: any
        mangaHsid: string
    }
}

export interface ChapterResponse extends NextJSInjectedProps {
    pageProps: NextJSInjectedPageProps & {
        initialChapter: {
            id: string
            url: string
            name: string
            slug: string
            views: number
            comments_count: number
            updated_at: string
            chapter_number: number
            cv: number
            images: Array<string>
            chapterPages: Array<{
                chapter_id: number
                page_number: number
                storage_key: string
            }>
        }
        initialManga: {
            id: string
            url: string
            name: string
            slug: string
            cover: string
            status: string
            stats: {}
            updated_at: string
            cv: number
            is_new: boolean
            is_hot: boolean
            content_version: number
        }
        nextChapter: {
            id: string
            url: string
            name: string
            slug: string
            updated_at: string
            chapter_number: number
            cv: number
        }
        previousChapter: any
        initialError: any
        mangaHsid: string
        chapterHsid: string
        readerSettings: any
    }
}

interface InjextedAPIFields {
    success: boolean
    message: string
    data: any
}

export interface GenresResponse extends InjextedAPIFields {
    data: {
        items: Array<{
            id: string
            name: string
            slug: string
            titles_count: number
            created_at: string // timestamp in format: 1970-01-30T00:00:00.000Z
            updated_at: string
        }>
    }
}

export interface SearchResponse extends InjextedAPIFields {
    data: {
        items: Array<{
            id: string
            url: string
            name: string
            alt_names?: Array<{
                name: string
            }>
            alt_name?: string
            slug: string
            cover: string
            status: string
            rating: number
            summary: string
            stats: {
                views: number
                bookmarks_count: number
                comments_count: number
                chapters_count: number
                ratings_count: number
                reviews_count: number
                manga_only_comments_count?: number
            }
            updated_at: string
            cv: number
            is_new: boolean
            is_hot: boolean
            latest_chapters: Array<{
                id: string
                url: string
                name: string
                slug: string
                created_at: string
                updated_at: string
                chapter_number: number
                cv: number
            }>
            genres: Array<{
                name: string
                slug: string
            }>
            content_rating?: string
            demographic_ids: Array<number>
            demographic_names: Array<string>
            demographic_slugs: Array<string>
            format_ids: Array<number>
            format_names: Array<string>
            format_slugs: Array<string>
            publisher_ids: Array<any>
            publisher_names: Array<any>
            publisher_slugs: Array<any>
            publisher_icons: Array<any>
            publisher_urls: Array<any>
            tracker_ids: Array<number>
            tracker_names: Array<string>
            tracker_slugs: Array<string>
            tracker_icons: Array<string>
            tracker_urls: Array<string>
            content_version: number
            rating_count?: number
            lists_count?: number
            rating_avg?: number
        }>
        pagination: Pagination
        excluded_genres: Array<string>
    }
}

export interface ChaptersResponse extends InjextedAPIFields {
    data: {
        chapters: Array<{
            id: string
            url: string
            name: string
            slug: string
            views: number
            comments_count: number
            updated_at: string
            chapter_number: number
            cv: number
        }>
    }
}
