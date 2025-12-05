import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  MapPin,
  Phone,
  Send,
  Github,
  Linkedin,
  Check,
  Copy,
  ArrowRight,
  Loader2,
  Instagram,
  Twitter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

/* -------------------------------------------------------------------------- */
/* UTILS                                                                      */
/* -------------------------------------------------------------------------- */

const SOCIAL_LINKS = [
  {
    name: 'GitHub',
    icon: Github,
    href: 'https://github.com/emmanuelrichard01',
    color: 'hover:text-neutral-900 dark:hover:text-white'
  },
  {
    name: 'LinkedIn',
    icon: Linkedin,
    href: 'https://www.linkedin.com/in/e-mc/',
    color: 'hover:text-[#0077b5]'
  },
  {
    name: 'X (Twitter)',
    icon: Twitter,
    href: 'https://x.com/_mrebuka',
    color: 'hover:text-neutral-900 dark:hover:text-white'
  },
  {
    name: 'Instagram',
    icon: Instagram,
    href: 'https://www.instagram.com/officialemmanuelrichard/',
    color: 'hover:text-[#E1306C]'
  }
];

const CONTACT_INFO = [
  {
    icon: Mail,
    label: 'Email',
    value: 'emma.moghalu@gmail.com',
    action: 'mailto:emma.moghalu@gmail.com',
    copyable: true
  },
  {
    icon: Phone,
    label: 'Phone',
    value: '+234 708 649 3145',
    action: 'tel:+2347086493145',
    copyable: true
  },
  {
    icon: MapPin,
    label: 'Location',
    value: 'Abuja, Nigeria (Remote)',
    action: null,
    copyable: false
  }
];

/* -------------------------------------------------------------------------- */
/* SUB-COMPONENTS                                                             */
/* -------------------------------------------------------------------------- */

// 1. Border Beam Animation (FAANG-Level Polish)
const BorderBeam = ({ duration = 8, borderWidth = 1.5 }: { duration?: number, borderWidth?: number }) => (
  <div className="absolute inset-0 pointer-events-none rounded-[inherit] z-0 overflow-hidden">
    <div
      className="absolute inset-0 rounded-[inherit]"
      style={{
        padding: borderWidth,
        // Mask the center to show only the border area
        mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        maskComposite: 'exclude',
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
      }}
    >
      {/* The rotating gradient beam */}
      <div
        className="absolute inset-[-100%] w-auto h-auto bg-[conic-gradient(from_0deg,transparent_0_300deg,theme(colors.primary.DEFAULT)_360deg)] animate-[spin_var(--duration)_linear_infinite] opacity-100"
        style={{ '--duration': `${duration}s` } as React.CSSProperties}
      />
    </div>
  </div>
);

// 2. Copyable Contact Item
const ContactItem = ({ item }: { item: typeof CONTACT_INFO[0] }) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!item.copyable) return;

    navigator.clipboard.writeText(item.value);
    setCopied(true);
    toast({
      title: "Copied to clipboard",
      description: `${item.label} has been copied.`,
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const Wrapper = item.action ? 'a' : 'div';

  return (
    <Wrapper
      href={item.action || undefined}
      className="group flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 hover:border-primary/20 transition-all duration-300"
    >
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center border border-border shadow-sm group-hover:scale-110 transition-transform">
          <item.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{item.label}</p>
          <p className="text-sm font-semibold text-foreground">{item.value}</p>
        </div>
      </div>

      {item.copyable && (
        <button
          onClick={handleCopy}
          className="p-2 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
          aria-label={`Copy ${item.label}`}
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      )}
    </Wrapper>
  );
};

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                             */
/* -------------------------------------------------------------------------- */

const Contact = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate network request
    await new Promise(resolve => setTimeout(resolve, 1500));

    toast({
      title: "Message sent!",
      description: "Thanks for reaching out. I'll get back to you within 24 hours.",
    });

    if (formRef.current) formRef.current.reset();
    setIsSubmitting(false);
  };

  return (
    <section id="contact" className="py-24 bg-background relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
        <div className="absolute top-[20%] left-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16 space-y-4"
        >
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Let's Build Something <span className="text-primary">Great</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Have a project in mind or just want to chat? I'm currently available for freelance work and open to new opportunities.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-24">

          {/* Left Column: Info & Socials */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="space-y-8"
          >
            <div className="space-y-6">
              <h3 className="text-2xl font-bold">Contact Details</h3>
              <div className="space-y-4">
                {CONTACT_INFO.map((item) => (
                  <ContactItem key={item.label} item={item} />
                ))}
              </div>
            </div>

            <div className="space-y-6 pt-8">
              <h3 className="text-2xl font-bold">Connect on Social</h3>
              <div className="flex flex-wrap gap-4">
                {SOCIAL_LINKS.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-4 rounded-xl bg-muted/30 border border-border/50 text-muted-foreground transition-all duration-300 hover:scale-105 hover:bg-muted/50 hover:border-primary/20 ${link.color}`}
                    aria-label={link.name}
                  >
                    <link.icon className="h-6 w-6" />
                  </a>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right Column: Interactive Form with Border Beam */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="relative bg-card rounded-3xl p-6 sm:p-8 shadow-2xl shadow-primary/5 overflow-hidden border border-border/50"
          >
            {/* The Animation Layer */}
            <BorderBeam duration={8} borderWidth={1} />

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-6 relative z-10">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    required
                    className="bg-muted/50 border-border/50 focus:bg-background h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    required
                    className="bg-muted/50 border-border/50 focus:bg-background h-12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject" className="text-sm font-medium">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Project inquiry"
                  required
                  className="bg-muted/50 border-border/50 focus:bg-background h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-sm font-medium">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Tell me about your project..."
                  required
                  className="bg-muted/50 border-border/50 focus:bg-background min-h-[150px] resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 text-base font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 shadow-lg shadow-primary/25"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Send Message
                    <Send className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default Contact;