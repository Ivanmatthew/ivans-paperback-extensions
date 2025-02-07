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
            } else {
                array.push(value)
            }
        } else {
            this.parameters[key] = value
        }
        return this
    }

    buildQueryParameters(): string {
        if (Object.values(this.parameters).length === 0) {
            return ''
        } else if (Object.values(this.parameters).length === 1) {
            const key: string = Object.keys(this.parameters)[0] as string
            const value = this.parameters[key]

            if (Array.isArray(value)) {
                return value.map((value) => `${key}[]=${value}`).join('&')
            }

            return `${key}=${value}`
        }

        return Object.entries(this.parameters)
            .map((entry) => {
                if (Array.isArray(entry[1])) {
                    return entry[1]
                        .map((value) => `${entry[0]}[]=${value}`)
                        .join('&')
                }

                return `${entry[0]}=${entry[1]}`
            })
            .join('&')
    }

    build({
        addTrailingSlash,
        includeUndefinedParameters
    }: BuildParameters = defaultBuildParameters): string {
        let finalUrl = this.baseUrl + '/'

        finalUrl += this.pathComponents.join('/')
        finalUrl += addTrailingSlash ? '/' : ''
        finalUrl += Object.values(this.parameters).length > 0 ? '?' : ''
        finalUrl += this.buildQueryParameters()

        return finalUrl
    }
}
