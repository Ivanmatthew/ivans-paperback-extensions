import type { Tag } from '@paperback/types'

const TAG_SEPARATORS = ['|', ':PB:', ':09C:']

export function identifyTagSeparator(tagId: string): string | undefined {
    for (const separator of TAG_SEPARATORS) {
        if (tagId.includes(separator)) {
            return separator
        }
    }
    return undefined
}

export function getTagsOfSection(tags: Tag[], section: string): Tag[] {
    return tags.filter((tag) => {
        const separator = identifyTagSeparator(tag.id)
        if (!separator) {
            throw new Error(`Unknown tag format: ${tag.id}`)
        }
        const tagSection = tag.id.split(separator)[0]
        return tagSection === section
    })
}
export function pickTag(
    tags: Tag[],
    section: string,
    limit?: number,
    tagSectionName?: string
): Tag | undefined {
    const sectionTags = getTagsOfSection(tags, section)

    if (limit !== undefined && sectionTags.length > limit) {
        throw new Error(
            `Too many tags selected for ${tagSectionName ?? section}. Please select only ${limit}, not ${sectionTags.length}.`
        )
    }

    return sectionTags.length > 0 ? sectionTags[0] : undefined
}
export function cleanTagId(tagId: string): string {
    const separator = identifyTagSeparator(tagId)
    if (!separator) {
        return tagId
    }
    const parts = tagId.split(separator)
    return parts.length > 1 ? parts[1]! : tagId
}
