// `webpack-partials.js` substitutes every `<%= key %>` placeholder in the
// shared head/header/footer partials, and every one of those placeholders sits
// inside a double-quoted HTML attribute. This pins the escaping of the real
// exported substitutor: an unescaped `"` in page copy would close the
// attribute early and silently truncate a `<meta>` tag, which the e2e
// `length > 0` assertions cannot see.
const { fill } = require("../webpack-partials");

describe("fill escapes substituted values for a quoted attribute", () => {
    it("escapes every HTML-significant character in one pass", () => {
        expect(
            fill('content="<%= t %>"', { t: 'The "how" & <why> it\'s' })
        ).toBe('content="The &quot;how&quot; &amp; &lt;why&gt; it&#39;s"');
    });

    it("does not double-escape an ampersand it just introduced", () => {
        expect(fill("<%= t %>", { t: "&amp;" })).toBe("&amp;amp;");
    });

    it("still treats a `$` in prose copy as a literal", () => {
        expect(fill("<%= t %>", { t: "$& $` $' $$" })).toBe(
            "$&amp; $` $&#39; $$"
        );
    });

    it("substitutes every placeholder occurrence", () => {
        expect(fill("<%= t %>|<%=t%>", { t: '"' })).toBe("&quot;|&quot;");
    });
});
