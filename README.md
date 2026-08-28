# Proyojon

> A trusted home-services marketplace for residents and service providers in Dhaka.

Proyojon is basically a web-based platform that helps residents in restricted areas of
Dhaka, such as Bashundhara R/A, DOHS and Cantonment securely book verified maintenance workers.
Customers can request services based on their needs and location. Moderators check the workers'
credentials and assign bookings. Workers then manage and complete the jobs. Proyojon uses a three-role
booking system with role-based access and status tracking. Besides, it has an AI chatbot feature that can
provide the urgent temporary solution for the customer. This system makes hiring safer and more
organized than using street vendors


## Framework

| Layer | Technology |
| --- | --- |
| Frontend | HTML, vanilla JavaScript, Tailwind CSS CDN |
| Backend | Node.js, Express.js |
| Database | MongoDB with Mongoose |
| Authentication | bcryptjs with role-based sessions |
| Maps | Leaflet.js |
| Analytics | Chart.js |
| AI assistant | Google Gemini API |

## Project Structure

```text
.
├── index.html       # Single-page application markup
├── app.js           # Frontend state, routing, API calls, and interactions
├── style.css        # Custom UI styles and animations
├── server.js        # Express server, API routes, database connection, and seeding
├── models/          # Mongoose models
├── tests/            # Project test runner
└── package.json     # Dependencies and npm scripts
```

## Getting Started

### Prerequisites

- Node.js 18 or later
- MongoDB running locally, or a MongoDB Atlas connection string
- A Gemini API key if the AI assistant is required

### Installation

```bash
npm install
```

npm start
```

Open [http://localhost:5050](http://localhost:5050) in a browser. The `dev` script currently starts the same Node.js server:

## Demo Accounts

After the initial database seed, use these accounts to explore the role-specific views:

| Role | Email | Password |
| --- | --- | --- |
| Customer | `customer@proyojon.com` | `password` |
| Provider | `karim@proyojon.com` | `password` |
| Moderator | `admin@proyojon.com` | `password` |

These credentials are for local development only. Change or remove seeded credentials before deploying to a shared environment.


## Project Updates

### Update 1

- Completed the initial frontend design
- Added customer authentication
- Created customer and product data structures
- Added cart functionality

### Update 2

- Added the AI chatbot
- Added moderator and provider login pages and dashboards
- Completed the marketplace and booking workflow
- Added reviews, ratings, and customer-provider messaging

### Update 3

- Added booking scheduling and invoices
- Added map support, automatic location tracking, and notifications
- Added combo deals
- Added moderator dashboard data visualization
- Added complaint management


