export interface ChapterReaderProps {
    seriesSlug: string
    seriesId: number
    seriesName: string
    seriesCover: string
    chapterId: number
    chapterName: string
    chapterNumber: number
    chapterTitle: string
    pages: Page[]
    prevChapter: PrevChapter
    nextChapter: NextChapter
    chapterList: ChapterList[]
    commentsEnabled: boolean
    recommendedSeries: any[]
    commentCount: number
    isLocked: boolean
    unlockTime: any
    linkedNovel: LinkedNovel
}

interface Page {
    url: string
    width: number
    height: number
}

interface PrevChapter {
    id: number
    series_id: number
    number: number
    title: string
    slug: string
    page_count: number
    is_premium: boolean
    comments_enabled: boolean
    view_count: number
    created_at: string
}

interface NextChapter {
    id: number
    series_id: number
    number: number
    title: string
    slug: string
    page_count: number
    is_premium: boolean
    comments_enabled: boolean
    view_count: number
    created_at: string
}

interface ChapterList {
    id: number
    series_id: number
    number: number
    title?: string
    slug: string
    page_count: number
    is_premium: boolean
    comments_enabled: boolean
    view_count: number
    created_at: string
}

interface LinkedNovel {
    id: number
    title: string
    slug: string
    description: string
    cover_url: string
    price_cents: number
    series_id: number
    status: string
    author: string
    chapter_count: number
    genres: string[]
    rating: number
    rating_count: number
    created_at: string
    updated_at: string
}
