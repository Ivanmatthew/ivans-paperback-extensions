export interface SeriesData {
    data: Series[] | null
    meta: Meta
}

interface Series {
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

interface Meta {
    total?: number
    per_page: number
    has_more?: boolean
}
