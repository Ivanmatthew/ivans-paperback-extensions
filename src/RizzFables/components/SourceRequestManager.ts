import {
    Request,
    Response
} from '@paperback/types';

export const getSourceRequestManager = (sourceUrl: string) => {
    const self = App.createRequestManager({
        requestsPerSecond: 5,
        requestTimeout: 15000,
        interceptor: {
            interceptRequest: async (request: Request): Promise<Request> => {
                request.headers = {
                    ...(request.headers ?? {}), ...{
                        'user-agent': await self.getDefaultUserAgent(),
                        referer: `${sourceUrl}/`, ...((request.url.includes('wordpress.com') || request.url.includes('wp.com')) && {
                            Accept: 'image/avif,image/webp,*/*'
                        }) // Used for images hosted on Wordpress blogs
                    }
                }

                request.url = request.url.replace(/^http:/, 'https:')

                return request
            },

            interceptResponse: async (response: Response): Promise<Response> => {
                if (response.headers.location) {
                    response.headers.location = response.headers.location.replace(/^http:/, 'https:')
                }
                return response
            }
        }
    });

    return self;
}