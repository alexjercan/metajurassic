import "./style.css";
import { guessBudgetAnswer, hintCostAnswer } from "./faqCopy";

// The only sentences on this static page whose numbers are constants.
// Everything else here is prose and stays in src/faq.html.
// Loud rather than a silent no-op if the span ever goes: the sibling entry
// points use `if (!el) return;` (src/clades.ts:10), but that form needs a
// function body and this module has none. `test/markupConstants.test.ts` guards
// the literal coming back; this guards the placeholder going away.
const budget = document.getElementById("faq-guess-budget");
if (!budget) throw new Error("#faq-guess-budget missing from src/faq.html");
budget.textContent = guessBudgetAnswer();

const hintCost = document.getElementById("faq-hint-cost");
if (!hintCost) throw new Error("#faq-hint-cost missing from src/faq.html");
hintCost.textContent = hintCostAnswer();
