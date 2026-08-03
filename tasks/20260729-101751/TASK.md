# Make shared links unfurl with Open Graph and Twitter cards

- PRIORITY: 55
- TAGS: feature, ux, content
- KIND: TASK
- ACTIVITY: PLANNING
- GATES: -
- RESOLUTION: -

## Story

As a person receiving a shared result, I want the game link to unfurl with a title, description, and image, so that the share looks like a real game invitation instead of a bare URL.

## Review Findings

- `src/index.html` has no Open Graph, Twitter card, or meta description tags; pasted links render as plain URLs in chat apps and social feeds.
- For a shareable .io game the unfurl is part of the share loop, alongside the share text itself.

## Steps

- [ ] Add Open Graph and Twitter card meta tags (title, description, image, url) to the game pages via the webpack HTML pipeline.
- [ ] Create or pick a preview image (a museum-card or tree motif) and serve it from the deployed site at a stable URL.
- [ ] Add a proper meta description for search engines as well.
- [ ] Verify the unfurl with a validator or a real chat app after deploy.

## Definition of Done

- Open Graph and Twitter tags are present in built HTML. (cmd: `npm run build` then `rg -n "og:|twitter:" dist/index.html`)
- The preview image resolves on the deployed site. (manual: paste the link in a chat app and check the unfurl)

## Notes

- Related: the share text rewrite task; land the copy and the unfurl as one coherent share experience.
