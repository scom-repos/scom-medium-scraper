export interface IMediumPost {
    id: string;
    firstPublishedAt: number;
    latestPublishedAt: number;
    updatedAt: number;
    readingTime: number;
    title: string;
    text: string;
}
export default class MediumManager {
    private scraperManager;
    private browser;
    private page;
    constructor();
    init(): Promise<void>;
    scrap(username: string, maximum?: number): Promise<IMediumPost[]>;
    private getPostIds;
    private getPostContentById;
    private parseContentObjectToPost;
}
