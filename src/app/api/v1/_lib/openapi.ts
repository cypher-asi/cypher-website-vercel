/**
 * The contract sites code against. Keep it in step with the route handlers
 * under src/app/api/v1; openapi.test.ts checks every documented path has one.
 */

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const jsonContent = (schema: unknown) => ({ 'application/json': { schema } });
const errorResponse = (description: string) => ({ description, content: jsonContent(ref('Error')) });
const ok = (description: string, schema: unknown) => ({ description, content: jsonContent(schema) });

const siteParam = { name: 'site', in: 'path', required: true, schema: { type: 'string', example: 'zode' } };
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } };
const keyed = [{ siteKey: [] }];

const postEnvelope = { type: 'object', required: ['post'], properties: { post: ref('Post') } };

export const OPENAPI = {
  openapi: '3.1.0',
  info: {
    title: 'Cypher Content API',
    version: '1.0.0',
    description:
      'Posts for every company site, and the research index of the sources they cite. Public reads need no key and ' +
      'are cached at the CDN for a minute; a site reading or writing with its own key is never served a cached copy.',
  },
  servers: [{ url: 'https://cypher-website-vercel.vercel.app/api/v1' }],
  components: {
    securitySchemes: {
      siteKey: { type: 'http', scheme: 'bearer', description: 'The site\'s API key, from scripts/create-site.mjs.' },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: {
                type: 'string',
                enum: [
                  'bad_request',
                  'validation',
                  'unauthorized',
                  'forbidden',
                  'not_found',
                  'slug_taken',
                  'unavailable',
                  'internal',
                ],
              },
              message: { type: 'string', description: 'Safe to show to an editor.' },
            },
          },
        },
      },
      Author: {
        type: 'object',
        required: ['userId', 'name', 'email'],
        properties: { userId: { type: 'string' }, name: { type: 'string' }, email: { type: 'string', format: 'email' } },
      },
      Source: {
        type: 'object',
        required: ['number', 'title', 'publisher', 'url', 'domain', 'dateLabel', 'detail'],
        properties: {
          number: { type: 'integer', minimum: 1 },
          title: { type: 'string', description: 'Empty when the post only links the source inline.' },
          publisher: { type: 'string' },
          url: { type: 'string', format: 'uri' },
          domain: { type: 'string' },
          dateLabel: { type: 'string', description: 'The date as the citation wrote it.' },
          detail: { type: 'string', description: 'What follows the link in the citation.' },
        },
      },
      Post: {
        type: 'object',
        required: [
          'id', 'site', 'kind', 'status', 'slug', 'title', 'summary', 'version', 'coverPathname', 'author',
          'createdAt', 'updatedAt', 'updatedByEmail', 'publishedAt', 'canonicalUrl',
        ],
        properties: {
          id: { type: 'string', format: 'uuid' },
          site: { type: 'string' },
          kind: { type: 'string', enum: ['news', 'changelog'] },
          status: { type: 'string', enum: ['draft', 'published'] },
          slug: { type: 'string' },
          title: { type: 'string' },
          summary: { type: 'string' },
          bodyMd: { type: 'string', description: 'Markdown. Left out of lists unless withBody is set.' },
          version: { type: ['string', 'null'] },
          coverPathname: { type: ['string', 'null'], description: 'A Blob pathname under posts/{id}/, served by /media.' },
          author: ref('Author'),
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          updatedByEmail: { type: ['string', 'null'] },
          publishedAt: { type: ['string', 'null'], format: 'date-time' },
          canonicalUrl: { type: 'string', format: 'uri' },
          sources: { type: 'array', items: ref('Source'), description: 'On single-post responses.' },
        },
      },
      PostDraft: {
        type: 'object',
        required: ['kind', 'slug'],
        properties: {
          kind: { type: 'string', enum: ['news', 'changelog'] },
          slug: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$', maxLength: 96 },
          title: { type: 'string', maxLength: 160 },
          summary: { type: 'string', maxLength: 320 },
          bodyMd: { type: 'string', maxLength: 200000 },
          version: { type: 'string', maxLength: 32 },
          coverPathname: { type: ['string', 'null'] },
        },
      },
      ResearchSource: {
        type: 'object',
        required: ['id', 'url', 'title', 'publisher', 'domain', 'dateLabel', 'citedBy'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          url: { type: 'string', format: 'uri' },
          title: { type: 'string' },
          publisher: { type: 'string' },
          domain: { type: 'string' },
          dateLabel: { type: 'string' },
          citedBy: {
            type: 'array',
            items: {
              type: 'object',
              properties: { site: { type: 'string' }, kind: { type: 'string' }, slug: { type: 'string' }, title: { type: 'string' } },
            },
          },
        },
      },
    },
  },
  paths: {
    '/posts': {
      get: {
        summary: 'Published posts across every site, newest first',
        parameters: [
          { name: 'site', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } },
          { name: 'cursor', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: ok('A page of posts, without bodies', {
            type: 'object',
            properties: { posts: { type: 'array', items: ref('Post') }, nextCursor: { type: ['string', 'null'] } },
          }),
          400: errorResponse('A bad site or cursor'),
        },
      },
    },
    '/sites/{site}/posts': {
      parameters: [siteParam],
      get: {
        summary: "A site's posts",
        description: 'Published posts for anyone. With the site\'s key, status and author may be used.',
        parameters: [
          { name: 'kind', in: 'query', schema: { type: 'string', enum: ['news', 'changelog'] } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'published', 'all'] } },
          { name: 'author', in: 'query', schema: { type: 'string' } },
          { name: 'withBody', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: {
          200: ok('Posts', { type: 'object', properties: { posts: { type: 'array', items: ref('Post') } } }),
          401: errorResponse('status or author asked for without the site\'s key'),
          404: errorResponse('No such site'),
        },
      },
      post: {
        summary: 'Create an empty draft',
        security: keyed,
        requestBody: {
          required: true,
          content: jsonContent({
            type: 'object',
            required: ['author'],
            properties: { kind: { type: 'string', enum: ['news', 'changelog'], default: 'news' }, author: ref('Author') },
          }),
        },
        responses: {
          201: ok('The new draft', postEnvelope),
          400: errorResponse('A bad request'),
          401: errorResponse('No valid key'),
          403: errorResponse('Another site\'s key'),
        },
      },
    },
    '/sites/{site}/posts/slug/{kind}/{slug}': {
      parameters: [
        siteParam,
        { name: 'kind', in: 'path', required: true, schema: { type: 'string', enum: ['news', 'changelog'] } },
        { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
      ],
      get: {
        summary: 'A published post by its public URL',
        responses: { 200: ok('The post with its sources', postEnvelope), 404: errorResponse('No such published post') },
      },
    },
    '/sites/{site}/posts/{id}': {
      parameters: [siteParam, idParam],
      get: {
        summary: 'Any post of the site, drafts included',
        security: keyed,
        responses: {
          200: ok('The post with its sources', postEnvelope),
          401: errorResponse('No valid key'),
          403: errorResponse('Another site\'s key'),
          404: errorResponse('No such post'),
        },
      },
      patch: {
        summary: 'Save a post, optionally publishing it',
        description: 'Re-indexes the sources the body cites.',
        security: keyed,
        requestBody: {
          required: true,
          content: jsonContent({
            type: 'object',
            required: ['draft', 'editorEmail'],
            properties: {
              draft: ref('PostDraft'),
              publish: { type: 'boolean', default: false },
              editorEmail: { type: 'string', format: 'email' },
            },
          }),
        },
        responses: {
          200: ok('The saved post', postEnvelope),
          400: errorResponse('Validation failed; the message says why'),
          401: errorResponse('No valid key'),
          403: errorResponse('Another site\'s key'),
          404: errorResponse('No such post'),
          409: errorResponse('Another post of the same kind already uses the slug'),
        },
      },
      delete: {
        summary: 'Delete a post and its images',
        security: keyed,
        responses: {
          200: ok('The deleted post', postEnvelope),
          401: errorResponse('No valid key'),
          403: errorResponse('Another site\'s key'),
          404: errorResponse('No such post'),
        },
      },
    },
    '/sites/{site}/posts/{id}/status': {
      parameters: [siteParam, idParam],
      post: {
        summary: 'Publish or unpublish a post as saved',
        description: 'Publishing keeps the first publish date.',
        security: keyed,
        requestBody: {
          required: true,
          content: jsonContent({
            type: 'object',
            required: ['status', 'editorEmail'],
            properties: {
              status: { type: 'string', enum: ['draft', 'published'] },
              editorEmail: { type: 'string', format: 'email' },
            },
          }),
        },
        responses: {
          200: ok('The post', postEnvelope),
          400: errorResponse('Not ready to publish'),
          401: errorResponse('No valid key'),
          403: errorResponse('Another site\'s key'),
          404: errorResponse('No such post'),
        },
      },
    },
    '/sites/{site}/posts/{id}/upload': {
      parameters: [siteParam, idParam],
      post: {
        summary: 'Issue a Vercel Blob client upload token for one of the post\'s images',
        description: 'Forward the editor\'s @vercel/blob/client blob.generate-client-token request body. Pathnames must start with posts/{id}/.',
        security: keyed,
        requestBody: { required: true, content: jsonContent({ type: 'object' }) },
        responses: {
          200: ok('The client token response', { type: 'object' }),
          400: errorResponse('Not a token request, or a pathname outside the post'),
          401: errorResponse('No valid key'),
          403: errorResponse('Another site\'s key'),
          404: errorResponse('No such post'),
        },
      },
    },
    '/research/sources': {
      get: {
        summary: 'Search the sources cited by published posts',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string', maxLength: 200 }, description: 'Web search syntax; also matches domains.' },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } },
          { name: 'cursor', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: ok('Matching sources', {
            type: 'object',
            properties: {
              sources: { type: 'array', items: ref('ResearchSource') },
              nextCursor: { type: ['string', 'null'] },
            },
          }),
          400: errorResponse('A bad query or cursor'),
        },
      },
    },
    '/media/{path}': {
      get: {
        summary: 'A post image',
        parameters: [{ name: 'path', in: 'path', required: true, schema: { type: 'string' }, description: 'A Blob pathname under posts/.' }],
        responses: {
          200: { description: 'The image, cached for good', content: { 'image/*': {} } },
          404: { description: 'No such image' },
          503: { description: 'Image storage is unavailable' },
        },
      },
    },
  },
} as const;
