import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

const courseDir = path.join(process.cwd(), 'src/content/courses');

async function populateCourses() {
  const files = await fs.readdir(courseDir);
  const mdFiles = files.filter(f => f.endsWith('.md'));

  let count = 0;
  for (const file of mdFiles) {
    const filePath = path.join(courseDir, file);
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = matter(content);
    
    // Existing core metadata
    const title = parsed.data.title || file.replace('.md', '');
    const category = parsed.data.category || 'other-tools';
    const slug = parsed.data.slug || file.replace('.md', '');
    
    // Update frontmatter non-destructively
    const updatedData = { ...parsed.data };
    
    // Section 1: Main / Hero Meta Chips
    updatedData.duration = '45-60 Hrs';
    updatedData.mode = 'Online Live Interactive';
    updatedData.rating = '4.9/5 (1,200+ Reviews)';
    updatedData.brochureUrl = 'https://drive.google.com/';

    // Section 2: Overview & Brochure
    updatedData.overview = `Master the core concepts of ${title} with our industry-aligned curriculum. This comprehensive program is designed to bridge the gap between theoretical knowledge and practical application in real-world enterprise environments.\n\nGain hands-on experience and deep technical expertise required to excel in modern ${category.replace(/-/g, ' ')} roles. Our expert-led sessions ensure you are well-prepared for industry challenges and certification exams.`;

    // Section 4: About Course
    updatedData.aboutCourse = `This ${title} training program offers a deep dive into the platform ecosystem and its architectural foundation. As organizations increasingly adopt enterprise solutions, professionals skilled in these technologies are in high demand.\n\nThroughout this course, you will explore the essential components, configuration strategies, and best practices for deploying robust applications. The curriculum is meticulously crafted to empower you with the skills needed to drive digital transformation and optimize business workflows.`;

    // Section 5: Course Objectives
    updatedData.objectives = [
      `Develop a comprehensive understanding of ${title} architecture and core functionalities.`,
      "Master hands-on configuration, customization, and live debugging techniques.",
      "Implement seamless API integrations with external enterprise systems.",
      "Design and deploy secure, scalable solutions following industry best practices.",
      "Prepare effectively for relevant certification exams with real-world case studies."
    ];

    // Section 6: Benefits (3 Containers)
    updatedData.benefits = {
      basicKnowledge: [
        "Strong foundation in OOP principles and enterprise patterns.",
        "Understanding of relational database fundamentals and data modeling.",
        "Familiarity with system workflows and business process automation."
      ],
      techSkills: [
        "Advanced custom module development and system configuration.",
        "Expertise in sandbox deployment and environment management.",
        "Integration of automated pipelines and continuous delivery practices."
      ],
      careerInterests: [
        "Accelerate your path to becoming an Enterprise Consultant.",
        "Unlock opportunities in high-demand Architect tracks.",
        "Enhance your marketability with specialized, industry-recognized skills."
      ]
    };

    // Section 7: Why Choose
    updatedData.whyChoose = [
      {
        title: "24/7 Cloud Sandbox Labs",
        description: "Get uninterrupted access to fully configured cloud environments for hands-on practice anytime, anywhere."
      },
      {
        title: "Practicing Enterprise Mentors",
        description: "Learn directly from active industry experts who bring real-world production experience into the classroom."
      },
      {
        title: "Resume & Mock Interviews",
        description: "Receive personalized guidance on resume building and participate in rigorous mock interviews."
      },
      {
        title: "100% Placement Support",
        description: "Benefit from our dedicated placement cell and strong industry connections to secure your dream role."
      }
    ];

    // Section 8: Eligibility
    updatedData.eligibility = [
      "Software Developers and Engineers looking to upskill.",
      "System Administrators transitioning to enterprise platforms.",
      "QA and Automation Engineers aiming for comprehensive technical knowledge.",
      "Fresh Graduates with a Computer Science background seeking specialized roles."
    ];

    // Section 9: Certifications
    updatedData.certifications = {
      title: `${title} Certified Professional`,
      description: "Earn verified credentials upon successful completion of the capstone project and practical lab assessments, validating your expertise to top employers.",
      badges: [
        "Core Configuration Specialist",
        "Implementation Expert Badge"
      ]
    };

    // Section 10: Job Roles
    updatedData.jobRoles = [
      "Senior Consultant",
      "Implementation Lead",
      "Platform Specialist",
      "Solutions Architect",
      "Technical Business Analyst"
    ];

    // Section 11: Trainer Profile
    updatedData.trainerProfile = {
      heading: "Learn from Practicing Enterprise Architects",
      description: "Our instructors are active industry leaders and enterprise consultants with a minimum of 10+ years of production experience.",
      highlights: [
        "10+ Years of Enterprise Production Experience",
        "Certified Subject Matter Experts in Consulting Roles",
        "Direct 1-on-1 Sandbox Debugging and Mentorship",
        "Real-world Case Studies & Architecture Reviews"
      ]
    };

    // Section 12: FAQs
    updatedData.faqs = [
      {
        question: "How long will I have access to the sandbox labs?",
        answer: "You will have 24/7 access to our cloud sandbox labs for the entire duration of the course and an additional 3 months post-completion."
      },
      {
        question: "Are there any prerequisites for this course?",
        answer: "Basic programming knowledge and an understanding of database concepts are recommended, but we cover the fundamentals early in the course to bring everyone up to speed."
      },
      {
        question: "What are the batch timings and format?",
        answer: "We offer flexible batch timings including weekends and evenings to accommodate working professionals. All sessions are conducted via online live interactive platforms."
      },
      {
        question: "Do you provide certification exam preparation?",
        answer: "Yes, our curriculum is aligned with the official certification objectives. We provide practice tests, study guides, and dedicated doubt-clearing sessions."
      }
    ];

    // Build new frontmatter string
    const newContent = matter.stringify(parsed.content, updatedData);
    
    await fs.writeFile(filePath, newContent, 'utf-8');
    count++;
  }
  
  console.log(`Successfully populated ${count} course files with dummy data.`);
}

populateCourses().catch(console.error);
