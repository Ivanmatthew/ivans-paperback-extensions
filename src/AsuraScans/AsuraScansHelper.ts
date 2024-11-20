import { Tag } from '@paperback/types'

export function getIncludedTagBySection(section: string, tags: Tag[]): any {
    return (
        tags
            ?.find((x: Tag) => x.id.startsWith(`${section}:`))
            ?.id.replace(`${section}:`, '') ?? ''
    ).replace(' ', '+')
}

export function getFilterTagsBySection(section: string, tags: Tag[]): string[] {
    return tags
        ?.filter((x: Tag) => x.id.startsWith(`${section}:`))
        .map((x: Tag) => {
            return x.id.replace(`${section}:`, '')
        })
}

export function recurseParseJSON(value: string | object): string | object {
    if (typeof value === 'string') {
        try {
            const json = JSON.parse(value)
            return recurseParseJSON(json)
        } catch (error) {
            return value
        }
    } else if (typeof value === 'object') {
        for (const key in value) {
            ;(value as { [key: string]: any })[key] = recurseParseJSON(
                (value as { [key: string]: any })[key]
            )
        }
    } else if (Array.isArray(value)) {
        ;(value as []).forEach((element, index) => {
            ;(value as any[])[index] = recurseParseJSON(element)
        })
    }

    return value
}
