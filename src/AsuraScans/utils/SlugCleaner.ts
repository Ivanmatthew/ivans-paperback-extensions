const DIRTY_SLUG_REGEX = /-[a-zA-Z]\d{7}$/

function isDirtySlug(slug: string): boolean {
    return DIRTY_SLUG_REGEX.test(slug)
}

export function cleanSlug(slug: string): string {
    // In the test phase, I still want to retain some logging to see
    // whether the slug behavior is inconsistent
    //
    // For later stages, it can be a one-liner slug.replace...
    if (!isDirtySlug(slug)) {
        console.warn(`Slug "${slug}" does not match the dirty slug pattern.`)
        return slug
    }

    return slug.replace(DIRTY_SLUG_REGEX, '')
}
