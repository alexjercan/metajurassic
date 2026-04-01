# Graph scaling doesn't work properly on some browsers and mobile

- STATUS: CLOSED
- PRIORITY: 100
- TAGS: bug

The graph tree that displays the dinosaurs and clades is not displayed properly
on some devices. This happens especially if the screen is really small. What
happens is that we have scroll-ing activate, but on android, you cannot scroll
to the left for some reason - in the chrome browser. Also there are some small
inconveniences on Opera browser.

Desktop firefox and chromium seem to work fine though.

Of course another small issue is that if the "heigh" of the page is really
small you cannot really see the content that well. But that is expected. Maybe
if possible we can resize elements if the height is too small.

Maybe some kind of re-scaling would fix the scrolling issue on different
browsers as well. The main issue is that if the graph gets too big (aka we have
too many guesses), the tree might get clipped because it is too big. Maybe one
idea is to scale down the CSS for the graph based on the number of guesses.

Maybe we can even look at the tree more high-level. So basically if we have a
lot of guesses on the same line (level), we can also scale it down.
