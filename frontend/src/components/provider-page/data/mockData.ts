import { IProviderData } from '../types';

export const PROVIDER_MOCK_DATA: Record<IProviderData['category'], IProviderData> = {
  Advocate: {
    id: 'prov_advocate_001',
    category: 'Advocate',
    themeColors: {
      primary: 'text-amber-600 dark:text-amber-400',
      primaryHover: 'hover:bg-amber-700 active:bg-amber-800',
      accentBg: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900/50',
      borderFocus: 'focus:border-amber-500 focus:ring-amber-500',
      buttonBg: 'bg-amber-600 text-white hover:bg-amber-750'
    },
    hero: {
      name: 'Rohan Malhotra & Associates',
      title: 'Senior Corporate & Civil Advocate',
      rating: 4.9,
      reviewCount: 142,
      experienceYears: 15,
      isVerified: true,
      location: 'Connaught Place, New Delhi',
      coverImage: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=1200&auto=format&fit=crop',
      profileImage: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=250&auto=format&fit=crop',
      shortIntro: 'Providing strategic counsel, robust courtroom representation, and comprehensive legal advisory services for corporate entities and private clients.',
      phone: '+919876543210',
      whatsapp: '+919876543210',
      email: 'rohan@malhotralaw.in'
    },
    about: {
      intro: 'Rohan Malhotra is a distinguished advocate specializing in Corporate Restructuring, Commercial Disputes, Real Estate laws, and Civil Litigation. Over the past 15 years, he has successfully represented Fortune 500 companies and high-net-worth individuals across major Indian High Courts and the Supreme Court.',
      experience: 'Established in 2011, Rohan Malhotra & Associates has grown from a single-lawyer practice into a full-service firm. We hold a track record of resolving over 90% of our commercial dispute filings favorably, prioritizing strategic negotiations before proceeding to lengthy litigation cycles.',
      mission: 'Our mission is to deliver result-oriented, ethical, and practical legal solutions. We protect our clients\' business interests and intellectual assets by combining detailed statutory knowledge with creative litigation tactics.',
      whyChooseIntro: 'When you are facing critical legal obstacles, having a dedicated partner with a deep understanding of corporate law and litigation cycles makes all the difference.'
    },
    whyChooseUs: [
      { id: 'wc1', title: 'Certified Experts', description: 'Members of the Supreme Court Bar Association with credentials from premier national law schools.', icon: 'award' },
      { id: 'wc2', title: 'Transparent Pricing', description: 'Detailed retainer agreements, clear billing cycles, and no hidden courtroom appearance fees.', icon: 'scale' },
      { id: 'wc3', title: 'Fast Response', description: 'Guaranteed 24-hour turnaround on document reviews and case assessment updates.', icon: 'clock' },
      { id: 'wc4', title: 'Personalized Consultation', description: 'One-on-one sessions directly with the senior advocate, never passed on to junior interns.', icon: 'user' }
    ],
    services: [
      { id: 'srv1', name: 'Corporate Compliance & Contracts', description: 'Drafting, reviewing, and negotiating shareholder agreements, vendor contracts, and vendor terms.', icon: 'document' },
      { id: 'srv2', name: 'Commercial Dispute Resolution', description: 'Representing clients in arbitration, mediation, and commercial litigation cycles for recovery and breach of contract.', icon: 'briefcase' },
      { id: 'srv3', name: 'Intellectual Property Protection', description: 'Filing trademark registrations, copyrights, and managing litigation related to patent infringement.', icon: 'shield' },
      { id: 'srv4', name: 'Real Estate & Due Diligence', description: 'Verifying property title deeds, drafting lease agreements, and resolving landlord-tenant disputes.', icon: 'home' }
    ],
    timeline: [
      { id: 't1', number: 1, title: 'Confidential Consultation', description: 'Schedule an in-person or virtual case review to detail legal problems and compile documents.' },
      { id: 't2', number: 2, title: 'Case Analysis & Strategy', description: 'Our legal experts study statutory provisions, evaluate past judgments, and outline primary options.' },
      { id: 't3', number: 3, title: 'Document Drafting & Prep', description: 'Compiling petitions, reply deeds, and contracts with absolute compliance to courtroom mandates.' },
      { id: 't4', number: 4, title: 'Representation / Execution', description: 'Filing cases in appropriate courts and representing your interests during hearings and trials.' }
    ],
    gallery: [
      { id: 'g1', url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?q=80&w=600&auto=format&fit=crop', caption: 'Our Executive Boardroom', tag: 'Office' },
      { id: 'g2', url: 'https://images.unsplash.com/photo-1505664194779-8bebcb95c504?q=80&w=600&auto=format&fit=crop', caption: 'Supreme Court Bar Association Membership Certificate', tag: 'Certificates' },
      { id: 'g3', url: 'https://images.unsplash.com/photo-1453728286471-6936c2dbb9a7?q=80&w=600&auto=format&fit=crop', caption: 'Consultation Session', tag: 'Team' },
      { id: 'g4', url: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=600&auto=format&fit=crop', caption: 'Extensive Law Library', tag: 'Office' }
    ],
    testimonials: [
      { id: 'ts1', customerName: 'Arjun Mehta', rating: 5, reviewText: 'Advocate Malhotra successfully navigated our company through a complex IP dispute. His legal acumen and strategic negotiations saved us months of trial and millions in settlement costs.', date: 'June 2026' },
      { id: 'ts2', customerName: 'Priya Sharma', rating: 5, reviewText: 'Highly professional firm. They reviewed our commercial property title deeds with immense detail. The transparent billing and clear timelines were incredibly refreshing.', date: 'May 2026' }
    ],
    faqs: [
      { id: 'f1', question: 'What are your consultation fees?', answer: 'We charge a flat fee for the initial case review session. Subsequent litigation costs are billed via structured retainers or per-hearing schedules detailed in our terms.' },
      { id: 'f2', question: 'Do you offer online legal consultations?', answer: 'Yes, we provide online consultation sessions via Google Meet and Zoom for clients based outside New Delhi.' }
    ],
    contact: {
      address: 'Suite 405, 4th Floor, Regal Building, Connaught Place, New Delhi - 110001',
      phone: '+91 98765 43210',
      email: 'contact@malhotralaw.in',
      website: 'www.malhotralaw.in',
      workingHours: [
        { day: 'Monday - Friday', hours: '9:30 AM - 7:00 PM' },
        { day: 'Saturday', hours: '10:00 AM - 3:00 PM' },
        { day: 'Sunday', hours: 'Closed' }
      ],
      mapPlaceholder: 'Regal Building, Connaught Place'
    },
    cta: {
      title: 'Protect Your Business and Legal Rights Today',
      description: 'Schedule a confidential consultation with Rohan Malhotra to evaluate your case details and outline the best path forward.',
      buttonText: 'Book Legal Consultation'
    }
  },
  Doctor: {
    id: 'prov_doctor_002',
    category: 'Doctor',
    themeColors: {
      primary: 'text-teal-600 dark:text-teal-400',
      primaryHover: 'hover:bg-teal-700 active:bg-teal-800',
      accentBg: 'bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 border-teal-250 dark:border-teal-900/50',
      borderFocus: 'focus:border-teal-500 focus:ring-teal-500',
      buttonBg: 'bg-teal-600 text-white hover:bg-teal-750'
    },
    hero: {
      name: 'Dr. Ananya Rao (MD, DNB)',
      title: 'Senior Consultant Endocrinologist',
      rating: 4.8,
      reviewCount: 312,
      experienceYears: 12,
      isVerified: true,
      location: 'Jayanagar 4th Block, Bengaluru',
      coverImage: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=1200&auto=format&fit=crop',
      profileImage: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?q=80&w=250&auto=format&fit=crop',
      shortIntro: 'Dedicated to providing comprehensive clinical care for diabetes, thyroid disorders, obesity, and hormone imbalances using evidence-based medical science.',
      phone: '+918023456789',
      whatsapp: '+919123456789',
      email: 'appointments@draoendocrine.com'
    },
    about: {
      intro: 'Dr. Ananya Rao is an endocrine specialist with over a decade of clinical experience. She completed her MBBS and MD from Topiwala National Medical College, Mumbai, followed by a DNB in Endocrinology from the prestigious National Board of Examinations. She specializes in managing Type 1 & 2 Diabetes and Gestational Diabetes.',
      experience: 'Over her career, Dr. Rao has successfully treated more than 8,000 patients with metabolic and thyroid disorders. She acts as a regular advisory board member for health education groups and believes in empowering patients with actionable lifestyle adjustments along with therapy.',
      mission: 'Our mission is to offer personalized, scientifically sound care templates to manage hormone disorders. We emphasize preventing clinical complications of diabetes by maintaining tightly controlled metabolic logs.',
      whyChooseIntro: 'Hormonal and diabetic disorders require persistent, highly customized care templates. We partner with you to align therapies with your daily routine.'
    },
    whyChooseUs: [
      { id: 'wc1', title: 'Experienced Professionals', description: 'Endocrinology fellowship trained with gold-medal credentials in metabolic research.', icon: 'award' },
      { id: 'wc2', title: 'Trusted Service', description: 'High rating scores based on verified patient checkups and follow-up success logs.', icon: 'shield' },
      { id: 'wc3', title: 'Personalized Consultation', description: 'Each consultation includes a detailed lifestyle review and custom diet structure setup.', icon: 'user' },
      { id: 'wc4', title: 'Quality Assurance', description: 'Adheres to global clinical guidelines set by the Endocrine Society and ADA.', icon: 'check-circle' }
    ],
    services: [
      { id: 'srv1', name: 'Comprehensive Diabetes Management', description: 'Insulin adjustment, Continuous Glucose Monitoring (CGM) analysis, and prevention of neuropathy and retinopathy.', icon: 'activity' },
      { id: 'srv2', name: 'Thyroid Care & Diagnostic Review', description: 'Treating Hypothyroidism, Hyperthyroidism, and managing thyroid nodules with ultrasound-guided biopsies.', icon: 'pulse' },
      { id: 'srv3', name: 'Obesity & Lifestyle Medicine', description: 'Medical weight loss therapies, dietary planning for insulin resistance, and metabolic syndrome recovery.', icon: 'heart' },
      { id: 'srv4', name: 'PCOS & Reproductive Health', description: 'Addressing cycle irregularities, hirsutism, and endocrine infertility using balanced pharmacological care.', icon: 'plus-circle' }
    ],
    timeline: [
      { id: 't1', number: 1, title: 'Initial Clinical Examination', description: 'Detailed review of patient medical logs, current symptoms, medication, and clinical history.' },
      { id: 't2', number: 2, title: 'Diagnostic Evaluation', description: 'Ordering target hormone profiles, glucose tolerance tests, or thyroid scans.' },
      { id: 't3', number: 3, title: 'Personalized Treatment Plan', description: 'Designing target medical prescriptions, physical schedules, and nutritional thresholds.' },
      { id: 't4', number: 4, title: 'Continuous Follow-ups', description: 'Periodic review of insulin profiles and hormone markers to safely adjust therapy doses.' }
    ],
    gallery: [
      { id: 'g1', url: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=600&auto=format&fit=crop', caption: 'Consultation & Clinic Space', tag: 'Office' },
      { id: 'g2', url: 'https://images.unsplash.com/photo-1579684389782-64d84b5e901a?q=80&w=600&auto=format&fit=crop', caption: 'Board Certification in Endocrinology', tag: 'Certificates' },
      { id: 'g3', url: 'https://images.unsplash.com/photo-1607619275066-c5e8d9b2440f?q=80&w=600&auto=format&fit=crop', caption: 'Diagnostic Equipment Room', tag: 'Office' },
      { id: 'g4', url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=600&auto=format&fit=crop', caption: 'Dr. Rao during Patient Briefing', tag: 'Team' }
    ],
    testimonials: [
      { id: 'ts1', customerName: 'Manish Kumar', rating: 5, reviewText: 'Dr. Rao helped me get my HbA1c down from 9.2 to 6.4 in 6 months. Her advice on diet adjustments and insulin timing was incredibly clear and helpful.', date: 'May 2026' },
      { id: 'ts2', customerName: 'Sujatha Iyer', rating: 4, reviewText: 'Finally a doctor who listens to symptoms patiently! Her diagnosis of my subclinical hypothyroidism was spot on, and I feel much more energetic now.', date: 'April 2026' }
    ],
    faqs: [
      { id: 'f1', question: 'How can I schedule an appointment?', answer: 'Click "Book Appointment" to choose an slot, or call our desk directly to secure a consultation token.' },
      { id: 'f2', question: 'Do I need to bring recent blood reports?', answer: 'Yes. If you have any blood tests (especially HbA1c, Thyroid profile, or Lipid logs) from the last 3 months, please bring them to your checkup.' }
    ],
    contact: {
      address: 'Arogya Endocrine Clinic, 14, 10th Main Road, Jayanagar 4th Block, Bengaluru - 560011',
      phone: '+91 80 2345 6789',
      email: 'appointments@draoendocrine.com',
      website: 'www.draoendocrine.com',
      workingHours: [
        { day: 'Monday - Saturday', hours: '8:30 AM - 1:30 PM, 4:30 PM - 7:30 PM' },
        { day: 'Sunday', hours: 'Emergency Only' }
      ],
      mapPlaceholder: 'Jayanagar 4th Block, Bengaluru'
    },
    cta: {
      title: 'Take Charge of Your Hormonal and Diabetic Health Today',
      description: 'Book an appointment with Dr. Rao for a personalized, comprehensive metabolic evaluation and clinical consultation.',
      buttonText: 'Book Medical Appointment'
    }
  },
  Architect: {
    id: 'prov_architect_003',
    category: 'Architect',
    themeColors: {
      primary: 'text-neutral-900 dark:text-neutral-100',
      primaryHover: 'hover:bg-neutral-800 active:bg-neutral-950',
      accentBg: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 border-neutral-300 dark:border-neutral-800',
      borderFocus: 'focus:border-neutral-800 focus:ring-neutral-800',
      buttonBg: 'bg-neutral-900 text-white hover:bg-neutral-950 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200'
    },
    hero: {
      name: 'Atelier Studio Architects',
      title: 'Principal Contemporary Architect',
      rating: 4.9,
      reviewCount: 94,
      experienceYears: 10,
      isVerified: true,
      location: 'Andheri West, Mumbai',
      coverImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop',
      profileImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=250&auto=format&fit=crop',
      shortIntro: 'Crafting sustainable, minimalist, and functional spaces that balance structural engineering, local ecology, and refined aesthetic design.',
      phone: '+919934567890',
      whatsapp: '+919934567890',
      email: 'hello@atelierstudio.arch'
    },
    about: {
      intro: 'Atelier Studio Architects, led by principal architect Maya Patel, is a boutique architectural practice specializing in bespoke residential villas, sustainable commercial complexes, and urban landscaping design.',
      experience: 'Founded in 2016, our studio has completed over 45 projects across Maharashtra and Goa. We have won multiple regional design awards for integrating rainwater harvesting and passive solar designs inside residential floorplans.',
      mission: 'Our mission is to create architectures that feel connected to their surroundings. We prioritize sourcing low-carbon materials, utilizing natural ventilation, and designing custom lighting layouts.',
      whyChooseIntro: 'Designing your dream space shouldn\'t be based on copy-paste floorplans. We build bespoke spatial designs centered around how you experience the space.'
    },
    whyChooseUs: [
      { id: 'wc1', title: 'Experienced Professionals', description: 'Council of Architecture (COA) registered with specialized training in LEED design.', icon: 'award' },
      { id: 'wc2', title: 'Quality Assurance', description: 'End-to-end site supervision to verify materials and contractor execution meet specifications.', icon: 'check-circle' },
      { id: 'wc3', title: 'Trusted Service', description: 'Highly rated portfolio showcasing successful project delivery and transparent construction logs.', icon: 'shield' },
      { id: 'wc4', title: 'Personalized Consultation', description: 'Direct collaborative design sessions with Principal Architect Maya Patel.', icon: 'user' }
    ],
    services: [
      { id: 'srv1', name: 'Residential Architecture', description: 'Designing custom single-family houses, luxury villas, and multi-unit apartment complexes with 3D elevations.', icon: 'home' },
      { id: 'srv2', name: 'Sustainable Commercial Spaces', description: 'Modern open-plan offices, boutique retail outlets, and green spaces designed for maximum layout efficiency.', icon: 'briefcase' },
      { id: 'srv3', name: 'Landscape & Ecological Design', description: 'Designing outdoor gardens, courtyards, and vertical plantings integrated with local weather parameters.', icon: 'activity' },
      { id: 'srv4', name: 'Renovations & Structural Audits', description: 'Restoring heritage houses, spatial restructuring, and upgrading building load performance.', icon: 'document' }
    ],
    timeline: [
      { id: 't1', number: 1, title: 'Briefing & Site Analysis', description: 'Analyzing site parameters, evaluating local municipal guidelines, and outlining your project goals.' },
      { id: 't2', number: 2, title: 'Concept Sketches & Layout', description: 'Developing schematic floor plans, exploring spatial volumes, and proposing building elevations.' },
      { id: 't3', number: 3, title: '3D Renderings & Detail Drawing', description: 'Creating photo-realistic 3D elevations and detailing structural, electrical, and plumbing drawings.' },
      { id: 't4', number: 4, title: 'Tender & Site Supervision', description: 'Assisting in contractor selection and performing periodic site inspections to ensure structural alignment.' }
    ],
    gallery: [
      { id: 'g1', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=600&auto=format&fit=crop', caption: 'The Alibaug Minimalist Villa', tag: 'Projects' },
      { id: 'g2', url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=600&auto=format&fit=crop', caption: 'Principal Architect at drawing table', tag: 'Team' },
      { id: 'g3', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=600&auto=format&fit=crop', caption: 'Our Design Studio Space', tag: 'Office' },
      { id: 'g4', url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=600&auto=format&fit=crop', caption: 'COA Practice License & LEED credentials', tag: 'Certificates' }
    ],
    testimonials: [
      { id: 'ts1', customerName: 'Vikram Salgaonkar', rating: 5, reviewText: 'Atelier Studio designed our villa in Alibaug. They were brilliant at positioning windows to catch breezes, keeping the house cool during summers without heavy AC usage.', date: 'May 2026' },
      { id: 'ts2', customerName: 'Ridhima Shah', rating: 5, reviewText: 'Extremely professional and details-driven team. Their construction drawings were so detailed that the contractor had no doubts on site. Highly recommend!', date: 'March 2026' }
    ],
    faqs: [
      { id: 'f1', question: 'Do you assist with local municipal building approvals?', answer: 'Yes, we draft all statutory compliance drawings and coordinate with municipal agents to secure municipal approval permissions.' },
      { id: 'f2', question: 'What are your architectural design fees?', answer: 'Our fees are computed as a percentage of the total estimated construction cost, or billed as a fixed design retainer, based on project scale.' }
    ],
    contact: {
      address: 'Studio 201, Axis Business Park, Link Road, Andheri West, Mumbai - 400053',
      phone: '+91 99345 67890',
      email: 'hello@atelierstudio.arch',
      website: 'www.atelierstudio.arch',
      workingHours: [
        { day: 'Monday - Friday', hours: '10:00 AM - 6:30 PM' },
        { day: 'Saturday', hours: '10:00 AM - 2:00 PM' },
        { day: 'Sunday', hours: 'Closed' }
      ],
      mapPlaceholder: 'Axis Business Park, Andheri West'
    },
    cta: {
      title: 'Ready to Shape Your Architectural Vision?',
      description: 'Schedule a discovery call with Maya Patel to discuss site parameters, layout ideas, and project budgets.',
      buttonText: 'Book Architecture Discovery Call'
    }
  },
  'Chartered Accountant': {
    id: 'prov_ca_004',
    category: 'Chartered Accountant',
    themeColors: {
      primary: 'text-indigo-600 dark:text-indigo-400',
      primaryHover: 'hover:bg-indigo-700 active:bg-indigo-800',
      accentBg: 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/50',
      borderFocus: 'focus:border-indigo-500 focus:ring-indigo-500',
      buttonBg: 'bg-indigo-600 text-white hover:bg-indigo-750'
    },
    hero: {
      name: 'V. K. Singhal & Co. (CAs)',
      title: 'Principal Chartered Accountant',
      rating: 4.9,
      reviewCount: 220,
      experienceYears: 18,
      isVerified: true,
      location: 'Sector 62, Noida',
      coverImage: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1200&auto=format&fit=crop',
      profileImage: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?q=80&w=250&auto=format&fit=crop',
      shortIntro: 'Providing certified financial auditing, taxation structuring, GST compliance audits, and strategic corporate wealth advisory services.',
      phone: '+911204567890',
      whatsapp: '+919811122233',
      email: 'contact@vksinghalca.com'
    },
    about: {
      intro: 'V. K. Singhal & Co. is a leading chartered accountancy firm headed by CA Varun Singhal. We specialize in statutory audits, international taxation planning, GST filing, and transfer pricing. We cater to startups, mid-sized enterprises, and corporate groups.',
      experience: 'Operating since 2008, CA Varun Singhal has guided over 350 companies through tax audits and structural audits. The firm features a dedicated compliance team of 15 members with expertise in managing complex MCA filings and corporate restructuring.',
      mission: 'Our mission is to help businesses optimize their taxation structures while staying 100% compliant with ever-evolving tax codes. We prioritize building clear financial visibility for growth.',
      whyChooseIntro: 'Navigating financial audits and GST structures can be overwhelming. We handle the numbers so you can focus on building your business.'
    },
    whyChooseUs: [
      { id: 'wc1', title: 'Certified Experts', description: 'Fellow Members of ICAI with specialized diplomas in corporate finance laws.', icon: 'award' },
      { id: 'wc2', title: 'Trusted Service', description: 'Consistently rated 5 stars by verified businesses for audit transparency.', icon: 'shield' },
      { id: 'wc3', title: 'Transparent Pricing', description: 'Clear quotes and annual pricing slabs without any unexpected billing spikes.', icon: 'scale' },
      { id: 'wc4', title: 'Fast Response', description: 'Dedicated account managers responding to urgent accounting filings within 4 hours.', icon: 'clock' }
    ],
    services: [
      { id: 'srv1', name: 'Tax Audit & Statutory Audits', description: 'Conducting comprehensive audits, filing income tax returns, and validating corporate financial balance sheets.', icon: 'activity' },
      { id: 'srv2', name: 'GST Compliance & Filing', description: 'Handling GST registration, filing monthly/quarterly returns, and representing clients in GST assessments.', icon: 'document' },
      { id: 'srv3', name: 'Corporate Structuring & Advisory', description: 'Assisting with startup setup, MCA registration, shareholder structuring, and valuations.', icon: 'briefcase' },
      { id: 'srv4', name: 'Wealth & Investment Management', description: 'Designing corporate tax-saving strategies, compliance structuring, and managing wealth portfolios.', icon: 'heart' }
    ],
    timeline: [
      { id: 't1', number: 1, title: 'Financial Document Review', description: 'Gathering current bank ledgers, tax history files, and company transaction reports.' },
      { id: 't2', number: 2, title: 'Gap Analysis & Planning', description: 'Evaluating tax deductions, checking regulatory compliance gaps, and outlining a tax plan.' },
      { id: 't3', number: 3, title: 'Filing & Reconciliation', description: 'Reconciling ledger entries, filing returns, and compiling the audit report documents.' },
      { id: 't4', number: 4, title: 'Certification & Final Reports', description: 'Issuing audit certificates, signing off balance sheets, and delivering future compliance timelines.' }
    ],
    gallery: [
      { id: 'g1', url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=600&auto=format&fit=crop', caption: 'Principal CA Varun Singhal in Office', tag: 'Team' },
      { id: 'g2', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=600&auto=format&fit=crop', caption: 'Noida Office Reception Area', tag: 'Office' },
      { id: 'g3', url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=600&auto=format&fit=crop', caption: 'ICAI Fellowship Certificate Plaque', tag: 'Certificates' },
      { id: 'g4', url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?q=80&w=600&auto=format&fit=crop', caption: 'Financial Strategy Meeting', tag: 'Team' }
    ],
    testimonials: [
      { id: 'ts1', customerName: 'Rajesh Goel', rating: 5, reviewText: 'CA Singhal completely streamlined our GST filing process. Their reconciliation team is extremely fast and found errors that saved us substantial penalty fees.', date: 'May 2026' },
      { id: 'ts2', customerName: 'Komal Gupta', rating: 5, reviewText: 'Varun helped us during our seed funding round by executing a solid business valuation report that satisfied our investors. Highly professional!', date: 'April 2026' }
    ],
    faqs: [
      { id: 'f1', question: 'How do you charge for your services?', answer: 'For standard compliance filings (e.g., GST or Income Tax), we offer flat-rate packages. Audits and startup consulting are priced based on transaction volumes.' },
      { id: 'f2', question: 'Can you help with MCA registrations?', answer: 'Yes, we handle the entire process of registering Private Limited Companies, LLPs, and securing DIN and DSC tokens.' }
    ],
    contact: {
      address: 'Office 304, Stellar IT Tower B, Sector 62, Noida, Uttar Pradesh - 201301',
      phone: '+91 120 456 7890',
      email: 'contact@vksinghalca.com',
      website: 'www.vksinghalca.com',
      workingHours: [
        { day: 'Monday - Saturday', hours: '9:30 AM - 6:30 PM' },
        { day: 'Sunday', hours: 'Closed' }
      ],
      mapPlaceholder: 'Stellar IT Tower, Sector 62, Noida'
    },
    cta: {
      title: 'Align Your Financial Compliance with Corporate Standards Today',
      description: 'Book an advisory meeting with CA Varun Singhal to review tax filings, business audits, and corporate accounting workflows.',
      buttonText: 'Book Accounting Consultation'
    }
  },
  'Interior Designer': {
    id: 'prov_interior_005',
    category: 'Interior Designer',
    themeColors: {
      primary: 'text-rose-600 dark:text-rose-400',
      primaryHover: 'hover:bg-rose-700 active:bg-rose-800',
      accentBg: 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900/50',
      borderFocus: 'focus:border-rose-500 focus:ring-rose-500',
      buttonBg: 'bg-rose-600 text-white hover:bg-rose-750'
    },
    hero: {
      name: 'Spazio Creative Interiors',
      title: 'Principal Interior & Furniture Designer',
      rating: 4.9,
      reviewCount: 88,
      experienceYears: 8,
      isVerified: true,
      location: 'Koregaon Park, Pune',
      coverImage: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?q=80&w=1200&auto=format&fit=crop',
      profileImage: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=250&auto=format&fit=crop',
      shortIntro: 'Designing warm, luxury, and ergonomic residential interiors that reflect your personal lifestyle and maximize spatial functionality.',
      phone: '+919822011223',
      whatsapp: '+919822011223',
      email: 'design@spaziocreative.in'
    },
    about: {
      intro: 'Spazio Creative Interiors, led by lead designer Aisha Deshmukh, specializes in contemporary residential interior design, customized modular kitchens, smart lighting setups, and handcrafted furniture design.',
      experience: 'Over the past 8 years, Aisha and her team have designed more than 60 high-end apartments and villas in Pune and Mumbai. Their works have been featured in premier architecture and home design journals for smart space layouts.',
      mission: 'Our mission is to create spaces that feel like home. We focus on matching textures, choosing colors, and selecting lighting layouts to create a cohesive design system for your space.',
      whyChooseIntro: 'Your home is a reflection of your personality. We collaborate closely to translate your design ideas into functional, beautifully detailed realities.'
    },
    whyChooseUs: [
      { id: 'wc1', title: 'Experienced Professionals', description: 'Award-winning design team with degrees in interior design and spatial planning.', icon: 'award' },
      { id: 'wc2', title: 'Personalized Consultation', description: 'Every design proposal includes custom moodboards and detailed fabric selection catalogs.', icon: 'user' },
      { id: 'wc3', title: 'Trusted Service', description: 'Consistently high rating reviews reflecting transparent pricing and timeline delivery.', icon: 'shield' },
      { id: 'wc4', title: 'Quality Assurance', description: 'Exclusive ties with certified carpenters and premium material suppliers.', icon: 'check-circle' }
    ],
    services: [
      { id: 'srv1', name: 'Residential Staging & Design', description: 'Full-home interior layouts, concept moodboards, wall decorations, and custom color scheme selections.', icon: 'home' },
      { id: 'srv2', name: 'Custom Modular Kitchens', description: 'Designing ergonomic kitchen layouts with premium fittings, pull-out storage, and heat-resistant countertops.', icon: 'briefcase' },
      { id: 'srv3', name: 'Lighting & Acoustic Layouts', description: 'Integrating layered lighting (ambient, task, accent) and acoustic insulation inside living spaces.', icon: 'activity' },
      { id: 'srv4', name: 'Bespoke Furniture Design', description: 'Crafting custom dining sets, wardrobes, and TV units designed to fit your room dimensions perfectly.', icon: 'document' }
    ],
    timeline: [
      { id: 't1', number: 1, title: 'Concept Discussion & Layout', description: 'Discussing design styles, analyzing your lifestyle flow, and taking room dimensions.' },
      { id: 't2', number: 2, title: 'Moodboard & Material Choice', description: 'Creating conceptual boards, matching fabric textures, and selecting paint swatches.' },
      { id: 't3', number: 3, title: '3D Views & Budget Outline', description: 'Generating detailed 3D renderings of proposed room layouts and locking the cost estimate.' },
      { id: 't4', number: 4, title: 'Execution & Styling', description: 'Supervising carpentry, installing modular structures, and placing decorative accents for handover.' }
    ],
    gallery: [
      { id: 'g1', url: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?q=80&w=600&auto=format&fit=crop', caption: 'The Koregaon Park Apartment Living Room', tag: 'Projects' },
      { id: 'g2', url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=600&auto=format&fit=crop', caption: 'Modern Modular Kitchen Project', tag: 'Projects' },
      { id: 'g3', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=600&auto=format&fit=crop', caption: 'Aisha Deshmukh detailing material catalog', tag: 'Team' },
      { id: 'g4', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=600&auto=format&fit=crop', caption: 'Spazio Pune Design Office', tag: 'Office' }
    ],
    testimonials: [
      { id: 'ts1', customerName: 'Neha Kulkarni', rating: 5, reviewText: 'Aisha converted our 3BHK into a cozy Scandinavian haven. Her modular kitchen layout is exceptionally functional and has made cooking a complete joy.', date: 'May 2026' },
      { id: 'ts2', customerName: 'Rahul Varma', rating: 5, reviewText: 'Excellent attention to lighting and detail. The 3D views she provided were exactly matching the final handover. Extremely satisfied with their professionalism.', date: 'March 2026' }
    ],
    faqs: [
      { id: 'f1', question: 'Do you design single rooms or only full houses?', answer: 'We primarily execute full home interior solutions (2BHK and above), but we do take up single modular kitchen projects based on calendar availability.' },
      { id: 'f2', question: 'How long does a typical interior execution take?', answer: 'A standard 3BHK interior execution takes about 60 to 75 working days from locking the design and material selections.' }
    ],
    contact: {
      address: 'Plot 12, Lane 5, South Main Road, Koregaon Park, Pune, Maharashtra - 411001',
      phone: '+91 98220 11223',
      email: 'design@spaziocreative.in',
      website: 'www.spaziocreative.in',
      workingHours: [
        { day: 'Monday - Saturday', hours: '10:00 AM - 7:00 PM' },
        { day: 'Sunday', hours: 'Closed' }
      ],
      mapPlaceholder: 'Koregaon Park, Pune'
    },
    cta: {
      title: 'Let\'s Design Your Ideal Home and Living Space',
      description: 'Book a design consultation with Aisha to explore floorplan concepts, select textures, and plan your execution budgets.',
      buttonText: 'Book Design Consultation'
    }
  },
  Electrician: {
    id: 'prov_electrician_006',
    category: 'Electrician',
    themeColors: {
      primary: 'text-amber-500 dark:text-amber-400',
      primaryHover: 'hover:bg-amber-600 active:bg-amber-700',
      accentBg: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-250 dark:border-amber-900/50',
      borderFocus: 'focus:border-amber-500 focus:ring-amber-500',
      buttonBg: 'bg-amber-500 text-white hover:bg-amber-600'
    },
    hero: {
      name: 'PowerFix Electrical Services',
      title: 'Licensed Master Electrician',
      rating: 4.7,
      reviewCount: 198,
      experienceYears: 9,
      isVerified: true,
      location: 'Salt Lake Sector 1, Kolkata',
      coverImage: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=1200&auto=format&fit=crop',
      profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=250&auto=format&fit=crop',
      shortIntro: 'Certified and licensed electrical installation, wiring repairs, safety audits, and smart home lighting integrations for homes and commercial offices.',
      phone: '+919830011223',
      whatsapp: '+919830011223',
      email: 'service@powerfixelectrical.in'
    },
    about: {
      intro: 'PowerFix Electrical Services is managed by master electrician Joydeb Das, holding a state government electrical licensing board certification. We handle emergency short-circuit repairs, switchboard wiring, DB board upgrades, and solar inverter installations.',
      experience: ' Joydeb has been servicing Salt Lake and Newtown areas since 2017. Backed by a team of 4 certified assistant wiremen, they have successfully completed over 1,200 residential wiring overhauls and office safety audits.',
      mission: 'Our mission is to guarantee electrical safety and load optimization. We strictly use ISI-certified fire-retardant copper wires, premium copper lugs, and reliable circuit breakers to prevent fire hazards.',
      whyChooseIntro: 'Electrical systems are the heart of your home\'s safety. Don\'t compromise with unsafe, uncertified wiring hacks.'
    },
    whyChooseUs: [
      { id: 'wc1', title: 'Certified Experts', description: 'Government licensed master wiremen with extensive high-voltage training.', icon: 'award' },
      { id: 'wc2', title: 'Fast Response', description: 'Emergency short-circuit dispatch within Salt Lake in 45 minutes.', icon: 'clock' },
      { id: 'wc3', title: 'Transparent Pricing', description: 'Fixed price list per point wiring, no hidden calculations or hourly tricks.', icon: 'scale' },
      { id: 'wc4', title: 'Quality Assurance', description: 'All installations are backed by our 90-day service warranty.', icon: 'check-circle' }
    ],
    services: [
      { id: 'srv1', name: 'Emergency Breakdown & Repairs', description: 'Diagnosing power trips, finding phase leaks, replacing melted fuses, and resolving short-circuits.', icon: 'activity' },
      { id: 'srv2', name: 'Full House Re-Wiring', description: 'Replacing outdated aluminum wires with fire-retardant copper wiring and updating earthing pits.', icon: 'home' },
      { id: 'srv3', name: 'DB Board & MCB Installation', description: 'Upgrading distribution boards, installing RCCB leak-breakers, and balancing three-phase load structures.', icon: 'shield' },
      { id: 'srv4', name: 'Smart Home Automation', description: 'Installing app-controlled smart switches, dimmers, motion sensors, and smart ceiling fan controllers.', icon: 'briefcase' }
    ],
    timeline: [
      { id: 't1', number: 1, title: 'Inquiry & Issue Diagnosis', description: 'Call us to describe your electrical problem, or book online for a detailed inspection checkup.' },
      { id: 't2', number: 2, title: 'Cost Estimate Approval', description: 'We diagnose the issue on-site and present a detailed cost estimation for materials and labor.' },
      { id: 't3', number: 3, title: 'Execution & Wiring Repairs', description: 'JOYDEB and team isolate power circuits and execute wiring fixes following safety protocols.' },
      { id: 't4', number: 4, title: 'Safety Test & Handover', description: 'We verify phase voltages, execute leakage tests, clean up wiring conduits, and power on.' }
    ],
    gallery: [
      { id: 'g1', url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=600&auto=format&fit=crop', caption: 'Joydeb auditing main DB board panel', tag: 'Work' },
      { id: 'g2', url: 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?q=80&w=600&auto=format&fit=crop', caption: 'Smart Switch Installation Project', tag: 'Work' },
      { id: 'g3', url: 'https://images.unsplash.com/photo-1621905252485-3941a6e54542?q=80&w=600&auto=format&fit=crop', caption: 'Government Licensed Contractor License', tag: 'Certificates' },
      { id: 'g4', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop', caption: 'Joydeb and wiring crew', tag: 'Team' }
    ],
    testimonials: [
      { id: 'ts1', customerName: 'Sayan Banerjee', rating: 5, reviewText: 'Our main distribution board had a major short-circuit late in the evening. Joydeb arrived in 30 minutes, isolated the burnt phase, and replaced the MCB quickly. Amazing emergency service!', date: 'May 2026' },
      { id: 'ts2', customerName: 'Anindita Sen', rating: 5, reviewText: 'Joydeb executed the full wiring overhaul for our old apartment. The team was extremely neat, routing cables through conduits properly. Excellent and clean work.', date: 'April 2026' }
    ],
    faqs: [
      { id: 'f1', question: 'Do you charge a visiting fee?', answer: 'We charge a minimal inspection fee for diagnostics. If you proceed with our repair estimate, the visiting fee is waived off from the final bill.' },
      { id: 'f2', question: 'Do you handle commercial office wiring?', answer: 'Yes, we take up commercial office wiring, single-phase to three-phase conversion, and server-room power back-up cabling.' }
    ],
    contact: {
      address: 'Block DA 45, Salt Lake Sector 1, near Swimming Pool, Kolkata - 700064',
      phone: '+91 98300 11223',
      email: 'service@powerfixelectrical.in',
      website: 'www.powerfixelectrical.in',
      workingHours: [
        { day: 'Monday - Sunday', hours: '8:00 AM - 8:00 PM (Emergency Dispatch 24/7)' }
      ],
      mapPlaceholder: 'Salt Lake Sector 1, Swimming Pool, Kolkata'
    },
    cta: {
      title: 'Secure Your Home Against Electrical Hazards',
      description: 'Book Joydeb for a full electrical safety check, load evaluation, or smart home integration today.',
      buttonText: 'Book Electrical Service'
    }
  },
  Tutor: {
    id: 'prov_tutor_007',
    category: 'Tutor',
    themeColors: {
      primary: 'text-emerald-600 dark:text-emerald-400',
      primaryHover: 'hover:bg-emerald-700 active:bg-emerald-800',
      accentBg: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-250 dark:border-emerald-900/50',
      borderFocus: 'focus:border-emerald-500 focus:ring-emerald-500',
      buttonBg: 'bg-emerald-600 text-white hover:bg-emerald-750'
    },
    hero: {
      name: 'Apex Academy (by Prof. Nair)',
      title: 'Senior Mathematics & Physics Tutor',
      rating: 4.9,
      reviewCount: 165,
      experienceYears: 14,
      isVerified: true,
      location: 'Kalyan Nagar, Bengaluru',
      coverImage: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?q=80&w=1200&auto=format&fit=crop',
      profileImage: 'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?q=80&w=250&auto=format&fit=crop',
      shortIntro: 'Specialized conceptual coaching in Advanced Calculus, Mechanics, and Algebra for Grade 11-12 and JEE Entrance preparation.',
      phone: '+919945671234',
      whatsapp: '+919945671234',
      email: 'classes@apexacademy.in'
    },
    about: {
      intro: 'Prof. Nair is a passionate educator holding a Master\'s degree in Mathematics from IIT Madras. He founded Apex Academy to bridge the gap between rote-learning and structural conceptual understanding, helping students crack elite competitive exams.',
      experience: 'Having coached over 2,200 students over 14 years, Prof. Nair has a track record of students securing 99+ percentiles in JEE Main & Advanced. He focuses on deriving concepts from scratch and building problem-solving intuition.',
      mission: 'Our mission is to make advanced science and math accessible and engaging. We emphasize logical deduction, daily practice sheets, and individual attention to clear doubts.',
      whyChooseIntro: 'Cracking competitive exams requires more than memorizing formulas. It requires a mentor who can build your problem-solving confidence.'
    },
    whyChooseUs: [
      { id: 'wc1', title: 'Experienced Professionals', description: 'IIT alumni tutor with 14+ years of proven entrance exam coaching success.', icon: 'award' },
      { id: 'wc2', title: 'Personalized Consultation', description: 'Weekly doubt-clearing sessions and individual performance logs.', icon: 'user' },
      { id: 'wc3', title: 'Trusted Service', description: 'Highly rated by parents for building student interest and exam marks.', icon: 'shield' },
      { id: 'wc4', title: 'Customer Satisfaction', description: 'Detailed feedback reports shared with parents after every monthly exam.', icon: 'check-circle' }
    ],
    services: [
      { id: 'srv1', name: 'JEE Main & Advanced Mathematics', description: 'Calculus, Trigonometry, Coordinate Geometry, and Algebra conceptual modules with exam practice.', icon: 'activity' },
      { id: 'srv2', name: 'Grade 11 & 12 Board Coaching', description: 'Comprehensive CBSE, ISC, and Karnataka state board math and physics preparation.', icon: 'home' },
      { id: 'srv3', name: 'Mechanics & Electrostatics (Physics)', description: 'Building visual intuition for vector diagrams, electrical circuits, and rotational dynamics.', icon: 'shield' },
      { id: 'srv4', name: 'Doubt Clearing & Test Series', description: 'Exclusive weekend doubt-clearing sessions and simulated mock tests with analysis.', icon: 'document' }
    ],
    timeline: [
      { id: 't1', number: 1, title: 'Diagnostic Assessment', description: 'Student takes a short diagnostic test to evaluate basic algebra and physics concepts.' },
      { id: 't2', number: 2, title: 'Study Plan Customization', description: 'Aligning weekly session schedules based on board exams and target entrance goals.' },
      { id: 't3', number: 3, title: 'Concept Lectures & Practice', description: 'Participating in classroom lectures, derivation reviews, and solving daily practice sheets.' },
      { id: 't4', number: 4, title: 'Mock Exams & Review', description: 'Executing timed test series, reviewing mistakes, and tuning solving speeds.' }
    ],
    gallery: [
      { id: 'g1', url: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?q=80&w=600&auto=format&fit=crop', caption: 'Prof. Nair during a Calculus Lecture', tag: 'Team' },
      { id: 'g2', url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=600&auto=format&fit=crop', caption: 'Kalyan Nagar Study Hall Classroom', tag: 'Office' },
      { id: 'g3', url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=600&auto=format&fit=crop', caption: 'IIT Madras Degree & Teaching Excellence Awards', tag: 'Certificates' },
      { id: 'g4', url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=600&auto=format&fit=crop', caption: 'Doubt clearing panel session', tag: 'Team' }
    ],
    testimonials: [
      { id: 'ts1', customerName: 'Siddharth Nair (Student)', rating: 5, reviewText: 'Calculus always terrified me, but Prof. Nair derived every limit and derivative visually. I scored 99.2 percentile in JEE Math because of his classes!', date: 'June 2026' },
      { id: 'ts2', customerName: 'Mrs. Rekha Krishnan (Parent)', rating: 5, reviewText: 'Prof. Nair is extremely committed. He shares detailed feedback every month and stays back after classes to clear individual student doubts.', date: 'May 2026' }
    ],
    faqs: [
      { id: 'f1', question: 'Do you offer online classes?', answer: 'Yes, we run live interactive online classes on Zoom alongside our physical classroom batches at Kalyan Nagar.' },
      { id: 'f2', question: 'What is the batch size for physical classes?', answer: 'To ensure individual attention, we restrict physical classroom batches to a maximum of 15 students per class.' }
    ],
    contact: {
      address: 'Apex Academy, 2nd Floor, Royal Arcade, Kalyan Nagar Outer Ring Road, Bengaluru - 560043',
      phone: '+91 99456 71234',
      email: 'classes@apexacademy.in',
      website: 'www.apexacademy.in',
      workingHours: [
        { day: 'Monday - Friday', hours: '4:00 PM - 8:30 PM (Evening Batches)' },
        { day: 'Saturday', hours: '9:00 AM - 5:00 PM (Mock Exams)' },
        { day: 'Sunday', hours: 'Closed' }
      ],
      mapPlaceholder: 'Outer Ring Road, Kalyan Nagar, Bengaluru'
    },
    cta: {
      title: 'Master Advanced Concepts and Crack Competitive Exams Today',
      description: 'Book a free demo class with Prof. Nair to evaluate your learning pace and discover problem-solving techniques.',
      buttonText: 'Book Free Demo Class'
    }
  },
  Consultant: {
    id: 'prov_consultant_008',
    category: 'Consultant',
    themeColors: {
      primary: 'text-slate-800 dark:text-slate-200',
      primaryHover: 'hover:bg-slate-700 active:bg-slate-900',
      accentBg: 'bg-slate-50 text-slate-800 dark:bg-slate-950/40 dark:text-slate-300 border-slate-200 dark:border-slate-850',
      borderFocus: 'focus:border-slate-500 focus:ring-slate-500',
      buttonBg: 'bg-slate-800 text-white hover:bg-slate-900 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200'
    },
    hero: {
      name: 'Vantage Growth Advisors',
      title: 'Business Strategy & Scaling Consultant',
      rating: 4.9,
      reviewCount: 110,
      experienceYears: 16,
      isVerified: true,
      location: 'BKC (Bandar Kurla Complex), Mumbai',
      coverImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1200&auto=format&fit=crop',
      profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=250&auto=format&fit=crop',
      shortIntro: 'Helping startups and mid-sized enterprises build product-market fit, design scaling structures, optimize operations, and secure funding.',
      phone: '+919920011223',
      whatsapp: '+919920011223',
      email: 'advisory@vantagegrowth.in'
    },
    about: {
      intro: 'Vantage Growth Advisors is led by principal consultant Sandeep Sen, an MBA alumnus of ISB Hyderabad with 16 years of strategic consulting experience at top-tier international advisory groups.',
      experience: 'Sandeep has advised over 120 companies on market entry, sales restructuring, and business design. Under his guidance, client startups have raised a combined total of $40M in venture capital funding.',
      mission: 'Our mission is to help companies cross the chasm from early product adoption to scalable operations. We prioritize building clear unit economics and robust, data-driven sales engines.',
      whyChooseIntro: 'Scaling a business requires structured processes and growth tactics. We offer actionable strategy playbooks instead of generic corporate templates.'
    },
    whyChooseUs: [
      { id: 'wc1', title: 'Certified Experts', description: 'Consultants with degrees from premier global business schools and corporate backgrounds.', icon: 'award' },
      { id: 'wc2', title: 'Trusted Service', description: 'Track record of growing client revenues by over 40% on average within 12 months.', icon: 'shield' },
      { id: 'wc3', title: 'Personalized Consultation', description: 'Direct advisory sprints, weekly review calls, and collaborative whiteboard sessions.', icon: 'user' },
      { id: 'wc4', title: 'Customer Satisfaction', description: 'Highly rated by founders and corporate executives for bringing operational clarity.', icon: 'check-circle' }
    ],
    services: [
      { id: 'srv1', name: 'Product-Market Fit & GTM Strategy', description: 'Auditing user feedback, tuning product pricing, and planning Go-To-Market launches.', icon: 'briefcase' },
      { id: 'srv2', name: 'Sales & Revenue Operations', description: 'Designing sales pipelines, training account executives, and optimizing CRM tracking dashboards.', icon: 'activity' },
      { id: 'srv3', name: 'Investor Pitching & Valuations', description: 'Building investor pitchdecks, compiling financial models, and negotiating term-sheet clauses.', icon: 'document' },
      { id: 'srv4', name: 'Operational Audits & Restructuring', description: 'Evaluating business costs, restructuring software stack subscriptions, and optimizing operating cash flows.', icon: 'shield' }
    ],
    timeline: [
      { id: 't1', number: 1, title: 'Discovery & Business Audit', description: 'Reviewing current revenues, mapping sales data, and identifying primary scaling blocks.' },
      { id: 't2', number: 2, title: 'Strategic Roadmap Design', description: 'Building detailed playbooks for pricing, marketing, and operational restructuring.' },
      { id: 't3', number: 3, title: 'Sprint Execution & Training', description: 'Collaborating with your core team, setting up sales pipelines, and launching CRM tracking.' },
      { id: 't4', number: 4, title: 'Optimization & Review', description: 'Reviewing weekly performance metrics, adjusting pitch scripts, and locking down operational templates.' }
    ],
    gallery: [
      { id: 'g1', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=600&auto=format&fit=crop', caption: 'Collaborative Whiteboard Session at BKC', tag: 'Work' },
      { id: 'g2', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=600&auto=format&fit=crop', caption: 'Vantage Growth Conference Room', tag: 'Office' },
      { id: 'g3', url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=600&auto=format&fit=crop', caption: 'Sandeep presenting GTM strategies at ISB alumni panel', tag: 'Team' },
      { id: 'g4', url: 'https://images.unsplash.com/photo-1453728286471-6936c2dbb9a7?q=80&w=600&auto=format&fit=crop', caption: 'Business Strategy Framework Certifications', tag: 'Certificates' }
    ],
    testimonials: [
      { id: 'ts1', customerName: 'Kabir Nayyar (CEO, AgriTech)', rating: 5, reviewText: 'Sandeep helped us re-structure our SaaS enterprise pricing. Within 6 months, our Average Contract Value grew by 80% with the same marketing spend. Brilliant advisor!', date: 'May 2026' },
      { id: 'ts2', customerName: 'Rohan Deshmukh (Founder, FinCorp)', rating: 5, reviewText: 'His guidance during our Series A preparation was invaluable. The pitchdeck adjustments and valuation models he designed helped us close our funding cycle smoothly.', date: 'April 2026' }
    ],
    faqs: [
      { id: 'f1', question: 'How do you engage with startups?', answer: 'We offer fixed 4-week diagnostic sprints to identify strategy bottlenecks, or engage via long-term monthly retainers with equity advisory components.' },
      { id: 'f2', question: 'What industry verticals do you specialize in?', answer: 'We specialize in B2B SaaS, tech-enabled service marketplaces, corporate financial advisory, and consumer D2C brands.' }
    ],
    contact: {
      address: 'Level 8, Platina Building, Bandra Kurla Complex (BKC), Bandra East, Mumbai - 400051',
      phone: '+91 99200 11223',
      email: 'advisory@vantagegrowth.in',
      website: 'www.vantagegrowth.in',
      workingHours: [
        { day: 'Monday - Friday', hours: '9:00 AM - 6:00 PM' },
        { day: 'Saturday', hours: '10:00 AM - 2:00 PM' },
        { day: 'Sunday', hours: 'Closed' }
      ],
      mapPlaceholder: 'Platina Building, Bandra Kurla Complex (BKC)'
    },
    cta: {
      title: 'Unlock Your Company\'s Operational and Revenue Growth',
      description: 'Book a strategy alignment call with Sandeep Sen to evaluate current GTM strategies, pipeline volumes, and scaling budgets.',
      buttonText: 'Book Strategy Alignment Call'
    }
  }
};
