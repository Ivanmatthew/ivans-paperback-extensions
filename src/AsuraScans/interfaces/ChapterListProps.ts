export interface ChapterListProps {
    chapters: Chapter[]
    seriesSlug: string
    totalChapters: number
    coverUrl: string
    publicUrl: string
}

export interface Chapter {
    id: number
    series_id: number
    number: number
    title?: string
    slug: string
    page_count: number
    is_premium: boolean
    comments_enabled: boolean
    early_access_until?: string
    published_at: string
    view_count: number
    created_at: string
    series_slug: string
    is_locked: boolean
    unlock_time?: string
    time_ago: string
}
