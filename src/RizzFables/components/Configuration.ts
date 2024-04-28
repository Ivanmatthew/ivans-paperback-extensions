import { Months, StatusTypes } from './Types'

export class Configuration {
    /**
     * The URL of the website. Eg. https://mangadark.com without a trailing slash
     */
    static baseUrl = 'https://rizzfables.com'

    /**
     * The language code which this source supports.
     */
    static language = '🇬🇧'

    // ----GENERAL SELECTORS----

    /**
     * The pathname between the domain and the manga.
     * Eg. https://mangadark.com/manga/mashle-magic-and-muscles the pathname would be "manga"
     * Default = "manga"
     */
    static directoryPath = 'series'

    /**
     * The pathname between the domain and the filter path. (Usually the same but can deviate)
     */
    static filterPath = 'series'

    static filterEndpoint = 'Index/filter_series'

    static searchEndpoint = 'Index/live_search'

    /**
     * Some websites have the Cloudflare defense check enabled on specific parts of the website, these need to be loaded when using the Cloudflare bypass within the app
     */
    static bypassPage = ''

    // ----MANGA DETAILS SELECTORS----
    /**
     * The selector for alternative titles.
     * This can change depending on the language
     * Leave default if not used!
     * Default = "b:contains(Alternative Titles)"
     */
    static manga_selector_AlternativeTitles = 'Alternative Titles'
    /**
     * The selector for authors.
     * This can change depending on the language
     * Leave default if not used!
     * Default = "Author" (English)
     */
    static manga_selector_author = 'Author'
    /**
     * The selector for artists.
     * This can change depending on the language
     * Leave default if not used!
     * Default = "Artist" (English)
     */
    static manga_selector_artist = 'Artist'
    /**
     * The selector for status.
     * This can change depending on the language
     * Leave default if not used!
     * Default = "Status" (English)
     * THESE ARE CASE SENSITIVE!
    */
    static manga_selector_status = 'Status'

    //----MANGA TAG SELECTORS----
    static manga_tag_selector_box = 'span.mgen'

    // ----STATUS SELECTORS----
    /**
     * The selector for the manga status.
     * These can change depending on the language
     * Default = ONGOING: "ONGOING", COMPLETED: "COMPLETED"
     */
    static manga_StatusTypes: StatusTypes = {
        ONGOING: 'ONGOING',
        COMPLETED: 'COMPLETED'
    }

    // ----DATE SELECTORS----
    /**
     * Enter the months for the website's language in correct order, case insensitive.
     * Default = English Translation
     */
    static dateMonths: Months = {
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
}