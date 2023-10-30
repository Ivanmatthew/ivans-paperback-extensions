import {
    ContentRating,
    HomeSection,
    PagedResults,
    PartialSourceManga,
    Request,
    SearchRequest,
    SourceInfo,
    SourceIntents,
    TagSection
} from '@paperback/types'

import {
    getExportVersion,
    MangaStream
} from '../MangaStream'
import { RizzComicParser } from './RizzComicParser'
import { Months } from '../MangaStreamInterfaces'
import { getFilterTagsBySection, getIncludedTagBySection } from '../MangaStreamHelper'

import { URLBuilder } from '../UrlBuilder'
import { RizzComicResult } from './RizzComicInterfaces'
import { getSlugFromTitle } from './RizzComicHelper'


export const DOMAIN = 'https://rizzcomic.com'
const FILTER_ENDPOINT = 'Index/filter_series'
const SEARCH_ENDPOINT = 'Index/live_search'

export const RizzComicInfo: SourceInfo = {
    version: getExportVersion('1.0.0'),
    name: 'RizzComic',
    description: `Extension that pulls manga from ${DOMAIN}`,
    author: 'IvanMatthew',
    authorWebsite: 'http://github.com/Ivanmatthew',
    icon: 'icon.png',
    contentRating: ContentRating.MATURE,
    websiteBaseURL: DOMAIN,
    intents: SourceIntents.MANGA_CHAPTERS | SourceIntents.HOMEPAGE_SECTIONS | SourceIntents.CLOUDFLARE_BYPASS_REQUIRED | SourceIntents.SETTINGS_UI,
    sourceTags: []
}



export class RizzComic extends MangaStream {

    baseUrl: string = DOMAIN

    override directoryPath = 'series'

    filterPath = 'series'

    override usePostIds = false

    override parser: RizzComicParser = new RizzComicParser()

    override configureSections(): void {
        this.homescreen_sections['new_titles'].enabled = false
    }

    override dateMonths: Months = {
        january: 'Jan',
        february: 'Feb',
        march: 'Mar',
        april: 'Apr',
        may: 'May',
        june: 'Jun',
        july: 'Jul',
        august: 'Aug',
        september: 'Sep',
        october: 'Oct',
        november: 'Nov',
        december: 'Dec'
    }

    override async getSearchTags(): Promise<TagSection[]> {
        const request = App.createRequest({
            url: `${this.baseUrl}/${this.filterPath}/`,
            method: 'GET'
        })

        const response = await this.requestManager.schedule(request, 1)
        this.checkResponseError(response)
        const $ = this.cheerio.load(response.data as string)

        return this.parser.parseTags($)
    }

    override async constructSearchRequest(page: number, query: SearchRequest): Promise<any> {
        let searchUrl: URLBuilder = new URLBuilder(this.baseUrl)
        const headers: Record<string, string> = {
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
        }
        const formData: Record<string, string> = {}

        if (query?.title) {
            searchUrl = searchUrl.addPathComponent(SEARCH_ENDPOINT)
            formData['search_value'] = query?.title.replace(/[’–][a-z]*/g, '') ?? ''
        } else {
            searchUrl = searchUrl.addPathComponent(FILTER_ENDPOINT)

            const statusValue = getIncludedTagBySection('status', query?.includedTags)
            const typeValue = getIncludedTagBySection('type', query?.includedTags)
            const orderValue = getIncludedTagBySection('order', query?.includedTags)

            formData['genres_checked[]'] = getFilterTagsBySection('genres', query?.includedTags, true).join('&genre[]=')
            formData['StatusValue'] = statusValue !== '' ? statusValue : 'all'
            formData['TypeValue'] = typeValue !== '' ? typeValue : 'all'
            formData['OrderValue'] = orderValue !== '' ? orderValue : 'all'
        }

        return App.createRequest({
            url: searchUrl.buildUrl({ addTrailingSlash: true, includeUndefinedParameters: false }),
            headers: headers,
            data: Object.entries(formData).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&'),
            method: 'POST'
        })
    }

    override async getSearchResults(query: SearchRequest, metadata: any): Promise<PagedResults> {
        const request = await this.constructSearchRequest(1, query)
        const response = await this.requestManager.schedule(request, 1)
        this.checkResponseError(response)
        const searchResultData: RizzComicResult[] = JSON.parse(response.data as string)

        const results: PartialSourceManga[] = []
        for (const manga of searchResultData) {
            results.push(App.createPartialSourceManga({
                mangaId: getSlugFromTitle(manga.title),
                title: manga.title,
                image: `${this.baseUrl}/assets/images/${manga.image_url}`
            }))
        }

        // Results are single page, unpaged, therefore no metadata for next page is required
        return App.createPagedResults({
            results: results
        })
    }

    override async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        const request = App.createRequest({
            url: `${this.baseUrl}/`,
            method: 'GET'
        })

        const response = await this.requestManager.schedule(request, 1)
        this.checkResponseError(response)

        const $ = this.cheerio.load(response.data as string)

        const promises: Promise<void>[] = []
        const sectionValues = Object.values(this.homescreen_sections).sort((n1, n2) => n1.sortIndex - n2.sortIndex)
        for (const section of sectionValues) {
            if (!section.enabled) {
                continue
            }
            // Let the app load empty sections
            sectionCallback(section.section)
        }

        for (const section of sectionValues) {
            if (!section.enabled) {
                continue
            }

            // eslint-disable-next-line no-async-promise-executor
            promises.push(new Promise(async () => {
                section.section.items = await this.parser.parseHomeSection($, section, this)
                sectionCallback(section.section)
            }))
        }

        // Make sure the function completes
        await Promise.all(promises)
    }

    override async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
        if (homepageSectionId !== 'latest_update') {
            return super.getViewMoreItems(homepageSectionId, metadata)
        }

        const headers: Record<string, string> = {
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
        }
        const formData: Record<string, string> = {
            'StatusValue': 'all',
            'TypeValue': 'all',
            'OrderValue': 'update'
        }

        const request = App.createRequest({
            url: `${this.baseUrl}/${FILTER_ENDPOINT}`,
            headers: headers,
            data: Object.entries(formData).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&'),
            method: 'POST'
        })

        const response = await this.requestManager.schedule(request, 1)
        const pageData: RizzComicResult[] = JSON.parse(response.data as string)

        const items: PartialSourceManga[] = []

        for (const manga of pageData) {
            items.push(App.createPartialSourceManga({
                mangaId: getSlugFromTitle(manga.title),
                title: manga.title,
                image: `${this.baseUrl}/assets/images/${manga.image_url}`
            }))
        }

        return App.createPagedResults({
            results: items
        })
    }
    
    override async getCloudflareBypassRequestAsync(): Promise<Request> {
        // Delete cookies
        this.requestManager?.cookieStore?.getAllCookies().forEach(x => { this.requestManager?.cookieStore?.removeCookie(x) })

        return await super.getCloudflareBypassRequestAsync()
    }
}
