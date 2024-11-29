import { HomeSection, HomeSectionType, Tag } from '@paperback/types'

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

// TODO: auto-fetch and store the preslug content.
const preSlugContent = 'r2311170'

// TODO: make a more cleaner protocol for spreading slugs, titles and ids.
// The target convention is kebab case, e.g. "this-is-a-id"
export function getSlugFromTitle(title: string): string {
    return (
        preSlugContent +
        '-' +
        title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/-s-/, 's-')
            .replace(/-ll-/, 'll-')
    )
}
// Currently an approximation
export function getTitleFromSlug(slug: string): string {
    return slug
        .replace(preSlugContent + '-', '')
        .replace(/-/g, ' ')
        .replace('s-', 's ')
        .replace('ll-', 'll ')
}
// Currently this function is ambiguous, as it converts supposedly "IDs", "slugs" and "titles" to a single format.
// Instead, opt in for getIdFromSlug or getIdFromTitle and then cleanId if necessary, food for thought for the TODO.
export function cleanId(slug: string): string {
    const test = slug
        .replace(/\/$/, '')
        .split('/')
        .pop()!
        // .replace(/\s/g, '-')
        .replace(preSlugContent + '-', '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-s-/, 's-')
        .replace(/-ll-/, 'll-')

    console.log(`${slug} -> ${test}`)

    return test
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