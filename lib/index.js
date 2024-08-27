"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IMAGE_URL = `https://miro.medium.com/v2/`;
class MediumManager {
    constructor(scraperEngine) {
        this.scraperEngine = scraperEngine;
    }
    async init() {
        await this.scraperEngine.init();
    }
    async scrap(username, maximum = 0) {
        const postIds = await this.getPostIds(username);
        console.log('postIds', postIds);
        const posts = [];
        for (const postId of postIds) {
            try {
                const post = await this.getPostContentById(username, postId);
                posts.push(post);
                if (maximum > 0 && posts.length >= maximum)
                    break;
            }
            catch (e) {
                console.log(`Failed to scrap post ${postId}. `, e);
            }
        }
        return posts;
    }
    getPostIds(username) {
        return new Promise(async (resolve, reject) => {
            const url = `https://${username}.medium.com`;
            const postIds = [];
            let hasMoreTimeout;
            let scrollDownHasMoreTimeout;
            const resetHasMoreTimeout = () => {
                clearTimeout(hasMoreTimeout);
                hasMoreTimeout = setTimeout(async () => {
                    console.log('Scrolling down');
                    await this.scraperEngine.scrollToBottom();
                    scrollDownHasMoreTimeout = setTimeout(() => {
                        this.scraperEngine.removeAllListeners('response');
                        resolve(postIds);
                    }, 7000);
                }, 3000);
            };
            this.scraperEngine.on('response', async (response) => {
                var _a;
                if (response.request().url().indexOf('/_/graphql') === -1)
                    return;
                resetHasMoreTimeout();
                clearTimeout(scrollDownHasMoreTimeout);
                const postData = JSON.parse(response.request().postData());
                const postIdList = (_a = postData.filter(v => v.operationName === 'ClapCountQuery' && v.variables.postId !== undefined)) === null || _a === void 0 ? void 0 : _a.map(v => v.variables.postId);
                for (const postId of postIdList) {
                    if (postIds.indexOf(postId) === -1)
                        postIds.push(postId);
                }
            });
            await this.scraperEngine.goto(url);
            console.log('Redirecting to medium page...');
        });
    }
    async getPostContentById(username, id) {
        const url = `https://${username}.medium.com/${id}`;
        await this.scraperEngine.goto(url);
        console.log(`Redirecting to page content ${id}...`);
        const contentObject = await this.scraperEngine.evaluate(() => {
            return window['__APOLLO_STATE__'];
        });
        const post = this.parseContentObjectToPost(contentObject, id);
        return post;
    }
    parseContentObjectToPost(contentObject, id) {
        const postHeader = contentObject[`Post:${id}`];
        const paragraphs = postHeader['content({"postMeteringOptions":{}})'].bodyModel.paragraphs;
        let olNum = 0;
        let content = '';
        for (const paragraph of paragraphs) {
            const paragraphId = paragraph.__ref;
            const paragraphObj = contentObject[paragraphId];
            switch (paragraphObj.type) {
                case "P": {
                    content += paragraphObj.text;
                    content += '\n';
                    olNum = 0;
                    break;
                }
                case "IMG": {
                    const imgObj = contentObject[paragraphObj.metadata.__ref];
                    content += `${IMAGE_URL}${imgObj.id}`;
                    content += '\n';
                    olNum = 0;
                    break;
                }
                case "OLI": {
                    olNum++;
                    content += `${olNum}. ${paragraphObj.text}`;
                    content += '\n';
                    break;
                }
                case "CLI": {
                    olNum = 0;
                    content += `\t${paragraphObj.text}`;
                    content += '\n';
                    break;
                }
                default: {
                    olNum = 0;
                    content += paragraphObj.text;
                    content += '\n';
                    break;
                }
            }
        }
        return {
            id: postHeader.id,
            firstPublishedAt: postHeader.firstPublishedAt,
            latestPublishedAt: postHeader.latestPublishedAt,
            readingTime: postHeader.readingTime,
            text: content,
            title: postHeader.title,
            updatedAt: postHeader.updatedAt
        };
    }
}
exports.default = MediumManager;
