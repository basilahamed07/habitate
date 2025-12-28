import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import styles from "../styles/Landing.module.css";

export default function LandingPage() {
  const rootRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray("[data-animate]");
      gsap.from(items, {
        opacity: 0,
        y: 24,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.12
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <main className={`page ${styles.landing}`} ref={rootRef}>
      <Head>
        <title>Habit Tracker | Landing</title>
        <meta
          name="description"
          content="A calm habit tracker that turns daily routines into steady progress."
        />
      </Head>

      <div className={styles.container}>
        <header className={styles.header} data-animate>
          <div className={styles.logoRow}>
            <span className={styles.logoIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                <path
                  d="M6.5 12.5C9 9 12.5 7.5 17.5 7.5C17 13 13 17 8.5 17C7 17 6 15.7 6 14.2C6 13.5 6.2 13 6.5 12.5Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 15C10.5 13 12.5 11.5 15.5 10.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span className={styles.logoText}>Habitat</span>
          </div>
        </header>

        <section className={styles.hero}>
          <span className={styles.badge} data-animate>
            Cultivate better habits, naturally
          </span>
          <h1 className={styles.title} data-animate>
            Grow Your Best Self, One <span>Habit</span> at a Time
          </h1>
          <p className={styles.subtitle} data-animate>
            Habitat is your personal habit companion. Track your daily routines, visualize your
            progress, and watch your productivity flourish with a calm, minimal experience.
          </p>
          <div className={styles.actions} data-animate>
            <Link href="/signup" className={styles.primaryButton}>
              Get Started Free
            </Link>
            <Link href="/login" className={styles.secondaryButton}>
              Log In
            </Link>
          </div>
        </section>

        <section id="features" className={styles.features}>
          {[
            {
              title: "Track Your Habits",
              copy: "Build lasting routines with our intuitive habit tracking system."
            },
            {
              title: "Visualize Progress",
              copy: "Beautiful charts and calm insights keep you motivated."
            },
            {
              title: "Stay Accountable",
              copy: "Daily check-ins and gentle streaks help maintain momentum."
            }
          ].map((feature) => (
            <article key={feature.title} className={styles.featureCard} data-animate>
              <div className={styles.featureIcon} aria-hidden="true" />
              <h3>{feature.title}</h3>
              <p>{feature.copy}</p>
            </article>
          ))}
        </section>

        <section id="about" className={styles.about} data-animate>
          <h2>Designed for calm focus</h2>
          <p>
            Habitat blends soft gradients, soothing greens, and gentle spacing so you can focus on
            showing up every day. It is minimal, breathable, and built to keep your attention on
            what matters most.
          </p>
        </section>

        <footer className={styles.footer}>
          <span>Copyright 2024 Habit Tracker App</span>
          <span>Designed for calm, steady growth.</span>
        </footer>
      </div>

      <div className={styles.gradientOrb} aria-hidden="true" />
      <div className={styles.gradientOrbAlt} aria-hidden="true" />
      <Image
        className={styles.botanical}
        src="/botanicals/leaf.svg"
        alt="Decorative botanical leaf"
        width={140}
        height={140}
        priority
      />
    </main>
  );
}

export async function getStaticProps() {
  return {
    props: {}
  };
}
