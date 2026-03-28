export interface TrendingProps {
    items: Item[]
}

interface Item {
    id: number
    slug: string
    title: string
    cover_url: string
    status: string
    type: string
    view_count: number
    chapter_count: number
    last_chapter_at: string
    genres: Genre[]
    rating: number
    public_url: string
    source_url: string
}

interface Genre {
    id: number
    name: string
    slug: string
}
