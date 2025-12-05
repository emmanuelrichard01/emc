import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import {
  Briefcase,
  Calendar,
  MapPin,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Building2,
  Trophy,
  Users,
  Code2,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/* -------------------------------------------------------------------------- */
/* TYPES & DATA                                                               */
/* -------------------------------------------------------------------------- */

interface Achievement {
  id: string;
  description: string;
  impact?: string;
  metric?: string;
}

interface ExperienceItem {
  id: string;
  title: string;
  company: string;
  companyUrl?: string;
  location: string;
  duration: string;
  startDate: string;
  endDate: string;
  type: string;
  description: string;
  technologies: string[];
  achievements: Achievement[];
  teamSize?: number;
  // Key Metrics to display on the card face (Impact-First)
  keyMetrics: { label: string; value: string }[];
}

const EXPERIENCE_DATA: ExperienceItem[] = [
  {
    id: 'techcorp-senior',
    title: 'Senior Software Engineer',
    company: 'TechCorp Solutions',
    companyUrl: 'https://techcorp.com',
    location: 'San Francisco, CA (Remote)',
    duration: '2022 - Present',
    startDate: '2022',
    endDate: 'Present',
    type: 'Full-time',
    description: 'Spearheading the migration of legacy monoliths to cloud-native microservices. Leading a team of 12 engineers to deliver high-availability enterprise solutions.',
    technologies: ['React', 'TypeScript', 'Node.js', 'AWS', 'Kubernetes', 'PostgreSQL'],
    teamSize: 12,
    keyMetrics: [
      { label: 'Uptime', value: '99.99%' },
      { label: 'Deploy Time', value: '-80%' },
      { label: 'Team Growth', value: '+4 Eng' }
    ],
    achievements: [
      { id: '1', description: 'Architected and delivered 3 major client projects with zero downtime during migration.' },
      { id: '2', description: 'Reduced deployment time from 45mins to 8mins through CI/CD pipeline optimization.' },
      { id: '3', description: 'Mentored 4 junior developers to senior roles within 18 months.' }
    ]
  },
  {
    id: 'datainsights-engineer',
    title: 'Data Engineer',
    company: 'DataInsights Inc.',
    companyUrl: 'https://datainsights.com',
    location: 'New York, NY',
    duration: '2020 - 2022',
    startDate: '2020',
    endDate: '2022',
    type: 'Full-time',
    description: 'Designed and maintained PB-scale data pipelines. Enabled real-time business intelligence by replacing batch processing with stream processing.',
    technologies: ['Python', 'Apache Kafka', 'Spark', 'Airflow', 'Snowflake'],
    teamSize: 8,
    keyMetrics: [
      { label: 'Daily Data', value: '10TB+' },
      { label: 'Latency', value: '-300%' },
      { label: 'Cost', value: '-25%' }
    ],
    achievements: [
      { id: '1', description: 'Built real-time fraud detection pipeline processing 50k events/sec.' },
      { id: '2', description: 'Optimized Spark jobs reducing infrastructure costs by 25% monthly.' },
      { id: '3', description: 'Implemented automated data quality checks reducing downstream errors by 95%.' }
    ]
  },
  {
    id: 'startupxyz-fullstack',
    title: 'Full-Stack Developer',
    company: 'StartupXYZ',
    companyUrl: 'https://startupxyz.com',
    location: 'Austin, TX',
    duration: '2019 - 2020',
    startDate: '2019',
    endDate: '2020',
    type: 'Full-time',
    description: 'Early-stage engineer responsible for building the MVP and scaling the initial product to 10,000 active users.',
    technologies: ['Vue.js', 'Django', 'PostgreSQL', 'Redis', 'Docker'],
    teamSize: 5,
    keyMetrics: [
      { label: 'Users', value: '0 → 10k' },
      { label: 'Revenue', value: '$2M ARR' },
      { label: 'Load Time', value: '0.8s' }
    ],
    achievements: [
      { id: '1', description: 'Developed and launched core payment processing features generating $2M ARR.' },
      { id: '2', description: 'Reduced page load times by 60% through code splitting and caching strategies.' },
      { id: '3', description: 'Collaborated directly with founders to define product roadmap and technical architecture.' }
    ]
  }
];

/* -------------------------------------------------------------------------- */
/* SUB-COMPONENTS                                                             */
/* -------------------------------------------------------------------------- */

// 1. Company Logo Placeholder (Generates a consistent color/initial based on name)
const CompanyLogo = ({ name }: { name: string }) => {
  const initial = name.charAt(0);
  // Simple hash for consistent colors
  const colors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'
  ];
  const colorIndex = name.length % colors.length;
  const color = colors[colorIndex];

  return (
    <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-white font-bold text-xl shadow-lg ring-4 ring-background`}>
      {initial}
    </div>
  );
};

// 2. Experience Card
const ExperienceCard = ({
  item,
  index,
  isExpanded,
  onToggle
}: {
  item: ExperienceItem;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  return (
    <div className="relative pl-8 md:pl-0">
      {/* Timeline Node (Desktop: Center, Mobile: Left) */}
      <div className="absolute left-[-9px] md:left-1/2 md:-ml-[9px] top-0 z-20">
        <motion.div
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ margin: "-20%" }}
          className="w-[18px] h-[18px] rounded-full bg-primary border-4 border-background shadow-md"
        />
      </div>

      {/* Card Content Layout */}
      <div className={`md:flex items-start justify-between ${index % 2 === 0 ? 'md:flex-row-reverse' : ''} group`}>

        {/* Spacer for Timeline Alignment */}
        <div className="hidden md:block md:w-1/2" />

        {/* The Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ margin: "-10%" }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          className={`md:w-[calc(50%-2rem)] relative bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-300 ${index % 2 === 0 ? 'md:mr-auto' : 'md:ml-auto'
            }`}
        >
          {/* Header Section */}
          <div className="flex items-start gap-4 mb-4">
            <div className="hidden sm:block">
              <CompanyLogo name={item.company} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                {item.title}
              </h3>
              <div className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground mt-1">
                <span className="font-medium text-foreground">{item.company}</span>
                <span>•</span>
                <span>{item.type}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                <Calendar className="w-3 h-3" />
                <span>{item.duration}</span>
                <span className="hidden sm:inline">•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {item.location}
                </span>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid (Impact First) */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {item.keyMetrics.map((metric, idx) => (
              <div key={idx} className="bg-secondary/30 rounded-lg p-2 text-center border border-border/50">
                <div className="text-sm font-bold text-primary">{metric.value}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{metric.label}</div>
              </div>
            ))}
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            {item.description}
          </p>

          {/* Tech Stack */}
          <div className="flex flex-wrap gap-2 mb-4">
            {item.technologies.slice(0, 5).map((tech) => (
              <span key={tech} className="px-2 py-1 text-xs font-medium rounded-md bg-muted text-muted-foreground border border-border/50">
                {tech}
              </span>
            ))}
          </div>

          {/* Expandable Details */}
          <div className="border-t border-border/50 pt-3">
            <button
              onClick={onToggle}
              className="flex items-center gap-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors w-full justify-center sm:justify-start"
            >
              {isExpanded ? (
                <>Hide Achievements <ChevronUp className="w-3 h-3" /></>
              ) : (
                <>View Achievements <ChevronDown className="w-3 h-3" /></>
              )}
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <ul className="space-y-3 pt-4">
                    {item.achievements.map((ach) => (
                      <li key={ach.id} className="flex gap-3 text-sm text-muted-foreground">
                        <div className="mt-1.5 min-w-[6px] h-1.5 rounded-full bg-primary/60" />
                        <span>{ach.description}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                             */
/* -------------------------------------------------------------------------- */

const Experience = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll progress for the timeline line
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const scaleY = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <section id="experience" className="py-24 bg-background relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/3 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20 space-y-4"
        >
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Professional <span className="text-primary">Journey</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            A timeline of building scalable systems, leading engineering teams, and solving complex problems.
          </p>
        </motion.div>

        {/* Timeline Container */}
        <div ref={containerRef} className="relative">

          {/* The Vertical Line (The Spine) */}
          <div className="absolute left-[0px] md:left-1/2 top-0 bottom-0 w-[2px] bg-border/50">
            <motion.div
              style={{ scaleY, transformOrigin: "top" }}
              className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-primary via-primary-500 to-transparent"
            />
          </div>

          {/* Experience Items */}
          <div className="space-y-12 sm:space-y-24">
            {EXPERIENCE_DATA.map((item, index) => (
              <ExperienceCard
                key={item.id}
                item={item}
                index={index}
                isExpanded={expandedId === item.id}
                onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
              />
            ))}
          </div>

          {/* End Cap */}
          <div className="absolute left-[-4px] md:left-1/2 md:-ml-[4px] bottom-0 w-[10px] h-[10px] rounded-full bg-border" />
        </div>

        {/* Resume Download CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-20 text-center"
        >
          <Button variant="outline" size="lg" className="group rounded-full px-8 border-primary/20 hover:border-primary/50 hover:bg-primary/5">
            <ExternalLink className="mr-2 w-4 h-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
            Download Full Resume
          </Button>
        </motion.div>

      </div>
    </section>
  );
};

export default Experience;