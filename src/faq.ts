import "./style.css";
import { guessBudgetAnswer } from "./faqCopy";

// The one sentence on this static page whose number is a constant. Everything
// else here is prose and stays in src/faq.html.
// Loud rather than a silent no-op if the span ever goes: the sibling entry
// points use `if (!el) return;` (src/clades.ts:10), but that form needs a
// function body and this module has none. `test/markupConstants.test.ts` guards
// the literal coming back; this guards the placeholder going away.
const budget = document.getElementById("faq-guess-budget");
if (!budget) throw new Error("#faq-guess-budget missing from src/faq.html");
budget.textContent = guessBudgetAnswer();
