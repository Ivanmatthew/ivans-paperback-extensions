export interface BrowseFiltersProps {
    initialQuery: string
    initialGenres: any[]
    initialAuthor: string
    initialArtist: string
    initialStatus: string
    initialType: string
    initialOrder: string
    initialSortDirection: string
    totalCount: number
    availableGenres: AvailableGenre[]
    initialSeries: InitialSeries[]
    initialTotalPages: number
    initialCurrentPage: number
}

interface AvailableGenre {
    id: number
    name: string
    slug: string
}

interface InitialSeries {
    id: number
    slug: string
    title: string
    alt_titles?: string[]
    description: string
    cover: string
    banner?: string
    status: string
    type: string
    author: string
    artist: string
    popularity_rank: number
    bookmark_count: number
    rating: number
    chapter_count: number
    last_chapter_at: string
    created_at: string
    updated_at: string
    public_url: string
    source_url: string
    genres: Genre[]
    latest_chapters: LatestChapter[]
    release_year?: number
}

interface Genre {
    id: number
    name: string
    slug: string
}

interface LatestChapter {
    id: number
    series_id: number
    number: number
    slug: string
    page_count: number
    is_premium: boolean
    comments_enabled: boolean
    early_access_until?: string
    published_at: string
    view_count: number
    created_at: string
    title?: string
}
