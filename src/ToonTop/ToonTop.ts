import {
    ContentRating,
    SourceInfo,
    BadgeColor,
    SourceIntents
} from '@paperback/types'

import { MangaKBase } from '@template/MangaK/MangaKBase'

const DOMAIN = 'https://toontop.io'

export const ToonTopInfo: SourceInfo = {
    version: '2.2.0',
    name: 'ToonTop',
    description: `Extension that pulls manga from ${DOMAIN}`,
    author: 'IvanMatthew',
    authorWebsite: 'https://github.com/Ivanmatthew',
    icon: 'icon.png',
    contentRating: ContentRating.ADULT,
    websiteBaseURL: DOMAIN,
    sourceTags: [
        {
            text: '18+',
            type: BadgeColor.YELLOW
        }
    ],
    intents:
        SourceIntents.MANGA_CHAPTERS |
        SourceIntents.HOMEPAGE_SECTIONS
}

export class ToonTop extends MangaKBase {
    baseUrl: string = DOMAIN
    apiUrl: string = 'https://api.toontop.io'
}
