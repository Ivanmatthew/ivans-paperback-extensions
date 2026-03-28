import type { Tag } from '@paperback/types'

export function getTagsOfSection(tags: Tag[], section: string): Tag[] {
    return tags.filter((tag) => {
        const tagSection = tag.id.split('|')[0]
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
    const parts = tagId.split('|')
    return parts.length > 1 ? parts[1]! : tagId
}
