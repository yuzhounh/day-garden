export default {
  async fetch(): Promise<Response> {
    return new Response('This deployment has been retired. Visit https://day-garden.pages.dev/', { status: 410 })
  },
} satisfies ExportedHandler
