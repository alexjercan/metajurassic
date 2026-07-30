// Stand-in for webpack's `asset/resource` imports (see webpack.config.js: .svg
// and image rules emit a URL string). Jest has no bundler, so a module that
// imports an asset would fail to resolve without this mapping. The value is a
// recognisable non-empty URL-ish string, because the card tests assert that a
// media-less card falls back to the bundled default icon rather than emitting
// an empty src - an empty stub would make that assertion vacuous.
module.exports = "assets/default_icon.svg";
