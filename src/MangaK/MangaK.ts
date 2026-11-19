import { BadgeColor, ContentRating, SourceInfo, SourceIntents } from '@paperback/types'
import { MangaKBase } from '@template/MangaK/MangaKBase'

const DOMAIN = 'https://mangak.io'

export const MangaKInfo: SourceInfo = {
    version: '0.3.1',
    name: 'MangaK',
    description: 'Extension that pulls manga from MangaK',
    author: 'IvanMatthew',
    authorWebsite: 'https://github.com/Ivanmatthew',
    icon: 'icon.png',
    contentRating: ContentRating.MATURE,
    websiteBaseURL: DOMAIN,
    intents: SourceIntents.MANGA_CHAPTERS | SourceIntents.HOMEPAGE_SECTIONS | SourceIntents.SETTINGS_UI,
    sourceTags: [
        {
            text: '18+',
            type: BadgeColor.YELLOW
        }
    ]
}

export class MangaK extends MangaKBase {
    baseUrl: string = DOMAIN
    apiUrl: string = 'https://api.mangak.io'
}
