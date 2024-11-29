import { Filters } from './interface/Filters'

export async function setFilters(source: any, data: Filters) {
    for (const genre of data.genres) {
        await source.stateManager.store(genre.name.toUpperCase(), genre.id)
    }
}

export async function getFilter(source: any, filter: string): Promise<string> {
    const genre =
        ((await source.stateManager.retrieve(
            filter.toUpperCase()
        )) as string) ?? ''
    return genre.toString()
}

export async function invalidateMangaId(
    source: any,
    id: string
): Promise<void> {
    await source.stateManager.store(id, null)
}

export async function getMangaId(source: any, slug: string): Promise<string> {
    const id = idCleaner(slug) + '-'

    return id

    // const gotSlug = ((await source.stateManager.retrieve(id)) as string) ?? ''
    // if (!gotSlug) {
    //     await source.stateManager.store(id, slug)
    //     return slug
    // } else if (idCleaner(gotSlug) !== id) {
    //     await invalidateMangaId(source, id)
    //     return getMangaId(source, slug)
    // }

    // return gotSlug
}

function idCleaner(str: string): string {
    let cleanId: string | null = str
    cleanId = cleanId.replace(/\/$/, '')
    cleanId = cleanId.split('/').pop() ?? null
    // Remove randomised slug part
    cleanId = cleanId?.substring(0, cleanId?.lastIndexOf('-')) ?? null

    if (!cleanId) {
        throw new Error(`Unable to parse id for ${str}`)
    }

    return cleanId
}

export class URLBuilder {
    parameters: Record<string, any | any[]> = {}
    pathComponents: string[] = []
    baseUrl: string

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl.replace(/(^\/)?(?=.*)(\/$)?/gim, '')
    }

    addPathComponent(component: string): URLBuilder {
        this.pathComponents.push(component.replace(/(^\/)?(?=.*)(\/$)?/gim, ''))
        return this
    }

    addQueryParameter(key: string, value: any | any[]): URLBuilder {
        if (Array.isArray(value) && !value.length) {
            return this
        }

        const array = this.parameters[key] as any[]
        if (array?.length) {
            array.push(value)
        } else {
            this.parameters[key] = value
        }
        return this
    }

    buildUrl(
        { addTrailingSlash, includeUndefinedParameters } = {
            addTrailingSlash: false,
            includeUndefinedParameters: false
        }
    ): string {
        let finalUrl = this.baseUrl + '/'

        finalUrl += this.pathComponents.join('/')
        finalUrl += addTrailingSlash ? '/' : ''
        finalUrl += Object.values(this.parameters).length > 0 ? '?' : ''
        finalUrl += Object.entries(this.parameters)
            .map((entry) => {
                if (!entry[1] && !includeUndefinedParameters) {
                    return undefined
                }

                if (Array.isArray(entry[1]) && entry[1].length) {
                    return `${entry[0]}=${entry[1]
                        .map((value) =>
                            value || includeUndefinedParameters
                                ? value
                                : undefined
                        )
                        .filter((x) => x !== undefined)
                        .join(',')}`
                }

                if (typeof entry[1] === 'object') {
                    return Object.keys(entry[1])
                        .map((key) => `${entry[0]}[${key}]=${entry[1][key]}`)
                        .join('&')
                }

                return `${entry[0]}=${entry[1]}`
            })
            .filter((x) => x !== undefined)
            .join('&')

        return finalUrl
    }
}
