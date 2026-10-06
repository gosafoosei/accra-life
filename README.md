# Accra Life ⭐

**Live your Accra story.** A cosy, browser-based life game set in Accra, Ghana — inspired by the
concept behind lagoslife.app, rebuilt from scratch with Ghanaian flavour and an original design.

> Ride trotro, chop waakye at Tudu, party on Oxford Street, survive dumsor — and build your own
> Accra dream, one decision at a time.

## Play it

No build step, no dependencies. Either:

- **Just open it** — double-click `index.html`, or
- **Serve it** (recommended):
  ```bash
  npx serve .
  # or
  python -m http.server 8080
  ```
  then visit the printed localhost URL.

Progress auto-saves to your browser's localStorage.

## What's in the game

| System | Details |
| --- | --- |
| **Character creation** | Name, skin/face, fit (streetwear, kente drip, corporate, beach), and 3 starting hustles (Student / Office / Hustler) with different perks |
| **11 Accra locations** | Home (East Legon), Makola Market, Oxford Street Osu, Labadi Beach, Tudu waakye joint, Dansoman chop bar, Kwame Nkrumah Circle, Airport City offices, Legon, Accra Mall, Jamestown & Bukom |
| **4 life stats** | ⚡ Energy, 🍚 Food, 😊 Vibes, 👥 Links — plus money (GH₵) and 📚 book sense |
| **Travel** | Trotro (cheap), keke (fun), Bolt (dignified) or walking — each with different cost, time and side effects |
| **Random events** | Dumsor, go slow traffic, rains, MoMo promo scams, trotro mate fare arguments, kelewele auntie, jollof debates, Black Stars match days, friend invitations, ECG bills, weddings, water outages, phone snatchers, trotro sermons, WhatsApp-status sales, found money… |
| **Detty Season** | Every 6th month the city turns up — party vibes +50%, a HUD badge, and an exclusive achievement |
| **Economy** | Shifts at an Airport City job (raises every 10 shifts), market hustles, remote gigs (needs a laptop), rent of GH₵ 800 due on the 1st of every month |
| **Items** | Power bank, "I-better-pass-my-neighbour" generator, laptop, Black Stars jersey |
| **5 friends** | Kwame, Abena, Kofi, Efua and Yaw — link up to build relationships; close friends send support |
| **19 achievements** | From *Akwaaba!* and *Waakye Ambassador* to *Detty Season* and *MoMo Magnate* |
| **Game over** | Miss rent for 10 days and the landlord changes the locks |

## Design notes

- Dark, warm Ghana-inspired theme: kente-stripe accents, gold-on-green palette, black-star motif.
- Vanilla HTML/CSS/JS — zero dependencies, ~3 files, works offline, trivially deployable.
- Mobile-first responsive layout that expands into a two-column desktop view.
- Respects `prefers-reduced-motion`.

## Deploy

It's a static site, so any static host works:

- **Netlify / Vercel** — drag the folder into their dashboard, or `vercel deploy`
- **GitHub Pages** — push the folder and enable Pages
- **Cloudflare Pages** — connect the repo, no build command needed

## Credits

Original game concept, code, copy and design for Accra Life. Inspired as a genre by the
browser life-sim trend (lagoslife.app). Not affiliated with lagoslife.app.
