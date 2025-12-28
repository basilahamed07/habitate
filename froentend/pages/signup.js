import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { postJson, setAuthToken } from "../lib/api";
import styles from "../styles/Login.module.css";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignup = async (event) => {
    event.preventDefault();
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    if (!trimmedName || !trimmedEmail || !trimmedPassword || isSubmitting) {
      setError("All fields are required.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    const result = await postJson("/auth/signup", {
      full_name: trimmedName,
      email: trimmedEmail,
      password: trimmedPassword
    });
    if (result?.access_token) {
      setAuthToken(result.access_token);
      router.push("/dashboard");
      return;
    }
    setError("Unable to create account.");
    setIsSubmitting(false);
  };

  return (
    <main className={`page ${styles.loginPage}`}>
      <Head>
        <title>Habit Tracker | Sign Up</title>
        <meta
          name="description"
          content="Create an account to begin your calm habit tracking journey."
        />
      </Head>

      <div className={styles.container}>
        <header className={styles.header}>
          <Link href="/dashboard" className={styles.logoRow}>
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
          </Link>
          <nav className={styles.nav}>
            <Link href="/">Home</Link>
            <Link href="/login">Log In</Link>
            <Link href="/signup" className={styles.signupButton}>
              Sign Up
            </Link>
          </nav>
        </header>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h1 className={styles.title}>Create an Account</h1>
            <p className={styles.subtitle}>Start building steady, supportive routines today.</p>
          </div>
          <form className={styles.form} onSubmit={handleSignup}>
            <input
              className={styles.input}
              placeholder="Full name"
              aria-label="Full name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
            <input
              className={styles.input}
              placeholder="Email"
              aria-label="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <input
              className={styles.input}
              placeholder="Password"
              type="password"
              aria-label="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {error ? <div className={styles.formError}>{error}</div> : null}
            <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Sign Up"}
            </button>
          </form>
          <div className={styles.helper}>
            Already have an account? <Link href="/login">Log In</Link>
          </div>
          <div className={styles.footerNote}>
            Copyright 2024 Habit Tracker App. All rights reserved.
          </div>
        </section>
      </div>

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
