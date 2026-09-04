# PRODUCT EDITOR UX STUDY — captured 0018.06.11 (T-99c/d; NEVER captured before)
Builder: love.shinepages.com/me/store/* (Simvoly white-label). READ-ONLY (all
exits via discard; nothing saved).

## The editor model (every product page, /me/store/products/<id>)
Top bar: ← Back · Copy Link · PREVIEW · Delete · Clone.
Main column: Product Title (big inline field, AI button top-right) →
Description (SIMPLE EDITOR | DRAG & DROP EDITOR toggle) → Price ($, On Sale,
Subscription w/ renewal cadence) → SKU → TYPE (Physical/Digital/Service/
Membership; Membership reveals MEMBER GROUPS multi-select: "on checkout
customers log in/register and are added to selected groups") .
Right rail: image + Add Images → Product Categorization → Hidden Product →
Product Page URL (slug) → SEO SETTINGS (modal: SEO title/desc + GENERATE VIA
AI + per-field AI buttons).
Feature cards: TRACK INVENTORY (toggle; qty badge) · VARIATIONS (Edit →
modal: variation name + comma values; combination table Price/Sale/On-Sale/
SKU/Stock; per-variation image; Advanced) · CUSTOM THANK YOU PAGE (toggle +
redirect target) · ADDITIONAL QUESTIONS (pre-cart, e.g. engraving/notes) ·
TAG CUSTOMERS (CRM tag on purchase).
AI ASSISTANT ("Let's Improve Your Content with AI", OpenAI-powered):
Create description from title · Improve (+tone knob) · Expand · Shorten ·
Generate text. Same AI in SEO modal.
Store hub extras: Layout & Styling → PRODUCT PAGE = builder SYSTEM PAGE
(/me/website/system/product — image col, title, price+strike, qty stepper,
ADD TO CART, description, Related-products rail) · listing-page layout ·
Cart page · Checkout page ("change fields/steps/tags/autoresponders") ·
CART QUICK VIEW toggle (hover cart preview). Left nav: Dashboard Orders
Products Subscriptions Discounts Layout&Styling Reviews Settings ·
Preview Store · Edit Store Pages.

## The 10 products (ids 21-30) — see shop/ for per-product files
21 Silent Haircut (Women ♀) $222 Service — REAL copy, custom thank-you ON
22 Silent Haircut (Men ♂) $111 Service — same copy, url silent-haircut-men
23 Soul Conversation (Male ♂) $222 Service — real copy variant
24 Soul Conversation - no cut (♀) $222 Service — url soul-conversation-female
25 IAM Worthy Sleep Meditation $11.11 Service — real copy
26 WEEKLY INTUITIVE $33.33/mo Membership SKU 888 — sub ON, member group
   "Heaven Meets Earth Collective - Weekly Intuitive"
27 LEAP OF FAITH from $33.33 Service — VARIATION "You Choose": 55.55/33.33
   (PWYC-as-variations!) + "discounts on request" line; lorem body
28 THE OBSERVER $55/mo Membership — groups: Course Members + HMEC-Observer;
   lorem body
29 Thank You Wake Up Affirmations $11.11 Service — lorem body
30 Large Sums Of Money $11.11 Service — lorem body

## Design takeaways for OUR store editor (the vanilla store plan)
1. ONE page per product, sections stacked — no tabs. Preview always a click.
2. Type drives reveals (Membership → groups; Subscription → cadence).
3. PWYC = "You Choose" variation tiers (Love's own pattern; feeds the
   25-sat floor ruling + pricing-pwyc-floor-proposal).
4. AI assist embedded per-field, not a separate chat (Copilot placement cue).
5. Product → member-group wiring at checkout = our product→Matrix-room grant.
6. Thank-you page as per-product redirect; questions-before-cart; CRM tag.
