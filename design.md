# Food Tracker design

Food Tracker is a Thai-first food diary. The home page uses the original food photograph and a single signup action. The diary groups entries by date and puts adding a meal within easy reach on a phone.

## Shared system

Use the playful cream, forest green and lime palette in [app/tokens.css](app/tokens.css). Prompt serves Thai and Latin text. Keep page headings prominent and field labels short. Use lime for the primary action and current selection. Forest green gives the diary cover its own surface.

Controls share the 14px radius and a minimum 44px tap target. Primary actions use lime fill. Secondary actions use an outline. Destructive actions use red and require confirmation. Keep keyboard focus visible and respect reduced motion.

## Page patterns

- Home pairs a short Thai heading with the existing food photo. Both signup and sign-in remain visible on a phone.
- The diary shows the selected date, recorded entries and their real photos, and a link to the full history. Keep the selected view on return from an unfinished form.
- Entry forms put the name, meal and editable date first. Photos are optional. Save feedback is inline. After a save, show the day containing that entry.
- Account pages share the same field labels, upload previews, and feedback. Keep errors close to the form and preserve inputs when users retry.
