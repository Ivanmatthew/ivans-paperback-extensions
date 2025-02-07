import { HomeSection, HomeSectionType, Tag } from '@paperback/types'
import { Configuration } from './Configuration'
import { CheerioAPI } from 'cheerio'

export function createHomeSection(
    id: string,
    title: string,
    containsMoreItems = true,
    type: string = HomeSectionType.singleRowNormal
): HomeSection {
    return App.createHomeSection({
        id,
        title,
        type,
        containsMoreItems
    })
}

export function getIncludedTagBySection(section: string, tags: Tag[]): string {
    return (
        (
            tags
                ?.find((x: Tag) => x.id.startsWith(`${section}:`))
                ?.id.replace(`${section}:`, '') ?? ''
        ).replace(' ', '+') ?? ''
    )
}

export function getFilterTagsBySection(
    section: string,
    tags: Tag[],
    included: boolean,
    supportsExclusion = false
): string[] {
    if (!included && !supportsExclusion) {
        return []
    }

    return tags
        ?.filter((x: Tag) => x.id.startsWith(`${section}:`))
        .map((x: Tag) => {
            let id: string = x.id.replace(`${section}:`, '')
            if (!included) {
                id = encodeURI(`-${id}`)
            }
            return id
        })
}

export function trimUrl(url: string): string {
    url = url.replace(/\/$/, '')
    return url.split('/').pop() ?? ''
}

export function extractVariableValues(
    chapterData: string
): Record<string, string> {
    const variableRegex = /var\s+(\w+)\s*=\s*([\s\S]*?);/g // modified to not only match strings
    const variables: Record<string, string> = {}
    let match

    // thanks past me for this code
    // Under no circumstances directly eval (or Function), as they might go hardy harr-harr sneaky and pull an RCE
    while ((match = variableRegex.exec(chapterData)) !== null) {
        const [, variableName, variableValue] = match as unknown as [
            string,
            string,
            string
        ]
        variables[variableName] = variableValue
    }

    return variables
}

function getRandomString(length: number) {
    return Math.random()
        .toString(36)
        .substring(2, length + 2)
}
function generateLink(
    prefixSlug: string,
    contentType: string,
    seriesId: string,
    chapterId: string | null = null
): string {
    let base =
        `${Configuration.baseUrl}/${prefixSlug}/` +
        getRandomString(4) +
        contentType +
        getRandomString(4) +
        seriesId.toString().padStart(5, '0') +
        getRandomString(4)
    return chapterId
        ? base + chapterId.toString().padStart(6, '0') + getRandomString(4)
        : base + getRandomString(4).repeat(3)
}
export function generateSeriesLink(
    prefixSlug: string,
    seriesId: string
): string {
    return generateLink(prefixSlug, 's', seriesId)
}
export function generateChapterLink(
    prefixSlug: string,
    seriesId: string,
    chapterId: string
): string {
    return generateLink(prefixSlug, 'c', seriesId, chapterId)
}

export function extractLink(link: string): {
    contentType: string
    seriesId: string
    chapterId: string
} {
    const linkRegex = new RegExp(`/\\d+/.{4}(c|s).{4}(.{5}).{4}(.{6}).{4}`)

    const regexResult = linkRegex.exec(link)
    if (!regexResult) {
        throw new Error('[1] Link does not match the expected format: ' + link)
    }

    const [, contentType, seriesId, chapterId] = regexResult

    if (!contentType || !seriesId || !chapterId) {
        throw new Error('[2] Link does not match the expected format: ' + link)
    }

    return {
        contentType,
        seriesId,
        chapterId
    }
}

export function getPrefixSlug($: CheerioAPI): string {
    let responsePrefixSlug = ''
    $('#content script').each((_i, elem) => {
        const text = $(elem).text()
        if (text.includes('var base = "')) {
            const prefixSlugRegex = /var base = \"\/(.*)\/\"/
            const match = text.match(prefixSlugRegex)
            if (match) {
                responsePrefixSlug = match[1] ?? ''
            }
        }
    })

    return responsePrefixSlug
}
