interface BuildParameters {
    addTrailingSlash: boolean
    includeUndefinedParameters: boolean
}
const defaultBuildParameters: BuildParameters = {
    addTrailingSlash: false,
    includeUndefinedParameters: false
}

export class URLBuilder {
    parameters: Record<string, string | string[]> = {}
    pathComponents: string[] = []
    baseUrl: string

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl.replace(/(^\/)?(?=.*)(\/$)?/gim, '')
    }

    addPathComponent(component: string): URLBuilder {
        this.pathComponents.push(component.replace(/(^\/)?(?=.*)(\/$)?/gim, ''))
        return this
    }

    addQueryParameter(key: string, value: string | string[]): URLBuilder {
        if (Array.isArray(value) && (!value.length || value.length === 0)) {
            return this
        }

        const array = this.parameters[key] as string[]
        if (array?.length) {
            if (Array.isArray(value)) {
                array.push(...value)
            }
            else {
                array.push(value)
            }
        } else {
            this.parameters[key] = value
        }
        return this
    }

    build({ addTrailingSlash, includeUndefinedParameters }: BuildParameters = defaultBuildParameters): string {
        let finalUrl = this.baseUrl + '/'

        finalUrl += this.pathComponents.join('/')
        finalUrl += addTrailingSlash
            ? '/'
            : ''
        finalUrl += Object.values(this.parameters).length > 0
            ? '?'
            : ''
        finalUrl += Object.entries(this.parameters).map(entry => {
            if (entry[1] == null && !includeUndefinedParameters) {
                return undefined
            }

            if (Array.isArray(entry[1]) && entry[1].length) {
                return entry[1].map(value => value || includeUndefinedParameters
                    ? `${entry[0]}${encodeURI('[]')}=${value}`
                    : undefined)
                    .filter(x => x !== undefined)
                    .join('&')
            }

            return `${entry[0]}=${entry[1]}`
        }).filter(x => x !== undefined).join('&')

        return finalUrl
    }
}
