export interface LatestUpdatesProps {
    chapters: Chapter[]
    fallbackSeries: any[]
}

interface Chapter {
    id: number
    name: string
    number: number
    title?: string
    published_at: string
    time_ago: string
    comic_name: string
    comic_slug: string
    comic_public_url: string
    comic_cover: string
    type: string
    is_premium: boolean
    early_access_until?: string
}
