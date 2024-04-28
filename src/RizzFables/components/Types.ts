import {
    ChapterProviding,
    HomePageSectionsProviding,
    HomeSection,
    MangaProviding,
    SearchResultsProviding,
    Tag
} from '@paperback/types'

import * as cheerio from 'cheerio'

export interface Source extends ChapterProviding, HomePageSectionsProviding, MangaProviding, SearchResultsProviding {}

export interface Months {
    january: string;
    february: string;
    march: string;
    april: string;
    may: string;
    june: string;
    july: string;
    august: string;
    september: string;
    october: string;
    november: string;
    december: string;
}

export interface StatusTypes {
    ONGOING: string;
    COMPLETED: string;
}

export interface Slug {
    path: string | undefined;
    slug: string | undefined;
}

export interface Metadata {
    page: number | null;
}

export interface TagSection {
    id: string;
    label: string;
    tags: Tag[];
}

export interface SearchResult {
    slug: string;
    path: string;
    image: string;
    title: string;
    subtitle: string;
}

export interface ComicResult {
    id: string
    title: string
    image_url: string
    rating: string
    description: string
    upload_date: string
    update_date: string
    genre_id: string
    status: string
    type: string
    released: string
    serialization: string
    posted_by: string
    long_description: string
    artist: string
    author: string
    cover_img: string
    views: string
    chapter_title: string
    chapter_time: string
}

export interface HomeSectionData {
    selectorFunc: ($: cheerio.CheerioAPI) => cheerio.Cheerio<cheerio.Element>;
    titleSelectorFunc?: ($: cheerio.CheerioAPI, element: cheerio.Element) => string | undefined;
    subtitleSelectorFunc: ($: cheerio.CheerioAPI, element: cheerio.Element) => string;
    getViewMoreItemsFunc: (page: string) => string;
    section: HomeSection;
    enabled: boolean;
    sortIndex: number;
}
export const DefaultHomeSectionData = {
    titleSelectorFunc: ($: cheerio.CheerioAPI, element: cheerio.Element) => $('h2', element).text().trim(),
    subtitleSelectorFunc: () => '',
    getViewMoreItemsFunc: () => '',
    enabled: true
}