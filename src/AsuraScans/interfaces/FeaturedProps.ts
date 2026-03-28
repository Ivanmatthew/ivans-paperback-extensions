export interface FeaturedProps {
    items: Item[]
}

interface Item {
    id: number
    slug: string
    title: string
    cover_url: string
    banner_url?: string
    description: string
    status: string
    type: string
    view_count: number
    chapter_count: number
    rating: number
    last_chapter_at: string
    is_featured: boolean
    genres: Genre[]
    public_url: string
    source_url: string
}

interface Genre {
    id: number
    name: string
    slug: string
}
