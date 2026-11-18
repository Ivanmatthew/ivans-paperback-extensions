import {
    ContentRating,
    SourceInfo,
    BadgeColor,
    SourceIntents,
    DUISection
} from '@paperback/types'

import { MangaKBase } from '@template/MangaK/MangaKBase'

const DOMAIN = 'https://toontop.io'

export const ToonTopInfo: SourceInfo = {
    version: '0.1.0',
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
        SourceIntents.HOMEPAGE_SECTIONS | SourceIntents.SETTINGS_UI
}

export class ToonTop extends MangaKBase {
    baseUrl: string = DOMAIN
    apiUrl: string = 'https://api.toontop.io'

    protected override async additionalContentSettings(): Promise<DUISection[]> {
        return [App.createDUISection({
            id: 'matureGenreSettings',
            isHidden: false,
            footer: 'ToonTop does not always tag content ratings correctly. Filter the Mature genre for stricter NSFW protection. Untagged NSFW content may still appear.',
            rows: async () => [App.createDUISwitch({
                id: 'filterMature',
                label: 'Filter Mature Genre',
                value: App.createDUIBinding({
                    get: async () => (await this.stateManager.retrieve('filterMature')) === true,
                    set: async (value: boolean) => {
                        await this.stateManager.store('filterMature', value)
                    }
                })
            })]
        })]
    }

    protected override async blockedGenres(): Promise<string[]> {
        return (await this.stateManager.retrieve('filterMature')) === true ? ['mature'] : []
    }
}
