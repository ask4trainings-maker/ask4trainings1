# Hope InfoTech: CMS User Manual

Welcome to the Hope InfoTech Content Management System (CMS) User Manual. This guide is designed for institute managers, coordinators, and content editors. It will teach you how to use, edit, publish, and manage all website content—even if you have zero technical background.

> [!TIP]
> **No Coding Required!** 
> The CMS provides a simple, visual interface for all your editing needs. If you can fill out an online form, you can manage the Hope InfoTech website.

---

## 1. Quick-Start & Logging Into the CMS Portal

The CMS portal is a secure area where you can make live updates to the website.

### Access URL
To access the CMS dashboard, navigate to the secure admin portal:
**[https://hopeinfotech.com/admin/](https://hopeinfotech.com/admin/)** (or your designated staging URL).

### Authentication Step-by-Step
1. **Navigate to the Login Page:** Visit the Access URL provided above.
2. **Click "Login with GitHub":** You will see a button prompting you to log in. Click it.
3. **Authenticate:** In the popup window that appears, log in using the approved administrative GitHub account provided by your IT team.
4. **Grant Permissions:** If this is your first time logging in, GitHub will ask you to authorize the application. Click **"Authorize"** to proceed.

> [!IMPORTANT]
> **Workflow Overview: How Publishing Works**
> When you click "Save" or "Publish" in the CMS, your changes are sent to the server. An automated Cloudflare Pages build process instantly begins behind the scenes. **Your updates will go live across the web in exactly 1 to 2 minutes.** Please be patient and refresh the live website after a couple of minutes to see your changes!

---

## 2. Dashboard Navigation & Content Collections Overview

Once logged in, look at the **left sidebar** of your dashboard. You will see four primary "Collections" that act as the master folders for your website content. Here is a detailed breakdown of what each collection does and what results you can expect when you edit them.

### 2.1 Courses
The master repository for all enterprise course landing pages, syllabus modules, pricing tiers, and curriculum details.
* **What you can do:** Create brand new course pages, or update existing ones (e.g., adding a new curriculum module, changing pricing).
* **What edits show what results:**
  * **Adding a new course** automatically generates a new, fully designed landing page at `hopeinfotech.com/courses/your-course-name` and adds a new card to the main Courses catalog.
  * **Updating Pricing Tiers** instantly modifies the pricing tables on that specific course page.
  * **Adding/Removing a Curriculum Module** updates the accordion/dropdown syllabus section on the course page.

### 2.2 Blog & Guides
The hub for career roadmaps, technical guides, industry news articles, and student success stories.
* **What you can do:** Draft and publish new articles, or update existing posts.
* **What edits show what results:**
  * **Publishing a new blog** creates a new page at `hopeinfotech.com/blog/your-post-title` and pushes the article to the top of the main Blog feed.
  * **Updating the Excerpt or Cover Image** changes how the blog post preview card looks when shared on social media or viewed on the main blog listing page.

### 2.3 Site Settings & Nav
Your centralized hub for global website information. This is where you update information that appears on *every single page* of the website.
* **What you can do:** Update contact phone numbers, WhatsApp links, the Ameerpet office address, social media channel links, and header navigation menus.
* **What edits show what results:**
  * **Changing the Primary Phone Number** will immediately update the clickable "Call Us" buttons in the top header and the bottom footer across the *entire website*.
  * **Updating Social Links** will update the social media icons in the footer globally.
  * **Modifying Navigation Menus** will add, remove, or rename the links seen in the top desktop and mobile navigation bars.

### 2.4 Pages (Static Pages)
The central location for editing the core informational pages of your website, such as the Home, About, Services, and Contact pages.
* **What you can do:** Update statistics, text blocks, and specific messaging on core static pages.
* **What edits show what results:**
  * **Editing the Home Page (e.g., "Active Trainees Count")** directly updates the large statistic numbers displayed on the front page banner.
  * **Editing the Contact Page (e.g., "Google Maps URL")** updates the embedded map and address details exactly on `hopeinfotech.com/contact-us`.

---

## 3. Step-by-Step Course Management Guide

When you click on **Courses** and select a course to edit (or click "New Course"), you will see a form broken down into sections. 

### Stage 1: Hero Banner & Primary Identifiers
* **Course Priority Tier (`priorityTier`):** Controls the sorting and prominence of this course on the website. 
  * *Result:* Select **Tier 1 (Flagship)** to rank this course at the very top of the catalog and homepage. Use **Tier 2 (Growth)** or **Tier 3 (Supporting)** for secondary courses.
* **Course Title (`title`):** The primary heading on the website.
  * *Result:* Changes the massive H1 text at the top of the course page and the title tag for Google.
* **Course Category (`category`):** A dropdown selector.
  * *Result:* Dictates where the course appears in the navigation mega-menu and category filter tabs on the catalog page.
* **Course Banner / Thumbnail (`thumbnail`):** The main background image.
  * *Result:* Replaces the background image at the top of the course page and the thumbnail on the catalog listing. Use a 16:9 aspect ratio (`1280x720` or `1920x1080`), save as WebP/PNG/JPG (< 500KB).
* **Rating & Reviews Count (`rating`, `reviewCount`):** 
  * *Result:* Displays star ratings on course cards to build trust (e.g., 4.9 stars, 320 reviews).

### Stage 2: Batch Logistics & Demo Video
* **Upcoming Live Batch Details (`upcomingBatch`):** Keep dates updated for active batches.
  * *Result:* Fills in `startDate`, `timing`, and `seatsLeft` to display a high-conversion alert box with a direct WhatsApp booking link right under the hero banner.
* **Demo Class Video URL (`demoVideoUrl`):** Paste a standard YouTube link.
  * *Result:* Embeds a playable YouTube video directly into the course page. Please ensure you use standard Watch/Share URLs. Private videos or playlist URLs should **not** be used.
* **Duration & Training Mode (`duration`, `trainingMode`):** 
  * *Result:* Updates the quick-facts summary box (e.g., "6 Weeks", "Live Online") near the top of the course page.
* **Brochure Drive Link (`brochureDriveUrl`):** 
  * *Result:* Changes the destination URL when a user clicks the "Download Syllabus" button.

### Stage 3: In-Depth Overview & Body Content
* **Short Description (`description`):** 
  * *Result:* Changes the 2-sentence summary used on the course preview cards in the catalog.
* **In-Depth Course Overview (`body`):** 
  * *Result:* Updates the main, long-form text article on the course page. You can format text easily using the built-in toolbar.
* **Key Highlights & Target Audience (`highlights`, `targetAudience`):** 
  * *Result:* Populates the bullet point lists indicating who the course is for and what perks (e.g., "24/7 Lab Access") are included.

### Stage 4: Curriculum & Syllabus Modules (Drag-and-Drop)
* **Add Curriculum Modules:** Click this to add a new chapter. 
* **Drag-and-Drop:** Click and drag the modules to reorder them.
  * *Result:* Instantly updates the interactive accordion/dropdown syllabus on the course page, exactly in the order you set.

### Stage 5: Career Insights, Pricing & Testimonials
* **Career & Salary Insights (`careerInsights`):** 
  * *Result:* Fills a 3-column dashboard highlighting the average salary package, target job roles, and hiring domains.
* **Student Testimonials & Reviews (`testimonials`):**
  * *Result:* Adds student review cards to the page. You can use the drag-and-drop list widget to add review quotes, reviewer names, target placed companies, star ratings (1–5), and video review links.
* **Pricing Packages (`pricingTiers`):** Add training packages (e.g., *Live Online Batch*, *Self-Paced*).
  * *Result:* Generates distinct pricing cards/columns for students to compare plans.

### Stage 6: SEO & FAQs
* **Meta Title & Description (`metaTitle`, `metaDescription`):** 
  * *Result:* Controls exactly what text appears on Google Search results. Target 55–60 characters for the title and 145–160 for the description.
* **Frequently Asked Questions (`faqs`):** 
  * *Result:* Adds an interactive FAQ accordion to the bottom of the course page, which also helps SEO.

---

## 4. Writing & Publishing Blog Posts

The **Blog & Guides** collection allows you to publish fresh content, excellent for marketing and SEO.

1. **Add a New Post:** Click "Blog & Guides" -> **"New Blog"**.
2. **Title & Category:** Give your article a catchy headline and tag (e.g., `Tech News`).
  * *Result:* Groups the blog in the correct section on the main blog page.
3. **Excerpt:** A short 1-2 sentence summary.
  * *Result:* Displays under the title on the blog grid.
4. **Cover Image:** Upload a featured image (16:9 ratio).
  * *Result:* Becomes the main banner of the article and the thumbnail on social media sharing.
5. **Body Content:** Write your article using the rich text editor.

---

## 5. Updating Global Contact & Institute Settings

To change a phone number or update the office address globally:

1. Go to **Site Settings & Nav** in the left sidebar, then click **Navigation & Menus**.
2. **Top Bar Contacts:** Edit Primary Phone, Email, and Social Links.
  * *Result:* Instantly updates the clickable icons and text in the top navigation bar and footer across the entire site.
3. **Mega Menu Categories:** Add or edit dropdown links.
  * *Result:* Changes the desktop dropdown navigation menu links.
4. **Footer Settings:** Update the Ameerpet Office Address.
  * *Result:* Updates the physical address displayed at the bottom of every page.

---

## 6. Managing Static Pages (Home, About, Contact, Services)

The **Pages** collection contains the specific text and numbers for your core informational pages.

1. Go to the **Pages** collection in the left sidebar.
2. Select the page you want to edit (e.g., **Homepage Content**).
3. **Editing the Homepage:** Change fields like `Hero Title`, `Active Trainees Count`, or `Placement Rate`.
  * *Result:* These changes are immediately reflected in the large hero banner and statistics sections on `hopeinfotech.com`.
4. **Editing the Contact Page:** Update `Batch Hours` or `Helpline Numbers`.
  * *Result:* Modifies the specific text blocks shown to users when they visit the Contact Us page.

---

## 7. Content Best Practices & Media Guidelines

To keep the website looking premium and loading lightning-fast, follow these strict media guidelines:

| Asset / Content Type | Ideal Format & Dimensions | Max File Size | Best Practice / Rule |
| :--- | :--- | :--- | :--- |
| **Course Banners** | 16:9 Aspect Ratio (`1280x720` or `1920x1080`) WebP / PNG | < 500 KB | Always provide descriptive Alt Text |
| **Blog Featured Images** | 16:9 Aspect Ratio (`1200x675`) WebP / JPG | < 400 KB | High-contrast technical illustration |
| **YouTube Links** | Standard Watch / Share URLs | — | Must be public or unlisted (not private) |
| **Meta Titles** | 50 – 60 Characters | — | Include target keyword + "Hope InfoTech" |
| **Meta Descriptions** | 140 – 160 Characters | — | Include Ameerpet/Hyderabad + Call to action |

> [!TIP]
> **Image Optimization:** Use free online tools like [TinyPNG](https://tinypng.com/) or [Squoosh.app](https://squoosh.app/) to compress your images below the 500 KB limit before uploading them to the CMS.

---

## 8. Common Pitfalls & Troubleshooting Guide

Don't panic! If something isn't working as expected, check these common solutions:

### Changes Not Appearing Immediately
* **The Cause:** The website is ultra-fast because it generates static pages. When you click Publish, a Cloudflare Pages server has to rebuild the site, which takes about 90 seconds.
* **The Fix:** Wait 2 minutes, go to your live website, and perform a **Hard Refresh**:
  * Windows: `Ctrl + Shift + R`
  * Mac: `Cmd + Shift + R`

### Image Upload Failures
* **The Cause:** Servers hate spaces and special characters in file names.
* **The Fix:** Rename your image on your computer before uploading.
  * ❌ *Bad:* `IMG_2024(1) final!.png`
  * ✅ *Good:* `guidewire-banner.webp`

### YouTube Video Not Playing
* **The Cause:** The URL is a private video, a channel link, or a playlist link.
* **The Fix:** Ensure you are using the standard "Share" link for a single video. The video privacy setting on YouTube must be set to "Public" or "Unlisted".

### Draft vs. Published Status
* **The Issue:** You want to save your work but aren't ready to show it to the world.
* **The Fix:** Use the status dropdown at the top of the editor. Instead of "Publish", change the status to **"Draft"** and hit save. When you're ready to go live, change the status back to "Ready" or click Publish.
